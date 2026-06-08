use crate::constants::CHESA_RETRIEVE_BONUS;
use crate::types::{ArsenalState, Companion};

/// Loot-corpse group bonus. Nekros' Desecrate and Chesa's Retrieve belong to the same
/// "loot corpse" group and do NOT stack — the engine takes the highest. Slash dismemberment
/// only doubles Nekros' pool (Chesa retrieves the single closest loot).
fn corpse_loot_bonus(arsenal: &ArsenalState) -> f32 {
    let nekros_bonus: f32 = if arsenal.has_nekros {
        if arsenal.has_high_slash {
            0.54 * 2.0
        } else {
            0.54
        }
    } else {
        0.0
    };
    let chesa_bonus: f32 = if arsenal.companion == Companion::Chesa {
        CHESA_RETRIEVE_BONUS
    } else {
        0.0
    };
    nekros_bonus.max(chesa_bonus)
}

pub fn calculate_m_loot(arsenal: &ArsenalState) -> f32 {
    if arsenal.squad_size == 1 {
        let mut best_bonus = 0.0_f32;
        if arsenal.has_ivara {
            best_bonus = best_bonus.max(1.0);
        }
        if arsenal.has_hydroid {
            best_bonus = best_bonus.max(1.0);
        }
        if arsenal.has_khora {
            best_bonus = best_bonus.max(0.65);
        }
        if arsenal.has_atlas {
            best_bonus = best_bonus.max(0.50);
        }
        best_bonus = best_bonus.max(corpse_loot_bonus(arsenal));
        return 1.0 + best_bonus;
    }

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
    // Rule: loot-corpse group (Nekros / Chesa) stacks with Phase 2 but not with itself.
    m += corpse_loot_bonus(arsenal);

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

    #[test]
    fn chesa_is_loot_corpse_group_does_not_stack_with_nekros() {
        use crate::types::Companion;
        // Nekros + Chesa together: same loot-corpse group, take max (both 0.54) → 1.54.
        let a = ArsenalState {
            has_nekros: true,
            companion: Companion::Chesa,
            ..Default::default()
        };
        assert!((calculate_m_loot(&a) - 1.54).abs() < 0.01);

        // Chesa alone behaves like a baseline Desecrate (+0.54).
        let chesa_only = ArsenalState {
            companion: Companion::Chesa,
            ..Default::default()
        };
        assert!((calculate_m_loot(&chesa_only) - 1.54).abs() < 0.01);

        // Slash only doubles Nekros' pool; Chesa stays at 0.54, so Nekros wins at 1.08.
        let slash = ArsenalState {
            has_nekros: true,
            has_high_slash: true,
            companion: Companion::Chesa,
            ..Default::default()
        };
        assert!((calculate_m_loot(&slash) - 2.08).abs() < 0.01);
    }

    #[test]
    fn chesa_stacks_with_khora_on_death_group() {
        use crate::types::Companion;
        // Khora (on-death, +0.65) + Chesa (loot-corpse, +0.54) stack: 1 + 0.65 + 0.54 = 2.19.
        let a = ArsenalState {
            has_khora: true,
            companion: Companion::Chesa,
            ..Default::default()
        };
        assert!((calculate_m_loot(&a) - 2.19).abs() < 0.01);
    }

    #[test]
    fn solo_player_loot_frames_do_not_stack() {
        let a = ArsenalState {
            squad_size: 1,
            has_khora: true,   // 0.65
            has_nekros: true,  // 0.54
            ..Default::default()
        };
        // Should only take Khora (0.65) since it is higher than Nekros (0.54), giving 1.65 total
        assert!((calculate_m_loot(&a) - 1.65).abs() < 0.01);

        let a_slash = ArsenalState {
            squad_size: 1,
            has_khora: true,      // 0.65
            has_nekros: true,     // 0.54 * 2 = 1.08
            has_high_slash: true,
            ..Default::default()
        };
        // Should take Nekros with high slash (1.08) since it is higher than Khora (0.65), giving 2.08 total
        assert!((calculate_m_loot(&a_slash) - 2.08).abs() < 0.01);
    }
}
