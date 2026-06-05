export type DropType =
  | 'MissionReward'
  | 'BountyReward'
  | 'EnemyDrop'
  | 'ModLocation'
  | 'Syndicate'
  | 'Transient'
  | 'Blueprint'
  | 'Key'
  | 'Sortie'

export interface DropSource {
  locationId: string
  dropType: DropType
  gameMode: string
  rotation: string
  baseChance: number
  tadr: number
  timeGateMinutes?: number
  tags?: string[]
  spawnIntervalMinutes?: number
  dropYield?: number
}

export type SkillTier = 'baseline' | 'intermediate' | 'expert'

export interface NodeMeta {
  locationId: string
  planet: string
  nodeName: string
  gameMode: string
  minEnemyLevel: number
  maxEnemyLevel: number
  mNode: number
  skillTier: SkillTier
  tags: string[]
}

export interface ItemIndex {
  items: Record<string, DropSource[]>
  itemNames: string[]
}

export interface NodeLevelsFile {
  nodes: Record<string, NodeMeta>
}

export interface Objective {
  itemName: string
  targetQuantity: number
}

export interface ArsenalState {
  hasIvara: boolean
  hasAtlas: boolean
  hasKhora: boolean
  hasHydroid: boolean
  hasNekros: boolean
  hasHighSlash: boolean
  hasVinquibus: boolean
  dropChanceBoosterActive: boolean
  resourceBoosterActive: boolean
  hasZarimanUnlocked: boolean
  steelPathActive: boolean
}

export interface PrapaEngineResult {
  rankedNodes: RankedNode[]
  pathingFailures: string[]
}

export interface MatchedItem {
  itemName: string
  tadr: number
  targetQuantity: number
  yItem: number
}

export interface RankedNode {
  locationId: string
  gameMode: string
  /** Final ETC in minutes (includes friction and edge-case multipliers). Lower is better. */
  cost: number
  /** Pre-friction estimated time to completion in minutes. */
  etcMinutes: number
  frictionPenalty: number
  kpm: number
  matchedItems: MatchedItem[]
  warnings: string[]
  frictionApplied: boolean
  maxEnemyLevel: number
}

export const DEFAULT_ARSENAL: ArsenalState = {
  hasIvara: false,
  hasAtlas: false,
  hasKhora: false,
  hasHydroid: false,
  hasNekros: false,
  hasHighSlash: false,
  hasVinquibus: false,
  dropChanceBoosterActive: false,
  resourceBoosterActive: false,
  hasZarimanUnlocked: true,
  steelPathActive: false,
}
