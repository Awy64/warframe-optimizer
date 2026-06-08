use serde::{Deserialize, Serialize};

use crate::deserialize::deserialize_null_f64_zero;
use crate::drop_type::DropType;

fn default_true() -> bool {
    true
}

fn default_squad_size() -> u8 {
    4
}

/// Beast companion equipped. Determines loot-corpse precept and Smeeta Charm behavior.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub enum Companion {
    #[default]
    None,
    /// Smeeta Kavat — Charm has a chance to spawn a rare resource native to the mission planet.
    Smeeta,
    /// Chesa Kubrow — Retrieve loots corpses like Nekros Desecrate (same group, does not stack).
    Chesa,
    /// Any other companion (no special loot precept; can still carry a Retriever mod).
    Other,
}

/// Universal Beast "Retriever" pickup-duplication mod (post Pet 2.0 / Charm rework).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub enum Retriever {
    #[default]
    None,
    /// 13% chance to double Credit, Resource, and Void Trace pickups.
    Loyal,
    /// 18% chance to double Resource (and Void Trace) pickups.
    Resourceful,
    /// 18% chance to double Credit pickups.
    Prosperous,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArsenalState {
    pub has_ivara: bool,
    pub has_atlas: bool,
    pub has_khora: bool,
    pub has_hydroid: bool,
    pub has_nekros: bool,
    pub has_high_slash: bool,
    pub has_vinquibus: bool,
    pub drop_chance_booster_active: bool,
    pub resource_booster_active: bool,
    /// Mod Drop Chance Booster — affects mod-classified drops such as Endo.
    #[serde(default)]
    pub mod_drop_chance_booster_active: bool,
    /// Credit Booster — doubles credit pickups.
    #[serde(default)]
    pub credit_booster_active: bool,
    /// Chroma's Effigy doubles credit drops it is placed over.
    #[serde(default)]
    pub has_chroma_effigy: bool,
    #[serde(default)]
    pub companion: Companion,
    #[serde(default)]
    pub retriever: Retriever,
    /// Xaku/Limbo-style AoE container-break frame (boosts crate/Argon container yield).
    #[serde(default)]
    pub has_aoe_container_frame: bool,
    #[serde(default = "default_true")]
    pub has_zariman_unlocked: bool,
    #[serde(default)]
    pub steel_path_active: bool,
    #[serde(default = "default_squad_size")]
    pub squad_size: u8,
}

impl Default for ArsenalState {
    fn default() -> Self {
        Self {
            has_ivara: false,
            has_atlas: false,
            has_khora: false,
            has_hydroid: false,
            has_nekros: false,
            has_high_slash: false,
            has_vinquibus: false,
            drop_chance_booster_active: false,
            resource_booster_active: false,
            mod_drop_chance_booster_active: false,
            credit_booster_active: false,
            has_chroma_effigy: false,
            companion: Companion::None,
            retriever: Retriever::None,
            has_aoe_container_frame: false,
            has_zariman_unlocked: true,
            steel_path_active: false,
            squad_size: 4,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Objective {
    pub item_name: String,
    pub target_quantity: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DropSource {
    pub location_id: String,
    pub drop_type: DropType,
    pub game_mode: String,
    pub rotation: String,
    #[serde(deserialize_with = "deserialize_null_f64_zero")]
    pub base_chance: f64,
    #[serde(deserialize_with = "deserialize_null_f64_zero")]
    pub tadr: f64,
    #[serde(default)]
    pub time_gate_minutes: Option<f64>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub spawn_interval_minutes: Option<f64>,
    #[serde(default)]
    pub drop_yield: Option<f64>,
    #[serde(default)]
    pub source_entity: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeMeta {
    pub location_id: String,
    pub planet: String,
    pub node_name: String,
    pub game_mode: String,
    #[serde(deserialize_with = "deserialize_null_f64_zero")]
    pub min_enemy_level: f64,
    #[serde(deserialize_with = "deserialize_null_f64_zero")]
    pub max_enemy_level: f64,
    #[serde(deserialize_with = "deserialize_null_f64_zero")]
    pub m_node: f64,
    pub skill_tier: String,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemIndex {
    pub items: std::collections::HashMap<String, Vec<DropSource>>,
    pub item_names: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeLevelsFile {
    pub nodes: std::collections::HashMap<String, NodeMeta>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchedItem {
    pub item_name: String,
    pub tadr: f64,
    pub target_quantity: u32,
    pub y_item: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrapaEngineResult {
    pub ranked_nodes: Vec<RankedNode>,
    pub pathing_failures: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RankedNode {
    pub location_id: String,
    pub game_mode: String,
    pub cost: f64,
    /// Pre-friction estimated time to completion (minutes).
    pub etc_minutes: f64,
    pub friction_penalty: f64,
    pub kpm: f64,
    pub matched_items: Vec<MatchedItem>,
    pub warnings: Vec<String>,
    pub friction_applied: bool,
    pub max_enemy_level: f64,
}
