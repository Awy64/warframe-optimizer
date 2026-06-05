import type { DropSource } from '../types.js'
import { buildDropSource } from '../sanitize.js'

interface TransientReward {
  rotation?: string
  itemName: string
  chance: number
}

interface TransientEntry {
  objectiveName: string
  rewards: TransientReward[]
}

/** Map WFCD transient objective names to canonical mission location IDs. */
export function ingestTransientRewards(
  data: unknown,
  locationMap: Record<string, string>,
  addEntry: (index: Record<string, DropSource[]>, itemName: string, source: DropSource | null) => void,
  index: Record<string, DropSource[]>,
): number {
  const root = data as { transientRewards?: TransientEntry[] }
  let count = 0

  for (const entry of root.transientRewards ?? []) {
    const locId = locationMap[entry.objectiveName]
    if (!locId) continue

    for (const reward of entry.rewards ?? []) {
      const source = buildDropSource({
        locationId: locId,
        dropType: 'Transient',
        gameMode: 'Transient',
        rotation: reward.rotation ?? 'A',
        baseChance: reward.chance,
      })
      if (!source) continue
      addEntry(index, reward.itemName, source)
      count++
    }
  }

  return count
}
