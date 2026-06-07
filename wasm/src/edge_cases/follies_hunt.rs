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

pub fn quantized_farm_minutes(target_quantity: f32, yield_per_minute: f32, squad_size: u8) -> f32 {
    let run_duration = base_completion_time(squad_size);
    let yield_per_run = (yield_per_minute * run_duration).round();

    if yield_per_run <= 0.0 {
        return f32::MAX;
    }

    let runs = ((target_quantity - 0.00001) / yield_per_run).ceil().max(0.0);
    runs * run_duration
}

pub fn farm_minutes_at_node(
    target_quantity: f32,
    yield_per_minute: f32,
    location_id: &str,
    game_mode: &str,
    squad_size: u8,
) -> f32 {
    if is_follies_hunt_node(location_id, game_mode) {
        quantized_farm_minutes(target_quantity, yield_per_minute, squad_size)
    } else {
        target_quantity / yield_per_minute
    }
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

    #[test]
    fn quantized_solo_qty_one() {
        let y = 24.0 / 14.0;
        let minutes = quantized_farm_minutes(1.0, y, 1);
        assert!((minutes - 14.0).abs() < 0.001);
    }

    #[test]
    fn quantized_solo_qty_twenty_four_no_float_drift() {
        let y = atramentum_yield_per_minute(&ArsenalState {
            squad_size: 1,
            ..ArsenalState::default()
        });
        let minutes = quantized_farm_minutes(24.0, y, 1);
        assert!((minutes - 14.0).abs() < 0.001);
    }

    #[test]
    fn quantized_solo_qty_twenty_five_two_runs() {
        let y = 24.0 / 14.0;
        let minutes = quantized_farm_minutes(25.0, y, 1);
        assert!((minutes - 28.0).abs() < 0.001);
    }

    #[test]
    fn quantized_squad_four_qty_thirty() {
        let y = 4.0;
        let minutes = quantized_farm_minutes(30.0, y, 4);
        assert!((minutes - 12.0).abs() < 0.001);
    }

    #[test]
    fn quantized_steel_path_squad_four_qty_fifty_three() {
        let y = atramentum_yield_per_minute(&ArsenalState {
            steel_path_active: true,
            ..ArsenalState::default()
        });
        let minutes = quantized_farm_minutes(53.0, y, 4);
        assert!((minutes - 6.0).abs() < 0.001);
    }
}
