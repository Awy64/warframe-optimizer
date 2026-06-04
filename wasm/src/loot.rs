use crate::types::ArsenalState;

pub fn calculate_m_loot(arsenal: &ArsenalState) -> f32 {
    let mut m = 1.0_f32;

    if arsenal.has_ivara {
        m += 1.0;
    }
    if arsenal.has_atlas {
        m += 0.50;
    }

    if arsenal.has_hydroid {
        m += 1.0;
    } else if arsenal.has_khora && !arsenal.has_atlas {
        m += 0.60;
    }

    if arsenal.has_nekros {
        if arsenal.has_high_slash {
            m += 1.35;
        } else {
            m += 0.54;
        }
    }

    m
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::ArsenalState;

    #[test]
    fn atlas_disables_khora() {
        let a = ArsenalState {
            has_atlas: true,
            has_khora: true,
            ..Default::default()
        };
        let m = calculate_m_loot(&a);
        assert!((m - 1.5).abs() < 0.01);
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
        assert!((calculate_m_loot(&a) - 2.35).abs() < 0.01);
    }
}
