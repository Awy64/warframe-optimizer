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

export interface WfcdNode {
  name: string
  systemName: string
  minEnemyLevel?: number
  maxEnemyLevel?: number
}

export interface ItemIndexOutput {
  items: Record<string, DropSource[]>
  itemNames: string[]
}

export interface NodeLevelsOutput {
  nodes: Record<string, NodeMeta>
}
