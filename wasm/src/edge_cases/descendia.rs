use crate::constants::DESCENDIA_SKILL_WARN;

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
