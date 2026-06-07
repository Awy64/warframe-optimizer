mod boosters;
mod constants;
mod deserialize;
mod drop_type;
mod edge_cases;
mod kpm;
mod loot;
mod prapa;
mod types;

use std::collections::{HashMap, HashSet};

use wasm_bindgen::prelude::*;

use edge_cases::access::{blocked_by_zariman, is_source_accessible};
use edge_cases::async_gate::{async_night_cycle_warning, ASYNC_NIGHT_WARNING};
use edge_cases::descendia::{descendia_survivability_warning, vinquibus_warning};
use edge_cases::hollvania::hollvania_yield_bonus;
use edge_cases::omnia::apply_omnia_cost_multiplier;
use drop_type::DropType;
use kpm::{calculate_kpm, reference_horde_kpm};
use loot::calculate_m_loot;
use prapa::{calculate_etc_cost, calculate_item_yield, skill_allows_tier, is_standard_mission_mode};
use types::{
    ArsenalState, DropSource, ItemIndex, MatchedItem, NodeLevelsFile, NodeMeta, Objective,
    PrapaEngineResult, RankedNode,
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

fn item_has_eximus_tag(sources: &[DropSource]) -> bool {
    sources
        .iter()
        .any(|s| s.tags.contains(&"eximus-loot".to_string()))
}

fn resolve_node_meta(location_id: &str, fallback_game_mode: &str, nodes: &NodeLevelsFile) -> NodeMeta {
    nodes.nodes.get(location_id).cloned().unwrap_or(NodeMeta {
        location_id: location_id.to_string(),
        planet: "Unknown".to_string(),
        node_name: location_id.to_string(),
        game_mode: fallback_game_mode.to_string(),
        min_enemy_level: 1.0,
        max_enemy_level: 30.0,
        m_node: 1.0,
        skill_tier: "baseline".to_string(),
        tags: vec![],
    })
}

fn detect_pathing_failures(
    objectives: &[Objective],
    index: &ItemIndex,
    nodes: &NodeLevelsFile,
    arsenal: &ArsenalState,
    global_max: &HashMap<String, f32>,
) -> Vec<String> {
    let mut failures = Vec::new();

    for objective in objectives {
        let max_y = global_max.get(&objective.item_name).copied().unwrap_or(0.0);
        if max_y > 0.0 {
            continue;
        }

        let Some(sources) = index.items.get(&objective.item_name) else {
            continue;
        };

        let mut any_accessible = false;
        let mut zariman_blocked = false;

        for source in sources {
            let meta = resolve_node_meta(&source.location_id, &source.game_mode, nodes);
            if is_source_accessible(source, &meta, arsenal, &objective.item_name) {
                any_accessible = true;
                break;
            }
            if blocked_by_zariman(source, &meta) {
                zariman_blocked = true;
            }
        }

        if !any_accessible && zariman_blocked {
            failures.push(
                "Pathing Failed: Target requires completion of 'Angels of the Zariman' quest."
                    .to_string(),
            );
        }
    }

    failures
}

fn sum_item_yield_at_location(
    sources: &[DropSource],
    location_id: &str,
    meta: &NodeMeta,
    m_loot: f32,
    skill: f32,
    arsenal: &ArsenalState,
    objective_has_eximus: bool,
    timestamp_ms: f64,
) -> f32 {
    let mut y = 0.0_f32;
    for source in sources {
        if source.location_id != location_id {
            continue;
        }
        y += calculate_item_yield(
            source,
            meta.m_node as f32,
            m_loot,
            skill,
            arsenal,
        );
    }

    if y > 0.0 {
        y += hollvania_yield_bonus(
            timestamp_ms,
            meta.tags.contains(&"hollvania".to_string()),
            objective_has_eximus && item_has_eximus_tag(sources),
        );
    }

    y
}

/// Pass 1: fastest isolated yield per cart item across all indexed nodes.
fn compute_global_max_yields(
    objectives: &[Objective],
    index: &ItemIndex,
    nodes: &NodeLevelsFile,
    skill: f64,
    m_loot: f32,
    arsenal: &ArsenalState,
    objective_has_eximus: bool,
    timestamp_ms: f64,
) -> HashMap<String, f32> {
    let mut global_max = HashMap::new();

    for objective in objectives {
        let Some(sources) = index.items.get(&objective.item_name) else {
            global_max.insert(objective.item_name.clone(), 0.0);
            continue;
        };

        let mut by_location: HashMap<String, Vec<&DropSource>> = HashMap::new();
        for source in sources {
            by_location
                .entry(source.location_id.clone())
                .or_default()
                .push(source);
        }

        let mut best = 0.0_f32;
        for (location_id, loc_sources) in by_location {
            let meta = resolve_node_meta(&location_id, &loc_sources[0].game_mode, nodes);

            if !skill_allows_tier(skill, &meta.skill_tier) {
                continue;
            }

            let owned: Vec<DropSource> = loc_sources
                .into_iter()
                .filter(|s| is_source_accessible(s, &meta, arsenal, &objective.item_name))
                .cloned()
                .collect();
            if owned.is_empty() {
                continue;
            }
            let y = sum_item_yield_at_location(
                &owned,
                &location_id,
                &meta,
                m_loot,
                skill as f32,
                arsenal,
                objective_has_eximus,
                timestamp_ms,
            );
            best = best.max(y);
        }

        global_max.insert(objective.item_name.clone(), best);
    }

    global_max
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
    let m_loot = calculate_m_loot(&arsenal) as f32;

    let objective_has_eximus = objectives.iter().any(|o| {
        index
            .items
            .get(&o.item_name)
            .map(|sources| item_has_eximus_tag(sources))
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

    let global_max_yields = compute_global_max_yields(
        &objectives,
        index,
        nodes,
        skill,
        m_loot,
        &arsenal,
        objective_has_eximus,
        timestamp_ms,
    );

    let mut node_matches: HashMap<String, Vec<(Objective, DropSource)>> = HashMap::new();

    for objective in &objectives {
        if let Some(sources) = index.items.get(&objective.item_name) {
            for source in sources {
                let meta = resolve_node_meta(&source.location_id, &source.game_mode, nodes);
                if !is_source_accessible(source, &meta, &arsenal, &objective.item_name) {
                    continue;
                }
                node_matches
                    .entry(source.location_id.clone())
                    .or_default()
                    .push((objective.clone(), source.clone()));
            }
        }
    }

    if arsenal.steel_path_active {
        if let Some(se_objective) = objectives.iter().find(|o| o.item_name == "Steel Essence") {
            if let Some(sources) = index.items.get("Steel Essence") {
                if !sources.is_empty() {
                    let template = &sources[0];
                    let mut extra_matches = Vec::new();
                    for (location_id, _) in &node_matches {
                        if !location_id.starts_with("Enemy -") {
                            let meta = resolve_node_meta(location_id, &template.game_mode, nodes);
                            if is_standard_mission_mode(&meta.game_mode) {
                                let mut source = template.clone();
                                source.location_id = location_id.clone();
                                extra_matches.push((location_id.clone(), se_objective.clone(), source));
                            }
                        }
                    }
                    for (loc_id, obj, src) in extra_matches {
                        node_matches.entry(loc_id).or_default().push((obj, src));
                    }
                }
            }
        }
    }

    let pathing_failures = detect_pathing_failures(
        &objectives,
        index,
        nodes,
        &arsenal,
        &global_max_yields,
    );

    let mut ranked: Vec<RankedNode> = Vec::new();

    for (location_id, matches) in node_matches {
        let meta = resolve_node_meta(&location_id, &matches[0].1.game_mode, nodes);

        if !skill_allows_tier(skill, &meta.skill_tier) {
            continue;
        }

        let has_descendia_item = matches.iter().any(|(_, s)| {
            s.tags.contains(&"descendia-exclusive".to_string())
        }) || objective_has_descendia;

        let mut matched_items: Vec<MatchedItem> = Vec::new();
        let mut seen_sources: HashSet<String> = HashSet::new();
        let mut yields_at_node: HashMap<String, f32> = HashMap::new();
        let mut gate_times_at_node: HashMap<String, f32> = HashMap::new();

        for (objective, source) in &matches {
            let dedupe_key = format!(
                "{}|{:?}|{}|{}",
                objective.item_name, source.drop_type, source.rotation, source.base_chance
            );
            if !seen_sources.insert(dedupe_key) {
                continue;
            }

            let y_item = calculate_item_yield(
                source,
                meta.m_node as f32,
                m_loot,
                skill as f32,
                &arsenal,
            );

            *yields_at_node.entry(objective.item_name.clone()).or_insert(0.0) += y_item;

            // Calculate rotation gate/minimum run time for this source
            if source.drop_type != DropType::MapContainer {
                let is_search = source.tags.iter().any(|t| t == "search-resource");
                let has_caches = source.tags.iter().any(|t| t == "caches");
                let gate_time = crate::prapa::calculate_min_run_time(
                    &source.game_mode,
                    &source.rotation,
                    skill as f32,
                    is_search,
                    has_caches,
                    &arsenal,
                );
                let entry = gate_times_at_node.entry(objective.item_name.clone()).or_insert(0.0);
                if gate_time > *entry {
                    *entry = gate_time;
                }
            }

            let entry_matched = matched_items
                .iter_mut()
                .find(|m| m.item_name == objective.item_name);
            if let Some(entry_matched) = entry_matched {
                entry_matched.y_item += y_item as f64;
            } else {
                matched_items.push(MatchedItem {
                    item_name: objective.item_name.clone(),
                    tadr: source.tadr,
                    target_quantity: objective.target_quantity,
                    y_item: y_item as f64,
                });
            }
        }

        if objective_has_eximus {
            let bonus = hollvania_yield_bonus(
                timestamp_ms,
                meta.tags.contains(&"hollvania".to_string()),
                true,
            );
            if bonus > 0.0 {
                for item in &mut matched_items {
                    if index
                        .items
                        .get(&item.item_name)
                        .map(|sources| item_has_eximus_tag(sources))
                        .unwrap_or(false)
                    {
                        item.y_item += bonus as f64;
                        *yields_at_node.entry(item.item_name.clone()).or_insert(0.0) += bonus;
                    }
                }
            }
        }

        let node_level = meta.max_enemy_level as f32;
        let is_endless_fissure = crate::prapa::is_endless_mode(&meta.game_mode) && objective_has_prime;
        let (etc_with_friction, friction) = calculate_etc_cost(
            &objectives,
            &yields_at_node,
            &global_max_yields,
            &gate_times_at_node,
            is_endless_fissure,
            node_level,
            skill as f32,
        );

        let cost = apply_omnia_cost_multiplier(
            etc_with_friction as f64,
            skill,
            meta.tags.contains(&"omnia-cascade".to_string()),
            objective_has_prime,
        ) as f32;

        let etc_minutes = if etc_with_friction.is_finite() && etc_with_friction < f32::MAX {
            (etc_with_friction / friction).max(0.0)
        } else {
            f32::MAX
        };

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
        if matches
            .iter()
            .any(|(_, s)| async_night_cycle_warning(&s.tags).is_some())
        {
            warnings.push(ASYNC_NIGHT_WARNING.to_string());
        }

        let node_kpm = matches
            .iter()
            .map(|(_, source)| calculate_kpm(skill as f32, &arsenal, source))
            .max_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal))
            .unwrap_or_else(|| reference_horde_kpm(skill as f32, &arsenal)) as f64;

        ranked.push(RankedNode {
            location_id,
            game_mode: meta.game_mode,
            cost: cost as f64,
            etc_minutes: etc_minutes as f64,
            friction_penalty: friction as f64,
            kpm: node_kpm,
            matched_items,
            warnings,
            friction_applied,
            max_enemy_level: meta.max_enemy_level,
        });
    }

    ranked.sort_by(|a, b| {
        a.cost.partial_cmp(&b.cost)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| a.location_id.cmp(&b.location_id))
    });

    let result = PrapaEngineResult {
        ranked_nodes: ranked,
        pathing_failures,
    };

    serde_json::to_string(&result).unwrap_or_else(|_| {
        r#"{"rankedNodes":[],"pathingFailures":[]}"#.to_string()
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use types::{DropSource, ItemIndex};

    #[test]
    fn parses_drop_source_with_null_chance_as_zero() {
        let json = r#"{"locationId":"X","dropType":"EnemyDrop","gameMode":"Enemy Drop","rotation":"A","baseChance":null,"tadr":0}"#;
        let source: DropSource = serde_json::from_str(json).expect("should coerce null to zero");
        assert_eq!(source.base_chance, 0.0);
    }

    #[test]
    fn parses_item_index_with_null_drop_chances() {
        let json = r#"{"items":{"Test Item":[{"locationId":"X","dropType":"EnemyDrop","gameMode":"Enemy Drop","rotation":"A","baseChance":null,"tadr":null}]},"itemNames":["Test Item"]}"#;
        let index: ItemIndex = serde_json::from_str(json).expect("legacy null chances should parse");
        let sources = index.items.get("Test Item").expect("item present");
        assert_eq!(sources[0].base_chance, 0.0);
        assert_eq!(sources[0].tadr, 0.0);
    }

    #[test]
    fn parses_production_item_index_when_present() {
        let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../public/item_index.json");
        if !std::path::Path::new(path).exists() {
            return;
        }
        let json = std::fs::read_to_string(path).expect("read item index");
        let index: ItemIndex = serde_json::from_str(&json).expect("production item index should parse");
        assert!(!index.item_names.is_empty());
        assert!(!index.items.is_empty());
    }
}
