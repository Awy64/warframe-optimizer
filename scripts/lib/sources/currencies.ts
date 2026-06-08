import type { DropSource } from '../types.js'
import { buildDropSource } from '../sanitize.js'

export interface CurrencySourceEntry {
  itemName: string
  locationId: string
  dropType: DropSource['dropType']
  gameMode: string
  /** Expected units/min PRE-booster and PRE-loot. */
  tadr: number
  tags?: string[]
  sourceEntity?: string
}

export interface CurrencySourceConfig {
  sources: CurrencySourceEntry[]
}

/**
 * Ingest hand-authored currency hero-farm sources (Endo / Credits / Void Traces / Kuva).
 * These store expected units/min directly in `tadr`; the WASM engine routes them through
 * the correct booster taxonomy via their `currency-*` tag.
 */
export function ingestCurrencySources(
  config: CurrencySourceConfig,
  addEntry: (index: Record<string, DropSource[]>, itemName: string, source: DropSource | null) => void,
  index: Record<string, DropSource[]>,
): number {
  let count = 0
  for (const entry of config.sources ?? []) {
    const source = buildDropSource({
      locationId: entry.locationId,
      dropType: entry.dropType,
      gameMode: entry.gameMode,
      rotation: 'A',
      baseChance: 100,
      tadr: entry.tadr,
      tags: entry.tags,
      sourceEntity: entry.sourceEntity,
    })
    if (!source) continue
    addEntry(index, entry.itemName, source)
    count++
  }
  return count
}
