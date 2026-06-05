use crate::types::ArsenalState;

pub fn calculate_m_loot(arsenal: &ArsenalState) -> f32 {
    let mut m = 1.0_f32;

    // Phase 1: Alive (Pickpocketing)
    if arsenal.has_ivara {
        m += 1.0;
    }

    // Phase 2: On-Death (The Smashers)
    // Rule: These do NOT stack with each other. The game engine takes the highest value.
    let mut phase2_bonus = 0.0_f32;
    if arsenal.has_hydroid {
        phase2_bonus = phase2_bonus.max(1.0);
    }
    if arsenal.has_khora {
        phase2_bonus = phase2_bonus.max(0.65);
    }
    if arsenal.has_atlas {
        phase2_bonus = phase2_bonus.max(0.50);
    }
    m += phase2_bonus;

    // Phase 3: On-Corpse (The Scavengers)
    // Rule: Nekros (+54%) stacks with Phase 2. Slash cuts bodies in half (doubles Nekros's pool).
    if arsenal.has_nekros {
        let nekros_bonus = if arsenal.has_high_slash {
            0.54 * 2.0
        } else {
            0.54
        };
        m += nekros_bonus;
    }

    m
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::ArsenalState;

    #[test]
    fn atlas_does_not_stack_with_khora_takes_highest() {
        let a = ArsenalState {
            has_atlas: true,
            has_khora: true,
            ..Default::default()
        };
        let m = calculate_m_loot(&a);
        assert!((m - 1.65).abs() < 0.01);
    }

    #[test]
    fn hydroid_over_khora() {
        let a = ArsenalState {
            has_hydroid: true,
            has_khora: true,
            ..Default::default()
        };
        assert!((calculate_m_loot(&a) - 2.0).abs() < 0.01);
    }

    #[test]
    fn nekros_high_slash() {
        let a = ArsenalState {
            has_nekros: true,
            has_high_slash: true,
            ..Default::default()
        };
        assert!((calculate_m_loot(&a) - 2.08).abs() < 0.01);
    }
}
