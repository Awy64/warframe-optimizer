use crate::constants::{ELITE_KPM, PLANETARY_HORDE_TAG, VINQUIBUS_WEAPON_MULT};
use crate::drop_type::DropType;
use crate::types::{ArsenalState, DropSource};

pub fn reference_horde_kpm(skill_coeff: f32, arsenal: &ArsenalState) -> f32 {
    horde_kpm(skill_coeff, arsenal)
}

fn horde_kpm(skill_coeff: f32, arsenal: &ArsenalState) -> f32 {
    let skill_kpm = if arsenal.steel_path_active {
        60.0 + (skill_coeff * 70.0)
    } else {
        30.0 + (skill_coeff * 15.0)
    };
    let weapon_multiplier = if arsenal.has_vinquibus {
        VINQUIBUS_WEAPON_MULT
    } else {
        1.0
    };
    skill_kpm * weapon_multiplier
}

fn is_planetary_horde(source: &DropSource) -> bool {
    source
        .tags
        .iter()
        .any(|tag| tag == PLANETARY_HORDE_TAG)
}

pub fn calculate_kpm(skill_coeff: f32, arsenal: &ArsenalState, source: &DropSource) -> f32 {
    if let Some(minutes) = source.time_gate_minutes {
        if minutes > 0.0 {
            let mut t_run = (minutes as f32 / (skill_coeff * 1.5)).max(1.5);
            if source.location_id.contains("Vor") || source.location_id.contains("Stalker") {
                t_run += 5.0;
            }
            return 1.0 / t_run;
        }
    }

    if source.drop_type == DropType::EnemyDrop {
        if is_planetary_horde(source) {
            return horde_kpm(skill_coeff, arsenal);
        }
        return ELITE_KPM;
    }

    if source.drop_type.uses_kpm_path() {
        return horde_kpm(skill_coeff, arsenal);
    }

    horde_kpm(skill_coeff, arsenal)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{ArsenalState, DropSource};

    fn enemy_source(tags: Vec<&str>, time_gate_minutes: Option<f64>) -> DropSource {
        DropSource {
            location_id: "Ceres - Gabii".to_string(),
            drop_type: DropType::EnemyDrop,
            game_mode: "Survival".to_string(),
            rotation: "A".to_string(),
            base_chance: 0.09,
            tadr: 0.0,
            time_gate_minutes,
            tags: tags.into_iter().map(str::to_string).collect(),
            spawn_interval_minutes: None,
            drop_yield: None,
        }
    }

    #[test]
    fn horde_kpm_on_planetary_heuristic_tag() {
        let a = ArsenalState::default();
        let source = enemy_source(vec![PLANETARY_HORDE_TAG], None);
        assert!((calculate_kpm(1.0, &a, &source) - 45.0).abs() < 0.01);
    }

    #[test]
    fn horde_kpm_on_steel_path() {
        let a = ArsenalState {
            steel_path_active: true,
            ..Default::default()
        };
        let source = enemy_source(vec![PLANETARY_HORDE_TAG], None);
        assert!((calculate_kpm(1.0, &a, &source) - 130.0).abs() < 0.01);
    }

    #[test]
    fn elite_enemy_drop_without_horde_tag_is_capped() {
        let a = ArsenalState::default();
        let source = enemy_source(vec![], None);
        assert!((calculate_kpm(1.0, &a, &source) - ELITE_KPM).abs() < 0.001);
    }

    #[test]
    fn time_gate_minutes_sets_kills_per_minute() {
        let a = ArsenalState::default();
        let source = enemy_source(vec![], Some(8.0));
        // skill_coeff = 1.0, so t_run = (8.0 / 1.5).max(1.5) = 5.3333
        // KPM = 1.0 / 5.3333 = 0.1875
        assert!((calculate_kpm(1.0, &a, &source) - 0.1875).abs() < 0.001);
    }

    #[test]
    fn mod_location_uses_horde_kpm() {
        let a = ArsenalState::default();
        let source = DropSource {
            location_id: "Enemy - Elite Lancer".to_string(),
            drop_type: DropType::ModLocation,
            game_mode: "Enemy Drop".to_string(),
            rotation: "A".to_string(),
            base_chance: 3.0,
            tadr: 0.6,
            time_gate_minutes: None,
            tags: vec![],
            spawn_interval_minutes: None,
            drop_yield: None,
        };
        assert!((calculate_kpm(0.1, &a, &source) - 31.5).abs() < 0.01);
    }
}
