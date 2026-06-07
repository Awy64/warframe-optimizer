import type { DropSource } from './types.js'
import { gameModeForMissionIndex } from './game-mode.js'
import { locationId } from './normalize.js'
import { buildDropSource } from './sanitize.js'

export type PlanetaryRarity = 'Common' | 'Uncommon' | 'Rare' | 'Legendary'

export interface PlanetaryEngineConfig {
  enemyResourceDropChance: number
  rarityWeights: Record<PlanetaryRarity, number>
}

export interface RegionResourceEntry {
  itemName: string
  rarity: PlanetaryRarity
}

export type RegionResourceTable = Record<string, RegionResourceEntry[]>

export interface WfcdNodeWithMission {
  name: string
  systemName: string
  missionIndex: number
  minEnemyLevel?: number
  maxEnemyLevel?: number
}

/** Mission types where standard enemies roll planetary resource tables. */
const FARM_MISSION_INDICES = new Set([1, 2, 4, 8, 9, 13, 17])

const WARFRAMESTAT_ITEMS_URL = 'https://api.warframestat.us/items'

/** Drop chance as a percentage (e.g. 0.09 for 0.09%). */
export function planetaryDropChancePercent(
  rarity: PlanetaryRarity,
  config: PlanetaryEngineConfig,
): number {
  const weight = config.rarityWeights[rarity] ?? config.rarityWeights.Uncommon
  return config.enemyResourceDropChance * weight * 100
}

export async function fetchItemRarityOverrides(): Promise<Map<string, PlanetaryRarity>> {
  const overrides = new Map<string, PlanetaryRarity>()
  try {
    const res = await fetch(WARFRAMESTAT_ITEMS_URL)
    if (!res.ok) return overrides
    const targetCategories = new Set(['Misc', 'Resources', 'Components'])
    const items = (await res.json()) as Array<{ name?: string; rarity?: string; category?: string; type?: string }>
    for (const item of items) {
      if (!item.name || !item.rarity) continue
      const indexed =
        targetCategories.has(item.category ?? '') ||
        item.type === 'Resource' ||
        item.name.includes('Prime')
      if (!indexed) continue
      if (item.rarity in { Common: 1, Uncommon: 1, Rare: 1, Legendary: 1 }) {
        overrides.set(item.name, item.rarity as PlanetaryRarity)
      }
    }
  } catch {
    // Optional enrichment — region table rarities are the primary source.
  }
  return overrides
}

export function injectPlanetaryEnemyDrops(
  index: Record<string, DropSource[]>,
  wfcdNodes: WfcdNodeWithMission[],
  regionTable: RegionResourceTable,
  config: PlanetaryEngineConfig,
  rarityOverrides: Map<string, PlanetaryRarity>,
  addEntry: (idx: Record<string, DropSource[]>, itemName: string, source: DropSource | null) => void,
): number {
  let injected = 0

  for (const node of wfcdNodes) {
    if (!FARM_MISSION_INDICES.has(node.missionIndex)) continue

    const planetResources = regionTable[node.systemName]
    if (!planetResources?.length) continue

    const locId = locationId(node.systemName, node.name)
    const gameMode = gameModeForMissionIndex(node.missionIndex)

    for (const entry of planetResources) {
      const rarity = rarityOverrides.get(entry.itemName) ?? entry.rarity
      const baseChance = planetaryDropChancePercent(rarity, config)

      const source = buildDropSource({
        locationId: locId,
        dropType: 'EnemyDrop',
        gameMode,
        rotation: 'A',
        baseChance,
        tags: ['planetary-heuristic'],
      })

      if (!source) continue
      addEntry(index, entry.itemName, source)
      injected++
    }
  }

  return injected
}
