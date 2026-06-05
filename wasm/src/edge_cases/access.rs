use crate::types::{ArsenalState, DropSource, NodeMeta};

pub const REQUIRES_ZARIMAN_TAG: &str = "requires-zariman";
pub const STEEL_PATH_TAG: &str = "steel-path";

pub fn blocked_by_zariman(source: &DropSource, meta: &NodeMeta) -> bool {
    source
        .tags
        .iter()
        .any(|t| t == REQUIRES_ZARIMAN_TAG)
        || meta.tags.iter().any(|t| t == REQUIRES_ZARIMAN_TAG)
        || meta.planet == "Zariman"
        || source.location_id.contains("Zariman")
}

pub fn is_source_accessible(
    source: &DropSource,
    meta: &NodeMeta,
    arsenal: &ArsenalState,
    item_name: &str,
) -> bool {
    if !arsenal.has_zariman_unlocked && blocked_by_zariman(source, meta) {
        return false;
    }

    let steel_path_only = source.tags.iter().any(|t| t == STEEL_PATH_TAG);
    if steel_path_only && !arsenal.steel_path_active {
        return false;
    }
    if arsenal.steel_path_active && item_name == "Steel Essence" && !steel_path_only {
        return false;
    }

    true
}
