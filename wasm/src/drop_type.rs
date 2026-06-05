use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "PascalCase")]
pub enum DropType {
    MissionReward,
    BountyReward,
    EnemyDrop,
    ModLocation,
    Syndicate,
    Transient,
    Blueprint,
    Key,
    Sortie,
}

impl DropType {
    pub fn uses_kpm_path(self) -> bool {
        matches!(self, DropType::EnemyDrop | DropType::ModLocation | DropType::Blueprint)
    }
}
