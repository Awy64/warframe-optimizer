use crate::constants::HOLLVANIA_Y_BONUS;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EximusSeason {
    Winter,
    Spring,
    Summer,
    Autumn,
}

pub fn season_from_timestamp_ms(timestamp_ms: f64) -> EximusSeason {
    let secs = (timestamp_ms / 1000.0) as i64;
    let days = secs / 86400;
    let month = (((days + 719468) * 12 + 2) / 365 % 12 + 12) % 12 + 1;
    match month {
        1..=3 => EximusSeason::Winter,
        4..=6 => EximusSeason::Spring,
        7..=9 => EximusSeason::Summer,
        _ => EximusSeason::Autumn,
    }
}

pub fn hollvania_yield_bonus(
    timestamp_ms: f64,
    node_has_hollvania_tag: bool,
    objective_has_eximus_loot: bool,
) -> f32 {
    if !node_has_hollvania_tag || !objective_has_eximus_loot {
        return 0.0;
    }
    let _season = season_from_timestamp_ms(timestamp_ms);
    HOLLVANIA_Y_BONUS
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bonus_when_conditions_met() {
        let bonus = hollvania_yield_bonus(1_700_000_000_000.0, true, true);
        assert_eq!(bonus, 2.0);
    }

    #[test]
    fn no_bonus_without_tag() {
        assert_eq!(hollvania_yield_bonus(1_700_000_000_000.0, false, true), 0.0);
    }
}
