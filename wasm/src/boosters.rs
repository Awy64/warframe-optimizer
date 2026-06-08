use crate::constants::{
    BOOSTER_ACTIVE, BOOSTER_INACTIVE, CHROMA_EFFIGY_CREDIT_MULT, LOYAL_RETRIEVER_CHANCE,
    PROSPEROUS_RETRIEVER_CHANCE, RESOURCEFUL_RETRIEVER_CHANCE, SMEETA_CHARM_ACTIVATION,
    SMEETA_PROCS_PER_MINUTE, SMEETA_RARE_NATIVE_SUBCHANCE,
};
use crate::types::{ArsenalState, Companion, Retriever};

/// What kind of pickup a Retriever mod is doubling.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PayloadKind {
    Resource,
    Credit,
    Trace,
}

pub fn calculate_boosters(arsenal: &ArsenalState) -> f32 {
    calculate_drop_booster(arsenal) * calculate_resource_booster(arsenal)
}

pub fn calculate_drop_booster(arsenal: &ArsenalState) -> f32 {
    let mut multiplier = if arsenal.drop_chance_booster_active {
        BOOSTER_ACTIVE
    } else {
        BOOSTER_INACTIVE
    };
    if arsenal.steel_path_active {
        multiplier *= 2.0;
    }
    multiplier
}

pub fn calculate_resource_booster(arsenal: &ArsenalState) -> f32 {
    if arsenal.resource_booster_active {
        BOOSTER_ACTIVE
    } else {
        BOOSTER_INACTIVE
    }
}

/// Mod Drop Chance Booster. Endo is mod-classified, so only this booster (and Steel
/// Path's +100% mod drop chance) affect it — resource boosters do nothing.
pub fn calculate_mod_drop_booster(arsenal: &ArsenalState) -> f32 {
    let mut multiplier = if arsenal.mod_drop_chance_booster_active {
        BOOSTER_ACTIVE
    } else {
        BOOSTER_INACTIVE
    };
    if arsenal.steel_path_active {
        multiplier *= 2.0;
    }
    multiplier
}

/// Credit pickup quantity multiplier: Credit Booster x2 and Chroma Effigy x2.
pub fn calculate_credit_booster(arsenal: &ArsenalState) -> f32 {
    let mut multiplier = if arsenal.credit_booster_active {
        BOOSTER_ACTIVE
    } else {
        BOOSTER_INACTIVE
    };
    if arsenal.has_chroma_effigy {
        multiplier *= CHROMA_EFFIGY_CREDIT_MULT;
    }
    multiplier
}

/// Expected-value pickup-duplication multiplier from the equipped Retriever mod for a
/// given payload class (1.0 when no applicable Retriever is equipped).
pub fn retriever_multiplier(arsenal: &ArsenalState, payload: PayloadKind) -> f32 {
    let chance = match (arsenal.retriever, payload) {
        (Retriever::Loyal, _) => LOYAL_RETRIEVER_CHANCE,
        (Retriever::Resourceful, PayloadKind::Resource) => RESOURCEFUL_RETRIEVER_CHANCE,
        (Retriever::Resourceful, PayloadKind::Trace) => RESOURCEFUL_RETRIEVER_CHANCE,
        (Retriever::Prosperous, PayloadKind::Credit) => PROSPEROUS_RETRIEVER_CHANCE,
        _ => 0.0,
    };
    1.0 + chance
}

/// Physical resource pickup quantity multiplier: Resource Booster x Retriever(Resource).
pub fn resource_pickup_multiplier(arsenal: &ArsenalState) -> f32 {
    calculate_resource_booster(arsenal) * retriever_multiplier(arsenal, PayloadKind::Resource)
}

pub const CURRENCY_ENDO_TAG: &str = "currency-endo";
pub const CURRENCY_CREDITS_TAG: &str = "currency-credits";
pub const CURRENCY_TRACES_TAG: &str = "currency-traces";
pub const CURRENCY_KUVA_TAG: &str = "currency-kuva";

/// Returns the booster multiplier appropriate to a tagged currency source, or `None` when
/// the source is not a currency. Each currency uses its own booster taxonomy:
/// - Endo is mod-classified (Mod Drop Chance Booster + Steel Path), NOT resource boosters.
/// - Credits scale with Credit Booster, Chroma Effigy, and Prosperous/Loyal Retriever.
/// - Void Traces scale with Resource Booster and Resourceful/Loyal Retriever (NOT drop chance).
/// - Kuva is a resource pickup (Resource Booster + Resourceful/Loyal Retriever).
pub fn currency_booster_multiplier(tags: &[String], arsenal: &ArsenalState) -> Option<f32> {
    if tags.iter().any(|t| t == CURRENCY_ENDO_TAG) {
        Some(calculate_mod_drop_booster(arsenal))
    } else if tags.iter().any(|t| t == CURRENCY_CREDITS_TAG) {
        Some(calculate_credit_booster(arsenal) * retriever_multiplier(arsenal, PayloadKind::Credit))
    } else if tags.iter().any(|t| t == CURRENCY_TRACES_TAG) {
        Some(
            calculate_resource_booster(arsenal)
                * retriever_multiplier(arsenal, PayloadKind::Trace),
        )
    } else if tags.iter().any(|t| t == CURRENCY_KUVA_TAG) {
        Some(resource_pickup_multiplier(arsenal))
    } else {
        None
    }
}

/// Expected bonus rare-native-resource pickups per minute from a Smeeta Kavat's Charm.
/// Only meaningful for rare resources native to the current planet; callers gate on that.
pub fn smeeta_rare_native_yield_per_minute(arsenal: &ArsenalState) -> f32 {
    if arsenal.companion == Companion::Smeeta {
        SMEETA_PROCS_PER_MINUTE * SMEETA_CHARM_ACTIVATION * SMEETA_RARE_NATIVE_SUBCHANCE
    } else {
        0.0
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

    #[test]
    fn steel_path_adds_drop_booster() {
        let mut a = arsenal(false, false);
        a.steel_path_active = true;
        assert_eq!(calculate_boosters(&a), 2.0);
        
        let mut a_both = arsenal(true, true);
        a_both.steel_path_active = true;
        assert_eq!(calculate_boosters(&a_both), 8.0);
    }

    #[test]
    fn mod_drop_booster_independent_of_resource_booster() {
        // Resource booster must NOT affect Endo (mod-classified).
        let mut a = ArsenalState::default();
        a.resource_booster_active = true;
        assert_eq!(calculate_mod_drop_booster(&a), 1.0);

        a.mod_drop_chance_booster_active = true;
        assert_eq!(calculate_mod_drop_booster(&a), 2.0);

        a.steel_path_active = true;
        assert_eq!(calculate_mod_drop_booster(&a), 4.0);
    }

    #[test]
    fn credit_booster_stacks_with_chroma_effigy() {
        let mut a = ArsenalState::default();
        assert_eq!(calculate_credit_booster(&a), 1.0);
        a.credit_booster_active = true;
        assert_eq!(calculate_credit_booster(&a), 2.0);
        a.has_chroma_effigy = true;
        assert_eq!(calculate_credit_booster(&a), 4.0);
    }

    #[test]
    fn retriever_payload_routing() {
        use crate::types::Retriever;
        let mut a = ArsenalState::default();

        a.retriever = Retriever::Resourceful;
        assert!((retriever_multiplier(&a, PayloadKind::Resource) - 1.18).abs() < 1e-6);
        assert!((retriever_multiplier(&a, PayloadKind::Trace) - 1.18).abs() < 1e-6);
        // Resourceful does nothing for credits.
        assert!((retriever_multiplier(&a, PayloadKind::Credit) - 1.0).abs() < 1e-6);

        a.retriever = Retriever::Prosperous;
        assert!((retriever_multiplier(&a, PayloadKind::Credit) - 1.18).abs() < 1e-6);
        assert!((retriever_multiplier(&a, PayloadKind::Resource) - 1.0).abs() < 1e-6);

        a.retriever = Retriever::Loyal;
        assert!((retriever_multiplier(&a, PayloadKind::Resource) - 1.13).abs() < 1e-6);
        assert!((retriever_multiplier(&a, PayloadKind::Credit) - 1.13).abs() < 1e-6);
        assert!((retriever_multiplier(&a, PayloadKind::Trace) - 1.13).abs() < 1e-6);
    }

    #[test]
    fn smeeta_yield_only_when_equipped() {
        use crate::types::Companion;
        let mut a = ArsenalState::default();
        assert_eq!(smeeta_rare_native_yield_per_minute(&a), 0.0);
        a.companion = Companion::Smeeta;
        assert!(smeeta_rare_native_yield_per_minute(&a) > 0.0);
        a.companion = Companion::Chesa;
        assert_eq!(smeeta_rare_native_yield_per_minute(&a), 0.0);
    }
}
