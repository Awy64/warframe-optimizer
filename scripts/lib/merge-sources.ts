import type { DropSource } from './types.js'
import { enemyNameFromLocationId } from './bosses.js'
import enemyNodeMap from './enemy-node-map.json' with { type: 'json' }

/** Collapse WFCD Boss-/Enemy- fragmentation into one stable location id. */
export function canonicalEnemyLocationId(enemyName: string, locationId?: string): string {
  const mapped = (enemyNodeMap as Record<string, string>)[enemyName]
  if (mapped) return mapped

  const extracted = locationId ? enemyNameFromLocationId(locationId) : null
  const name = extracted ?? enemyName
  return `Enemy - ${name}`
}

export function canonicalizeLocationId(locationId: string): string {
  const enemy = enemyNameFromLocationId(locationId)
  if (!enemy) return locationId
  return canonicalEnemyLocationId(enemy, locationId)
}

function sourceMergeKey(source: DropSource): string {
  const loc = canonicalizeLocationId(source.locationId)
  return `${loc}|${source.dropType}|${source.rotation}|${source.baseChance}`
}

function mergeDropSources(existing: DropSource, incoming: DropSource): DropSource {
  const locationId = canonicalizeLocationId(existing.locationId)
  const tags = [...new Set([...(existing.tags ?? []), ...(incoming.tags ?? [])])]

  return {
    ...existing,
    ...incoming,
    locationId,
    timeGateMinutes: existing.timeGateMinutes ?? incoming.timeGateMinutes,
    tags: tags.length ? tags : undefined,
    gameMode: existing.gameMode || incoming.gameMode,
  }
}

/**
 * Fuse fragmented WFCD duplicates (Boss- vs Enemy- prefixes, repeated feeds)
 * and preserve enriched telemetry fields.
 */
export function dedupeAndMergeItemSources(index: Record<string, DropSource[]>): void {
  for (const itemName of Object.keys(index)) {
    const merged = new Map<string, DropSource>()

    for (const source of index[itemName]) {
      const canonical: DropSource = {
        ...source,
        locationId: canonicalizeLocationId(source.locationId),
      }
      const key = sourceMergeKey(canonical)
      const existing = merged.get(key)

      if (!existing) {
        merged.set(key, canonical)
      } else {
        merged.set(key, mergeDropSources(existing, canonical))
      }
    }

    index[itemName] = [...merged.values()]
  }
}
