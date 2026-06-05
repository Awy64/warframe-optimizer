import type { DropSource } from './types.js'
import { canonicalEnemyLocationId } from './merge-sources.js'
import { resolveTimeGateMinutes } from './telemetry.js'
import { buildDropSource } from './sanitize.js'

export function buildEnemyDropSource(
  enemyName: string,
  fields: {
    locationId?: string
    gameMode: string
    rotation: string
    baseChance: unknown
    tadr?: number
    tags?: string[]
  },
): DropSource | null {
  const locationId = canonicalEnemyLocationId(
    enemyName,
    fields.locationId ?? `Enemy - ${enemyName}`,
  )
  const timeGateMinutes = resolveTimeGateMinutes(enemyName, locationId)

  return buildDropSource({
    locationId,
    dropType: 'EnemyDrop',
    gameMode: fields.gameMode,
    rotation: fields.rotation,
    baseChance: fields.baseChance,
    tadr: fields.tadr,
    tags: fields.tags,
    timeGateMinutes,
  })
}
