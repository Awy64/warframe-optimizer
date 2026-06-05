use crate::constants::{ELITE_KPM, KPM_BASE, KPM_SKILL_SCALE, PLANETARY_HORDE_TAG, VINQUIBUS_WEAPON_MULT};
use crate::drop_type::DropType;
use crate::types::{ArsenalState, DropSource};

pub fn reference_horde_kpm(skill_coeff: f32, arsenal: &ArsenalState) -> f32 {
    horde_kpm(skill_coeff, arsenal)
}

fn horde_kpm(skill_coeff: f32, arsenal: &ArsenalState) -> f32 {
    let skill_kpm = KPM_BASE + (skill_coeff * KPM_SKILL_SCALE);
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
            return (1.0 / minutes) as f32;
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
        assert!((calculate_kpm(1.0, &a, &source) - 140.0).abs() < 0.01);
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
        assert!((calculate_kpm(1.0, &a, &source) - 0.125).abs() < 0.001);
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
        assert!((calculate_kpm(0.1, &a, &source) - 68.0).abs() < 0.01);
    }
}
