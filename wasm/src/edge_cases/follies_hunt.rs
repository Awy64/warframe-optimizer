use crate::constants::{ATRAMENTUM_YIELD_NORMAL, ATRAMENTUM_YIELD_STEEL_PATH, UPDATE42_HEURISTIC_TAG};
use crate::types::ArsenalState;

pub fn is_follies_hunt_node(location_id: &str, game_mode: &str) -> bool {
    game_mode == "Follie's Hunt" || location_id.contains("Vesper Relay")
}

pub fn effective_m_loot(location_id: &str, game_mode: &str, m_loot: f32) -> f32 {
    if is_follies_hunt_node(location_id, game_mode) {
        1.0
    } else {
        m_loot
    }
}

pub fn base_completion_time(squad_size: u8) -> f32 {
    match squad_size {
        4 => 6.0,
        3 => 7.5,
        2 => 9.5,
        1 => 14.0,
        _ => 14.0,
    }
}

pub fn atramentum_yield_per_minute(arsenal: &ArsenalState) -> f32 {
    let total = if arsenal.steel_path_active {
        ATRAMENTUM_YIELD_STEEL_PATH
    } else {
        ATRAMENTUM_YIELD_NORMAL
    };
    total / base_completion_time(arsenal.squad_size)
}

pub fn is_update42_heuristic(tags: &[String]) -> bool {
    tags.iter().any(|t| t == UPDATE42_HEURISTIC_TAG)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::ArsenalState;

    #[test]
    fn squad_four_normal_yield() {
        let arsenal = ArsenalState::default();
        let y = atramentum_yield_per_minute(&arsenal);
        assert!((y - 4.0).abs() < 0.001);
    }

    #[test]
    fn solo_normal_yield() {
        let arsenal = ArsenalState {
            squad_size: 1,
            ..ArsenalState::default()
        };
        let y = atramentum_yield_per_minute(&arsenal);
        assert!((y - (24.0 / 14.0)).abs() < 0.001);
    }

    #[test]
    fn steel_path_squad_four_yield() {
        let arsenal = ArsenalState {
            steel_path_active: true,
            ..ArsenalState::default()
        };
        let y = atramentum_yield_per_minute(&arsenal);
        assert!((y - (53.0 / 6.0)).abs() < 0.001);
    }

    #[test]
    fn operator_suppression_nullifies_loot_frames() {
        let m = effective_m_loot("Venus - Vesper Relay", "Follie's Hunt", 2.5);
        assert_eq!(m, 1.0);
    }

    #[test]
    fn loot_frames_unaffected_on_other_nodes() {
        let m = effective_m_loot("Ceres - Gabii", "Survival", 2.5);
        assert_eq!(m, 2.5);
    }
}
