use crate::constants::{BOOSTER_ACTIVE, BOOSTER_INACTIVE};
use crate::types::ArsenalState;

pub fn calculate_boosters(arsenal: &ArsenalState) -> f32 {
    let b_drop = if arsenal.drop_chance_booster_active {
        BOOSTER_ACTIVE
    } else {
        BOOSTER_INACTIVE
    };
    let b_resource = if arsenal.resource_booster_active {
        BOOSTER_ACTIVE
    } else {
        BOOSTER_INACTIVE
    };
    b_drop * b_resource
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
