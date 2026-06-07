pub fn is_routable_node(location_id: &str, game_mode: &str) -> bool {
    if location_id.starts_with("Enemy - ") || location_id.starts_with("Boss - ") {
        return false;
    }
    if game_mode == "Enemy Drop" || game_mode == "Boss" {
        return false;
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_virtual_enemy_nodes() {
        assert!(!is_routable_node("Enemy - Hunhow", "Enemy Drop"));
        assert!(!is_routable_node("Enemy - Phorid", "Assassination"));
    }

    #[test]
    fn rejects_boss_prefix() {
        assert!(!is_routable_node("Boss - Lephantis", "Boss"));
    }

    #[test]
    fn accepts_physical_nodes() {
        assert!(is_routable_node("Venus - Vesper Relay", "Follie's Hunt"));
        assert!(is_routable_node("Ceres - Casta", "Survival"));
    }
}
