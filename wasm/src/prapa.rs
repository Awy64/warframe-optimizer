use crate::boosters::calculate_boosters;
use crate::constants::{COMFORT_LEVEL_SCALE, FRICTION_COEFF, FRICTION_EXPONENT, INTERMEDIATE_SKILL_GATE, EXPERT_SKILL_GATE};
use crate::kpm::calculate_kpm;
use crate::types::ArsenalState;

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

pub fn calculate_prapa_cost(
    base_drop_chance: f32,
    node_level: f32,
    m_node: f32,
    m_loot: f32,
    s_m: f32,
    skill_coeff: f32,
    arsenal: &ArsenalState,
) -> (f32, f32, f32) {
    let kpm = calculate_kpm(skill_coeff, arsenal);
    let boosters = calculate_boosters(arsenal);
    let projected_yield = kpm * base_drop_chance * m_node * m_loot * boosters;
    let friction = calculate_friction(skill_coeff, node_level);

    let cost = if projected_yield * s_m <= 0.0 {
        f32::MAX
    } else {
        (1.0 / (projected_yield * s_m)) * friction
    };

    (cost, projected_yield, friction)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::ArsenalState;

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
    fn lower_cost_is_better_yield() {
        let a = ArsenalState::default();
        let (low, _, _) = calculate_prapa_cost(0.5, 20.0, 1.35, 2.0, 1.0, 1.0, &a);
        let (high, _, _) = calculate_prapa_cost(0.1, 20.0, 1.0, 1.0, 1.0, 1.0, &a);
        assert!(low < high);
    }
}
