mod boosters;
mod constants;
mod edge_cases;
mod kpm;
mod loot;
mod prapa;
mod types;

use std::collections::HashMap;

use wasm_bindgen::prelude::*;

use boosters::calculate_boosters;
use edge_cases::descendia::{descendia_survivability_warning, synergy_multiplier, vinquibus_warning};
use edge_cases::hollvania::hollvania_yield_bonus;
use edge_cases::omnia::apply_omnia_cost_multiplier;
use kpm::calculate_kpm;
use loot::calculate_m_loot;
use prapa::{calculate_prapa_cost, skill_allows_tier};
use types::{
    ArsenalState, DropSource, ItemIndex, MatchedItem, NodeLevelsFile, NodeMeta, Objective,
    RankedNode,
};

static mut ITEM_INDEX: Option<ItemIndex> = None;
static mut NODE_LEVELS: Option<NodeLevelsFile> = None;

fn item_index() -> &'static ItemIndex {
    unsafe { ITEM_INDEX.as_ref().expect("Engine not initialized") }
}

fn node_levels() -> &'static NodeLevelsFile {
    unsafe { NODE_LEVELS.as_ref().expect("Engine not initialized") }
}

#[wasm_bindgen(start)]
pub fn main() {}

#[wasm_bindgen]
pub fn init_engine(item_index_json: &str, node_levels_json: &str) -> Result<(), JsValue> {
    let index: ItemIndex = serde_json::from_str(item_index_json)
        .map_err(|e| JsValue::from_str(&format!("item index parse error: {e}")))?;
    let nodes: NodeLevelsFile = serde_json::from_str(node_levels_json)
        .map_err(|e| JsValue::from_str(&format!("node levels parse error: {e}")))?;
    unsafe {
        ITEM_INDEX = Some(index);
        NODE_LEVELS = Some(nodes);
    }
    Ok(())
}

#[wasm_bindgen]
pub fn compute_ranked_nodes(
    objectives_json: &str,
    skill: f64,
    arsenal_json: &str,
    timestamp_ms: f64,
) -> String {
    let objectives: Vec<Objective> = serde_json::from_str(objectives_json).unwrap_or_default();
    let arsenal: ArsenalState = serde_json::from_str(arsenal_json).unwrap_or_default();

    if objectives.is_empty() {
        return "[]".to_string();
    }

    let index = item_index();
    let nodes = node_levels();
    let m_loot = calculate_m_loot(&arsenal) as f64;
    let kpm = calculate_kpm(skill as f32, &arsenal) as f64;
    let boosters = calculate_boosters(&arsenal) as f64;

    let objective_has_eximus = objectives.iter().any(|o| {
        index
            .items
            .get(&o.item_name)
            .map(|sources| sources.iter().any(|s| s.tags.contains(&"eximus-loot".to_string())))
            .unwrap_or(false)
            || o.item_name.contains("Riven")
    });

    let objective_has_prime = objectives.iter().any(|o| {
        index
            .items
            .get(&o.item_name)
            .map(|sources| {
                sources
                    .iter()
                    .any(|s| s.tags.contains(&"prime-component".to_string()))
            })
            .unwrap_or(false)
            || o.item_name.contains("Prime")
    });

    let objective_has_descendia = objectives.iter().any(|o| {
        index
            .items
            .get(&o.item_name)
            .map(|sources| {
                sources
                    .iter()
                    .any(|s| s.tags.contains(&"descendia-exclusive".to_string()))
            })
            .unwrap_or(false)
    });

    let mut node_matches: HashMap<String, Vec<(Objective, DropSource)>> = HashMap::new();

    for objective in &objectives {
        if let Some(sources) = index.items.get(&objective.item_name) {
            for source in sources {
                node_matches
                    .entry(source.location_id.clone())
                    .or_default()
                    .push((objective.clone(), source.clone()));
            }
        }
    }

    let mut ranked: Vec<RankedNode> = Vec::new();

    for (location_id, matches) in node_matches {
        let meta: NodeMeta = nodes.nodes.get(&location_id).cloned().unwrap_or(NodeMeta {
            location_id: location_id.clone(),
            planet: "Unknown".to_string(),
            node_name: location_id.clone(),
            game_mode: matches[0].1.game_mode.clone(),
            min_enemy_level: 1.0,
            max_enemy_level: 30.0,
            m_node: 1.0,
            skill_tier: "baseline".to_string(),
            tags: vec![],
        });

        if !skill_allows_tier(skill, &meta.skill_tier) {
            continue;
        }

        let unique_items: std::collections::HashSet<String> = matches
            .iter()
            .map(|(o, _)| o.item_name.clone())
            .collect();
        let match_count = unique_items.len();

        let has_descendia_item = matches.iter().any(|(_, s)| {
            s.tags.contains(&"descendia-exclusive".to_string())
        }) || objective_has_descendia;

        let s_m = synergy_multiplier(match_count, has_descendia_item) as f32;

        let mut matched_items: Vec<MatchedItem> = Vec::new();
        let mut base_drop_sum = 0.0_f32;

        for (objective, source) in &matches {
            let p_base = (source.tadr / 100.0) as f32;
            let y_item = calculate_kpm(skill as f32, &arsenal)
                * p_base
                * meta.m_node as f32
                * m_loot as f32
                * boosters as f32;

            base_drop_sum += p_base;
            matched_items.push(MatchedItem {
                item_name: objective.item_name.clone(),
                tadr: source.tadr,
                target_quantity: objective.target_quantity,
                y_item: y_item as f64,
            });
        }

        let node_level = meta.max_enemy_level as f32;
        let (mut cost, projected_yield, friction) = calculate_prapa_cost(
            base_drop_sum,
            node_level,
            meta.m_node as f32,
            m_loot as f32,
            s_m,
            skill as f32,
            &arsenal,
        );

        let hollvania_bonus = hollvania_yield_bonus(
            timestamp_ms,
            meta.tags.contains(&"hollvania".to_string()),
            objective_has_eximus,
        );
        let projected_yield_adj = projected_yield as f64 + hollvania_bonus as f64;
        if hollvania_bonus > 0.0 && projected_yield_adj > 0.0 {
            cost = (1.0 / (projected_yield_adj as f32 * s_m)) * friction;
        }

        cost = apply_omnia_cost_multiplier(
            cost as f64,
            skill,
            meta.tags.contains(&"omnia-cascade".to_string()),
            objective_has_prime,
        ) as f32;

        let mut warnings: Vec<String> = Vec::new();
        let friction_applied = friction > 1.0;
        if friction_applied {
            warnings.push("Above your skill comfort zone".to_string());
        }
        if let Some(w) = descendia_survivability_warning(skill, meta.tags.contains(&"descendia".to_string())) {
            warnings.push(w.to_string());
        }
        if let Some(w) = vinquibus_warning(arsenal.has_vinquibus, has_descendia_item) {
            warnings.push(w.to_string());
        }

        ranked.push(RankedNode {
            location_id,
            game_mode: meta.game_mode,
            cost: cost as f64,
            efficiency: if cost > 0.0 { 1.0 / cost as f64 } else { 0.0 },
            projected_yield: projected_yield_adj,
            synergy_multiplier: s_m as f64,
            friction_penalty: friction as f64,
            kpm,
            matched_items,
            warnings,
            friction_applied,
            max_enemy_level: meta.max_enemy_level,
        });
    }

    ranked.sort_by(|a, b| a.cost.partial_cmp(&b.cost).unwrap_or(std::cmp::Ordering::Equal));

    serde_json::to_string(&ranked).unwrap_or_else(|_| "[]".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use types::ItemIndex;

    #[test]
    fn parses_item_index_json_shape() {
        let json = r#"{"items":{"Vitality":[{"locationId":"Mercury - Lares","dropType":"MissionReward","gameMode":"Survival","rotation":"A","baseChance":10.0,"tadr":2.0}]},"itemNames":["Vitality"]}"#;
        let index: ItemIndex = serde_json::from_str(json).expect("item index should parse");
        assert_eq!(index.item_names, vec!["Vitality"]);
        assert!(index.items.contains_key("Vitality"));
    }
}
