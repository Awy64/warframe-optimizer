import telemetry from '../../data/telemetry.json' with { type: 'json' }

type ArchetypeKey = keyof typeof telemetry.archetypes

const DEFAULT_ARCHETYPE: ArchetypeKey = 'UNGATED_ASSASSINATION'

/** Elite/boss variants WFCD names don't enumerate exhaustively — detect at enrich time only. */
const GATED_ENEMY_KEYWORDS = [
  'Vor',
  'Ruk',
  'Kril',
  'Regor',
  'Alad V',
  'Phorid',
  'Jackal',
  'Hyena',
  'Raptor',
  'Ambulas',
  'Lephantis',
  'Golem',
  'Sergeant',
  'Kela',
  'Stalker',
  'Demolyst',
  'Amalgam',
  'Conculyst',
  'Battalyst',
  'Aerolyst',
  'Symbilyst',
  'Mimic',
  'Ortholyst',
  'Summulyst',
  'Zanuka',
  'Artificer',
] as const

export function isGatedEnemy(enemyName: string): boolean {
  return GATED_ENEMY_KEYWORDS.some((keyword) => enemyName.includes(keyword))
}

function lookupArchetype(enemyName: string): ArchetypeKey | null {
  const mappings = telemetry.bossMappings as Record<string, ArchetypeKey>
  if (mappings[enemyName]) return mappings[enemyName]

  let best: { key: string; archetype: ArchetypeKey } | null = null
  for (const [bossName, archetype] of Object.entries(mappings)) {
    if (!enemyName.includes(bossName)) continue
    if (!best || bossName.length > best.key.length) {
      best = { key: bossName, archetype }
    }
  }
  return best?.archetype ?? null
}

/** Minutes per kill for gated enemies; undefined for horde / standard fodder. */
export function resolveTimeGateMinutes(enemyName: string, locationId: string): number | undefined {
  const gated = locationId.startsWith('Boss - ') || isGatedEnemy(enemyName)
  if (!gated) return undefined

  const archetype = lookupArchetype(enemyName) ?? DEFAULT_ARCHETYPE
  return telemetry.archetypes[archetype]
}
