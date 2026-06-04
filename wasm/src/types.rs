use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
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
    pub drop_type: String,
    pub game_mode: String,
    pub rotation: String,
    pub base_chance: f64,
    pub tadr: f64,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeMeta {
    pub location_id: String,
    pub planet: String,
    pub node_name: String,
    pub game_mode: String,
    pub min_enemy_level: f64,
    pub max_enemy_level: f64,
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
pub struct RankedNode {
    pub location_id: String,
    pub game_mode: String,
    pub cost: f64,
    pub efficiency: f64,
    pub projected_yield: f64,
    pub synergy_multiplier: f64,
    pub friction_penalty: f64,
    pub kpm: f64,
    pub matched_items: Vec<MatchedItem>,
    pub warnings: Vec<String>,
    pub friction_applied: bool,
    pub max_enemy_level: f64,
}
