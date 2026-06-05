import type { DropSource } from './types.js'
import { buildDropSource } from './sanitize.js'

export interface ManualDropEntry {
  itemName: string
  locationId: string
  dropType: DropSource['dropType']
  gameMode: string
  rotation: string
  baseChance: number
  tadr?: number
  timeGateMinutes?: number
  tags?: string[]
}

export function ingestManualDrops(
  entries: ManualDropEntry[],
  addEntry: (index: Record<string, DropSource[]>, itemName: string, source: DropSource | null) => void,
  index: Record<string, DropSource[]>,
): number {
  let count = 0
  for (const entry of entries) {
    const source = buildDropSource({
      locationId: entry.locationId,
      dropType: entry.dropType,
      gameMode: entry.gameMode,
      rotation: entry.rotation,
      baseChance: entry.baseChance,
      tadr: entry.tadr,
      timeGateMinutes: entry.timeGateMinutes,
      tags: entry.tags,
    })
    if (!source) continue
    addEntry(index, entry.itemName, source)
    count++
  }
  return count
}
