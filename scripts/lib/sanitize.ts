import type { DropSource } from './types.js'
import { computeTadr } from './tadr.js'

export function coerceChance(value: unknown): number | null {
  if (value == null) return null
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

export function buildDropSource(
  fields: Omit<DropSource, 'baseChance' | 'tadr'> & { baseChance: unknown; tadr?: number },
): DropSource | null {
  const baseChance = coerceChance(fields.baseChance)
  if (baseChance === null) return null
  const tadr = fields.tadr ?? computeTadr(baseChance, fields.gameMode, fields.rotation)
  return {
    ...fields,
    baseChance,
    tadr,
  }
}

export function validateIndex(index: Record<string, DropSource[]>): void {
  for (const [itemName, sources] of Object.entries(index)) {
    for (const source of sources) {
      if (source.baseChance == null || source.tadr == null) {
        throw new Error(`Invalid drop source for ${itemName} at ${source.locationId}: null numeric field`)
      }
      if (!Number.isFinite(source.baseChance) || !Number.isFinite(source.tadr)) {
        throw new Error(`Invalid drop source for ${itemName} at ${source.locationId}: non-finite numeric field`)
      }
    }
  }
}
