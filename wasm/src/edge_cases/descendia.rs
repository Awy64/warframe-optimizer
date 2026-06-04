use crate::constants::{DESCENDIA_SKILL_WARN, SYNERGY_COEFF};

pub fn synergy_multiplier(match_count: usize, has_descendia_item: bool) -> f64 {
    if has_descendia_item || match_count <= 1 {
        return 1.0;
    }
    1.0 + SYNERGY_COEFF as f64 * (match_count as f64 - 1.0)
}

pub fn descendia_survivability_warning(skill: f64, node_is_descendia: bool) -> Option<&'static str> {
    if node_is_descendia && skill < DESCENDIA_SKILL_WARN as f64 {
        Some("High-survivability loadout required — elevated public matchmaking failure rate expected")
    } else {
        None
    }
}

pub fn vinquibus_warning(has_vinquibus: bool, farming_descendia_item: bool) -> Option<&'static str> {
    if farming_descendia_item && !has_vinquibus {
        Some("Vinquibus bayonet recommended for Descendia efficiency")
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn descendia_suspends_synergy() {
        assert_eq!(synergy_multiplier(3, true), 1.0);
    }

    #[test]
    fn normal_synergy() {
        assert!((synergy_multiplier(3, false) - 1.3).abs() < 0.001);
    }
}
