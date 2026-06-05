import type { DropSource } from '../types.js'
import { buildDropSource } from '../sanitize.js'

/** Expert Omnia Void Cascade crack rotation (minutes). */
const OMNIAC_CRACK_MINUTES = 3

interface RelicReward {
  itemName: string
  chance: number
}

interface RelicEntry {
  tier: string
  relicName: string
  state: string
  rewards: RelicReward[]
}

/**
 * Index prime components from relic tables at Omnia cascade nodes.
 * Represents expert void-crack farming rather than individual relic drop locations.
 */
export function ingestRelicPrimeComponents(
  data: unknown,
  omniaNodes: string[],
  isPrimeComponent: (name: string) => boolean,
  addEntry: (index: Record<string, DropSource[]>, itemName: string, source: DropSource | null) => void,
  index: Record<string, DropSource[]>,
): number {
  const root = data as { relics?: RelicEntry[] }
  const bestChance = new Map<string, number>()
  let count = 0

  for (const relic of root.relics ?? []) {
    for (const reward of relic.rewards ?? []) {
      if (!isPrimeComponent(reward.itemName)) continue
      const prev = bestChance.get(reward.itemName) ?? 0
      if (reward.chance > prev) {
        bestChance.set(reward.itemName, reward.chance)
      }
    }
  }

  for (const [itemName, baseChance] of bestChance) {
    for (const locId of omniaNodes) {
      const source = buildDropSource({
        locationId: locId,
        dropType: 'MissionReward',
        gameMode: 'Void Cascade',
        rotation: 'A',
        baseChance,
        tadr: baseChance / OMNIAC_CRACK_MINUTES,
      })
      if (!source) continue
      addEntry(index, itemName, source)
      count++
    }
  }

  return count
}
