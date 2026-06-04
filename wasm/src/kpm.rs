use crate::constants::{KPM_BASE, KPM_SKILL_SCALE, VINQUIBUS_WEAPON_MULT};
use crate::types::ArsenalState;

pub fn calculate_kpm(skill_coeff: f32, arsenal: &ArsenalState) -> f32 {
    let skill_kpm = KPM_BASE + (skill_coeff * KPM_SKILL_SCALE);
    let weapon_multiplier = if arsenal.has_vinquibus {
        VINQUIBUS_WEAPON_MULT
    } else {
        1.0
    };
    skill_kpm * weapon_multiplier
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::ArsenalState;

    #[test]
    fn novice_kpm() {
        let a = ArsenalState::default();
        assert!((calculate_kpm(0.1, &a) - 68.0).abs() < 0.01);
    }

    #[test]
    fn expert_kpm() {
        let a = ArsenalState::default();
        assert!((calculate_kpm(1.0, &a) - 140.0).abs() < 0.01);
    }

    #[test]
    fn expert_vinquibus_kpm() {
        let a = ArsenalState {
            has_vinquibus: true,
            ..Default::default()
        };
        assert!((calculate_kpm(1.0, &a) - 175.0).abs() < 0.01);
    }
}
