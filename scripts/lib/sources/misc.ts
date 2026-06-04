import type { DropSource } from '../types.js'
import { locationId, bountyLocationId } from '../normalize.js'
import { computeTadr } from '../tadr.js'

interface ModLocationEntry {
  name: string
  locations: Array<{
    name?: string
    planet?: string
    node?: string
    enemy?: string
    gameMode?: string
    rotation?: string
    chance?: number
  }>
}

export function parseModLocations(data: unknown): DropSource[] {
  const entries = data as ModLocationEntry[]
  const sources: DropSource[] = []

  for (const entry of entries) {
    for (const loc of entry.locations ?? []) {
      const chance = loc.chance ?? 0
      if (chance <= 0) continue

      let locId: string
      let gameMode = loc.gameMode ?? 'Unknown'

      if (loc.planet && loc.node) {
        locId = locationId(loc.planet, loc.node)
      } else if (loc.enemy) {
        locId = `Enemy - ${loc.enemy}`
        gameMode = 'Enemy Drop'
      } else if (loc.name) {
        locId = loc.name
      } else {
        continue
      }

      const rotation = loc.rotation ?? 'A'
      sources.push({
        locationId: locId,
        dropType: 'ModLocation',
        gameMode,
        rotation,
        baseChance: chance,
        tadr: computeTadr(chance, gameMode, rotation),
      })
    }
  }

  return sources
}

interface ResourceByAvatar {
  source: string
  items: Array<{ item: string; chance: number }>
}

export function parseResourceByAvatar(
  data: unknown,
  enemyNodeMap: Record<string, string>,
): DropSource[] {
  const root = data as { resourceByAvatar: ResourceByAvatar[] }
  const sources: DropSource[] = []

  for (const entry of root.resourceByAvatar ?? []) {
    const mapped = enemyNodeMap[entry.source]
    const locId = mapped ?? `Enemy - ${entry.source}`
    const gameMode = mapped ? 'Survival' : 'Enemy Drop'

    for (const item of entry.items ?? []) {
      sources.push({
        locationId: locId,
        dropType: 'EnemyDrop',
        gameMode,
        rotation: 'A',
        baseChance: item.chance,
        tadr: computeTadr(item.chance, gameMode, 'A'),
      })
    }
  }

  return sources
}

interface BlueprintLocation {
  name: string
  locations: Array<{ name: string; chance?: number; rotation?: string }>
}

export function parseBlueprintLocations(data: unknown): DropSource[] {
  const entries = data as BlueprintLocation[]
  const sources: DropSource[] = []

  for (const entry of entries) {
    for (const loc of entry.locations ?? []) {
      const chance = loc.chance ?? 0
      if (chance <= 0) continue
      sources.push({
        locationId: loc.name,
        dropType: 'Blueprint',
        gameMode: 'Blueprint',
        rotation: loc.rotation ?? 'A',
        baseChance: chance,
        tadr: computeTadr(chance, 'Blueprint', loc.rotation ?? 'A'),
      })
    }
  }

  return sources
}

interface EnemyBlueprintTable {
  enemyName: string
  items: Array<{ itemName: string; chance: number }>
}

export function parseEnemyBlueprintTables(
  data: unknown,
  enemyNodeMap: Record<string, string>,
): DropSource[] {
  const tables = data as EnemyBlueprintTable[]
  const sources: DropSource[] = []

  for (const table of tables) {
    const mapped = enemyNodeMap[table.enemyName]
    const locId = mapped ?? `Enemy - ${table.enemyName}`

    for (const item of table.items ?? []) {
      sources.push({
        locationId: locId,
        dropType: 'EnemyDrop',
        gameMode: 'Enemy Drop',
        rotation: 'A',
        baseChance: item.chance,
        tadr: computeTadr(item.chance, 'Enemy Drop', 'A'),
      })
    }
  }

  return sources
}

interface SyndicateReward {
  name: string
  rewards: Array<{ itemName: string; chance: number }>
}

export function parseSyndicates(data: unknown): DropSource[] {
  const root = data as { syndicates: SyndicateReward[] }
  const sources: DropSource[] = []

  for (const syndicate of root.syndicates ?? []) {
    for (const reward of syndicate.rewards ?? []) {
      sources.push({
        locationId: `Syndicate - ${syndicate.name}`,
        dropType: 'Syndicate',
        gameMode: 'Syndicate',
        rotation: 'Full Clear',
        baseChance: reward.chance,
        tadr: reward.chance / 5,
      })
    }
  }

  return sources
}

export function parseGenericRewards(
  data: unknown,
  dropType: DropSource['dropType'],
  prefix: string,
): DropSource[] {
  const sources: DropSource[] = []

  if (Array.isArray(data)) {
    for (const entry of data as Array<{ itemName?: string; name?: string; chance: number }>) {
      const itemName = entry.itemName ?? entry.name
      if (!itemName) continue
      sources.push({
        locationId: prefix,
        dropType,
        gameMode: dropType,
        rotation: 'A',
        baseChance: entry.chance,
        tadr: entry.chance / 5,
        tags: [itemName],
      })
    }
  }

  return sources
}

export function parseZarimanRewards(data: unknown): DropSource[] {
  const root = data as Record<string, Array<{ itemName: string; chance: number; rotation?: string }>>
  const sources: DropSource[] = []

  for (const [place, rewards] of Object.entries(root)) {
    for (const reward of rewards) {
      sources.push({
        locationId: `Zariman - ${place}`,
        dropType: 'BountyReward',
        gameMode: 'Zariman',
        rotation: reward.rotation ?? 'A',
        baseChance: reward.chance,
        tadr: computeTadr(reward.chance, 'Zariman', reward.rotation ?? 'A'),
      })
    }
  }

  return sources
}

export { bountyLocationId }
