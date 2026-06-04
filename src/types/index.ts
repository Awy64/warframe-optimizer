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
  tags?: string[]
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
  cost: number
  efficiency: number
  projectedYield: number
  synergyMultiplier: number
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
}
