use std::collections::HashMap;

use crate::boosters::{calculate_boosters, calculate_resource_booster};
use crate::constants::{
    COMFORT_LEVEL_SCALE, DEFAULT_ACOLYTE_DROP_YIELD, DEFAULT_ACOLYTE_SPAWN_MINUTES,
    FRICTION_COEFF, FRICTION_EXPONENT, INTERMEDIATE_SKILL_GATE, INTERVAL_SPAWN_TAG,
    EXPERT_SKILL_GATE,
};
use crate::kpm::calculate_kpm;
use crate::types::{ArsenalState, DropSource, Objective};

pub const UNFARMABLE_ETC: f32 = 99_999.0;

pub fn calculate_friction(skill_coeff: f32, node_level: f32) -> f32 {
    let max_comfortable = skill_coeff * COMFORT_LEVEL_SCALE;
    if node_level > max_comfortable {
        let level_diff = node_level - max_comfortable;
        1.0 + (level_diff.powf(FRICTION_EXPONENT) * FRICTION_COEFF)
    } else {
        1.0
    }
}

pub fn skill_allows_tier(skill: f64, tier: &str) -> bool {
    match tier {
        "baseline" => true,
        "intermediate" => skill > INTERMEDIATE_SKILL_GATE as f64,
        "expert" => skill > EXPERT_SKILL_GATE as f64,
        _ => true,
    }
}

/// Per-item projected yield for a single drop source at a node.
pub fn calculate_item_yield(
    source: &DropSource,
    m_node: f32,
    m_loot: f32,
    skill_coeff: f32,
    arsenal: &ArsenalState,
) -> f32 {
    if source.tags.iter().any(|t| t == INTERVAL_SPAWN_TAG) {
        let interval = source
            .spawn_interval_minutes
            .unwrap_or(DEFAULT_ACOLYTE_SPAWN_MINUTES as f64) as f32;
        let yield_per_spawn = source
            .drop_yield
            .unwrap_or(DEFAULT_ACOLYTE_DROP_YIELD as f64) as f32;
        let resource_booster = calculate_resource_booster(arsenal);
        if interval <= 0.0 {
            return 0.0;
        }
        return (yield_per_spawn / interval) * resource_booster;
    }

    if source.drop_type.uses_kpm_path() {
        let kpm = calculate_kpm(skill_coeff, arsenal, source);
        let boosters = calculate_boosters(arsenal);
        let p_base = (source.base_chance / 100.0) as f32;
        kpm * p_base * m_node * m_loot * boosters
    } else {
        // Mission/bounty tables: TADR is percent-per-minute; convert to expected items/min.
        let resource_booster = calculate_resource_booster(arsenal);
        (source.tadr as f32 / 100.0) * resource_booster
    }
}

/// Two-pass ETC (Pass 2): simulate farming this node for one cart item, then
/// speedrunning the remainder at each item's global-best isolated node.
pub fn calculate_etc_cost(
    cart: &[Objective],
    yields_at_node: &HashMap<String, f32>,
    global_max_yields: &HashMap<String, f32>,
    node_level: f32,
    skill_coeff: f32,
) -> (f32, f32) {
    let mut best_total_etc = f32::MAX;

    for target in cart {
        let y_target = yields_at_node
            .get(&target.item_name)
            .copied()
            .unwrap_or(0.0);
        if y_target <= 0.0 {
            continue;
        }

        let q_target = target.target_quantity as f32;
        let time_spent_here = q_target / y_target;

        let mut remaining_etc = 0.0_f32;
        for cart_item in cart {
            let q_j = cart_item.target_quantity as f32;
            let y_j = yields_at_node
                .get(&cart_item.item_name)
                .copied()
                .unwrap_or(0.0);
            let amount_farmed_here = y_j * time_spent_here;
            let q_remaining = (q_j - amount_farmed_here).max(0.0);

            if q_remaining > 0.0 {
                let max_y_j = global_max_yields
                    .get(&cart_item.item_name)
                    .copied()
                    .unwrap_or(0.0);
                if max_y_j > 0.0 {
                    remaining_etc += q_remaining / max_y_j;
                } else {
                    remaining_etc += UNFARMABLE_ETC;
                }
            }
        }

        let total_etc = time_spent_here + remaining_etc;
        if total_etc < best_total_etc {
            best_total_etc = total_etc;
        }
    }

    if best_total_etc == f32::MAX {
        return (f32::MAX, calculate_friction(skill_coeff, node_level));
    }

    let friction = calculate_friction(skill_coeff, node_level);
    (best_total_etc * friction, friction)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constants::PLANETARY_HORDE_TAG;
    use crate::drop_type::DropType;
    use crate::types::{ArsenalState, DropSource};

    fn bounty_source(tadr: f64) -> DropSource {
        DropSource {
            location_id: "Cetus Bounty - Level 10 - 30 Cetus Bounty".to_string(),
            drop_type: DropType::BountyReward,
            game_mode: "Bounty".to_string(),
            rotation: "Full Clear".to_string(),
            base_chance: tadr * 20.0,
            tadr,
            time_gate_minutes: None,
            tags: vec![],
            spawn_interval_minutes: None,
            drop_yield: None,
        }
    }

    fn enemy_source(base_chance: f64, time_gate_minutes: Option<f64>, horde: bool) -> DropSource {
        DropSource {
            location_id: if horde {
                "Ceres - Gabii".to_string()
            } else {
                "Enemy - Corrupted Vor".to_string()
            },
            drop_type: DropType::EnemyDrop,
            game_mode: if horde { "Survival".to_string() } else { "Boss".to_string() },
            rotation: "A".to_string(),
            base_chance,
            tadr: base_chance / 5.0,
            time_gate_minutes,
            tags: if horde {
                vec![PLANETARY_HORDE_TAG.to_string()]
            } else {
                vec![]
            },
            spawn_interval_minutes: None,
            drop_yield: None,
        }
    }

    fn dual_cart() -> Vec<Objective> {
        vec![
            Objective {
                item_name: "Orokin Cell".to_string(),
                target_quantity: 10,
            },
            Objective {
                item_name: "Argon Crystal".to_string(),
                target_quantity: 10,
            },
        ]
    }

    #[test]
    fn friction_at_boundary() {
        assert_eq!(calculate_friction(1.0, 250.0), 1.0);
    }

    #[test]
    fn friction_above_boundary() {
        let f = calculate_friction(1.0, 260.0);
        assert!(f > 1.0);
    }

    #[test]
    fn etc_dual_cart_isolated_nodes_tie() {
        let cart = dual_cart();
        let global_max = HashMap::from([
            ("Orokin Cell".to_string(), 16.8_f32),
            ("Argon Crystal".to_string(), 2.5_f32),
        ]);

        let mut gabii = HashMap::new();
        gabii.insert("Orokin Cell".to_string(), 16.8_f32);
        let (gabii_etc, _) = calculate_etc_cost(&cart, &gabii, &global_max, 20.0, 1.0);

        let mut ani = HashMap::new();
        ani.insert("Argon Crystal".to_string(), 2.5_f32);
        let (ani_etc, _) = calculate_etc_cost(&cart, &ani, &global_max, 20.0, 1.0);

        assert!((gabii_etc - 4.59).abs() < 0.05);
        assert!((ani_etc - 4.59).abs() < 0.05);
    }

    #[test]
    fn etc_synergy_trap_formido_slower_than_isolated_route() {
        let cart = dual_cart();
        let global_max = HashMap::from([
            ("Orokin Cell".to_string(), 16.8_f32),
            ("Argon Crystal".to_string(), 2.5_f32),
        ]);

        let mut formido = HashMap::new();
        formido.insert("Orokin Cell".to_string(), 1.15_f32);
        formido.insert("Argon Crystal".to_string(), 1.15_f32);
        let (formido_etc, _) = calculate_etc_cost(&cart, &formido, &global_max, 20.0, 1.0);

        let mut gabii = HashMap::new();
        gabii.insert("Orokin Cell".to_string(), 16.8_f32);
        let (gabii_etc, _) = calculate_etc_cost(&cart, &gabii, &global_max, 20.0, 1.0);

        assert!((formido_etc - 8.69).abs() < 0.05);
        assert!(formido_etc > gabii_etc * 1.8);
    }

    #[test]
    fn etc_single_item_equals_quantity_over_yield() {
        let cart = vec![Objective {
            item_name: "Orokin Cell".to_string(),
            target_quantity: 10,
        }];
        let global_max = HashMap::from([("Orokin Cell".to_string(), 16.8_f32)]);
        let mut node = HashMap::new();
        node.insert("Orokin Cell".to_string(), 16.8_f32);

        let (etc, _) = calculate_etc_cost(&cart, &node, &global_max, 20.0, 1.0);
        assert!((etc - (10.0 / 16.8)).abs() < 0.001);
    }

    #[test]
    fn bounty_yield_uses_tadr_not_kpm() {
        let arsenal = ArsenalState::default();
        let source = bounty_source(15.0);
        let novice = calculate_item_yield(&source, 1.0, 4.0, 0.1, &arsenal);
        let expert = calculate_item_yield(&source, 1.0, 4.0, 1.0, &arsenal);
        assert!((novice - 0.15).abs() < 0.001);
        assert!((expert - 0.15).abs() < 0.001);
    }

    #[test]
    fn bounty_tadr_percent_is_not_treated_as_whole_items_per_minute() {
        let arsenal = ArsenalState::default();
        let source = bounty_source(13.2);
        let yield_val = calculate_item_yield(&source, 1.0, 1.0, 1.0, &arsenal);
        assert!((yield_val - 0.132).abs() < 0.001);
        assert!(yield_val < 1.0);
    }

    #[test]
    fn interval_spawn_ignores_kpm_for_steel_essence() {
        let arsenal = ArsenalState::default();
        let source = DropSource {
            location_id: "Enemy - Misery".to_string(),
            drop_type: DropType::EnemyDrop,
            game_mode: "Steel Path".to_string(),
            rotation: "A".to_string(),
            base_chance: 100.0,
            tadr: 20.0,
            time_gate_minutes: None,
            tags: vec![INTERVAL_SPAWN_TAG.to_string()],
            spawn_interval_minutes: Some(6.0),
            drop_yield: Some(2.0),
        };
        let yield_per_min = calculate_item_yield(&source, 1.0, 1.0, 1.0, &arsenal);
        assert!((yield_per_min - (2.0 / 6.0)).abs() < 0.001);
        let twenty = 20.0 / yield_per_min;
        assert!((twenty - 60.0).abs() < 0.5);
    }

    #[test]
    fn time_gated_enemy_uses_build_time_ttk_overlay() {
        let arsenal = ArsenalState::default();
        let source = enemy_source(50.0, Some(8.0), false);
        let yield_val = calculate_item_yield(&source, 1.0, 1.0, 1.0, &arsenal);
        let expected = (1.0 / 8.0) * 0.5;
        assert!((yield_val - expected).abs() < 0.001);
    }

    #[test]
    fn enemy_yield_scales_with_kpm_and_loot() {
        let arsenal = ArsenalState {
            has_nekros: true,
            has_high_slash: true,
            ..Default::default()
        };
        let source = enemy_source(12.5, None, true);
        let low_skill = calculate_item_yield(&source, 1.35, 1.0, 0.1, &ArsenalState::default());
        let high_skill = calculate_item_yield(&source, 1.35, 1.0, 1.0, &ArsenalState::default());
        let with_loot = calculate_item_yield(&source, 1.35, 2.0, 1.0, &arsenal);
        assert!(high_skill > low_skill);
        assert!(with_loot > high_skill);
    }

    #[test]
    fn enemy_farm_beats_bounty_for_same_resource() {
        let arsenal = ArsenalState::default();
        let bounty = calculate_item_yield(&bounty_source(15.0), 1.0, 1.0, 1.0, &arsenal);
        let enemy = calculate_item_yield(&enemy_source(12.5, None, true), 1.35, 1.0, 1.0, &arsenal);
        assert!(enemy > bounty);
    }
}
