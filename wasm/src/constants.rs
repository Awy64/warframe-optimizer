pub const KPM_BASE: f32 = 60.0;
pub const KPM_SKILL_SCALE: f32 = 80.0;
/// Rare elite / amalgam / sentient enemy drops without a telemetry time gate.
pub const ELITE_KPM: f32 = 0.5;
pub const PLANETARY_HORDE_TAG: &str = "planetary-heuristic";
pub const VINQUIBUS_WEAPON_MULT: f32 = 1.25;
pub const BOOSTER_ACTIVE: f32 = 2.0;
pub const BOOSTER_INACTIVE: f32 = 1.0;
/// Chroma's Effigy doubles the value of credit drops placed beneath it.
pub const CHROMA_EFFIGY_CREDIT_MULT: f32 = 2.0;
/// Retriever mod expected-value pickup-duplication chances (per real wiki rates).
pub const LOYAL_RETRIEVER_CHANCE: f32 = 0.13;
pub const RESOURCEFUL_RETRIEVER_CHANCE: f32 = 0.18;
pub const PROSPEROUS_RETRIEVER_CHANCE: f32 = 0.18;
/// Smeeta Charm: 40% activation chance, of which 10% of buffs spawn a rare native resource.
pub const SMEETA_CHARM_ACTIVATION: f32 = 0.40;
pub const SMEETA_RARE_NATIVE_SUBCHANCE: f32 = 0.10;
/// Approximate Charm activation cadence (procs per minute) used to size the rare-native EV.
pub const SMEETA_PROCS_PER_MINUTE: f32 = 2.2;
/// Chesa Kubrow Retrieve loot-corpse bonus (loot-corpse group, does not stack with Nekros).
pub const CHESA_RETRIEVE_BONUS: f32 = 0.54;
/// AoE container-break frames (Xaku Gaze / Limbo Cataclysm) pop more crates per run.
pub const AOE_CONTAINER_MULT: f32 = 1.5;
pub const FRICTION_COEFF: f32 = 0.05;
pub const FRICTION_EXPONENT: f32 = 1.5;
pub const COMFORT_LEVEL_SCALE: f32 = 250.0;
pub const HOLLVANIA_Y_BONUS: f32 = 2.0;
pub const OMNIAC_COST_MULT: f32 = 0.5;
pub const DESCENDIA_SKILL_WARN: f32 = 0.8;
pub const EXPERT_SKILL_GATE: f32 = 0.7;
pub const INTERMEDIATE_SKILL_GATE: f32 = 0.3;
pub const INTERVAL_SPAWN_TAG: &str = "interval-spawn";
pub const UPDATE42_HEURISTIC_TAG: &str = "update42-heuristic";
pub const ATRAMENTUM_YIELD_NORMAL: f32 = 24.0;
pub const ATRAMENTUM_YIELD_STEEL_PATH: f32 = 53.0;
pub const DEFAULT_ACOLYTE_SPAWN_MINUTES: f32 = 6.0;
pub const DEFAULT_ACOLYTE_DROP_YIELD: f32 = 2.0;

// Mission baselines
pub const SURVIVAL_ROTATION_MINUTES: f32 = 5.0;
pub const DEFENSE_CASUAL_ROTATION_MINUTES: f32 = 6.0;
pub const DEFENSE_EXPERT_ROTATION_MINUTES: f32 = 3.5;
pub const EXCAVATION_EXPERT_ROTATION_MINUTES: f32 = 1.5;
pub const DISRUPTION_EXPERT_ROTATION_MINUTES: f32 = 2.5;
pub const CAPTURE_TTX_FLOOR_MINUTES: f32 = 1.5;
pub const EXTERMINATE_TTX_FLOOR_MINUTES: f32 = 2.0;
pub const CACHES_SEARCH_FRICTION_MINUTES: f32 = 4.0;
pub const BASE_EXTRACTION_FRICTION: f32 = 1.0;

