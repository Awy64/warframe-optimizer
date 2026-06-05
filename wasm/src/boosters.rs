use crate::constants::{BOOSTER_ACTIVE, BOOSTER_INACTIVE};
use crate::types::ArsenalState;

pub fn calculate_boosters(arsenal: &ArsenalState) -> f32 {
    calculate_drop_booster(arsenal) * calculate_resource_booster(arsenal)
}

pub fn calculate_drop_booster(arsenal: &ArsenalState) -> f32 {
    if arsenal.drop_chance_booster_active {
        BOOSTER_ACTIVE
    } else {
        BOOSTER_INACTIVE
    }
}

pub fn calculate_resource_booster(arsenal: &ArsenalState) -> f32 {
    if arsenal.resource_booster_active {
        BOOSTER_ACTIVE
    } else {
        BOOSTER_INACTIVE
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::ArsenalState;

    fn arsenal(drop_on: bool, resource_on: bool) -> ArsenalState {
        ArsenalState {
            drop_chance_booster_active: drop_on,
            resource_booster_active: resource_on,
            ..Default::default()
        }
    }

    #[test]
    fn neither_booster() {
        assert_eq!(calculate_boosters(&arsenal(false, false)), 1.0);
    }

    #[test]
    fn drop_only() {
        assert_eq!(calculate_boosters(&arsenal(true, false)), 2.0);
    }

    #[test]
    fn resource_only() {
        assert_eq!(calculate_boosters(&arsenal(false, true)), 2.0);
    }

    #[test]
    fn both_boosters() {
        assert_eq!(calculate_boosters(&arsenal(true, true)), 4.0);
    }
}
