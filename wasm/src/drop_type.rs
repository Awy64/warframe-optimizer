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
    MapContainer,
}

impl DropType {
    pub fn uses_kpm_path(self) -> bool {
        matches!(self, DropType::EnemyDrop | DropType::ModLocation | DropType::Blueprint)
    }
}

#[cfg(test)]
mod tests {
    use super::DropType;

    #[test]
    fn map_container_does_not_use_kpm_path() {
        assert!(!DropType::MapContainer.uses_kpm_path());
    }
}
