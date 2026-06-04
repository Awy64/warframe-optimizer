use crate::constants::{EXPERT_SKILL_GATE, OMNIAC_COST_MULT};

pub fn apply_omnia_cost_multiplier(
    cost: f64,
    skill: f64,
    node_has_omnia_tag: bool,
    objective_has_prime_component: bool,
) -> f64 {
    if skill >= EXPERT_SKILL_GATE as f64 && node_has_omnia_tag && objective_has_prime_component {
        cost * OMNIAC_COST_MULT as f64
    } else {
        cost
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn halves_cost_for_expert_prime_omnia() {
        assert_eq!(apply_omnia_cost_multiplier(10.0, 0.8, true, true), 5.0);
    }

    #[test]
    fn no_halving_for_low_skill() {
        assert_eq!(apply_omnia_cost_multiplier(10.0, 0.5, true, true), 10.0);
    }
}
