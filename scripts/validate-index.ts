import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const PUBLIC = join(import.meta.dirname, '..', 'public')

function assertNoNullLiterals(label: string, raw: string) {
  if (raw.includes(':null')) {
    throw new Error(`${label} contains null literals`)
  }
}

function walkNumbers(label: string, value: unknown, path = label): void {
  if (value == null) {
    throw new Error(`${path}: unexpected null`)
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error(`${path}: non-finite number ${value}`)
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkNumbers(label, entry, `${path}[${index}]`))
    return
  }
  if (typeof value === 'object') {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      walkNumbers(label, entry, `${path}.${key}`)
    }
  }
}

for (const file of ['item_index.json', 'node_levels.json']) {
  const path = join(PUBLIC, file)
  const raw = readFileSync(path, 'utf8')
  assertNoNullLiterals(file, raw)
  walkNumbers(file, JSON.parse(raw))
}

const version = readFileSync(join(PUBLIC, 'data_version.txt'), 'utf8').trim()
if (!/^[a-f0-9]{12}$/.test(version)) {
  throw new Error(`data_version.txt has invalid version: ${version}`)
}

const nodeLevels = JSON.parse(readFileSync(join(PUBLIC, 'node_levels.json'), 'utf8')) as {
  nodes: Record<string, { gameMode: string }>
}
const itemIndex = JSON.parse(readFileSync(join(PUBLIC, 'item_index.json'), 'utf8')) as {
  items: Record<string, Array<{ locationId: string; gameMode: string; dropType?: string; tags?: string[] }>>
}

const EXPECTED_NODE_GAME_MODES: Record<string, string> = {
  'Earth - Cervantes': 'Sabotage',
  'Deimos - Formido': 'Sabotage',
  'Mars - Gradivus': 'Sabotage',
  'Jupiter - Callisto': 'Interception',
  'Earth - Gaia': 'Interception',
  'Earth - Cervantes (Caches)': 'Caches',
  'Venus - Vesper Relay': "Follie's Hunt",
}

for (const [locationId, expected] of Object.entries(EXPECTED_NODE_GAME_MODES)) {
  const actual = nodeLevels.nodes[locationId]?.gameMode
  if (actual !== expected) {
    throw new Error(`${locationId}: expected gameMode "${expected}", got "${actual ?? 'missing'}"`)
  }
}

const cervantesNeurodes = itemIndex.items.Neurodes?.find(
  (s) => s.locationId === 'Earth - Cervantes' && s.tags?.includes('planetary-heuristic'),
)
if (!cervantesNeurodes) {
  throw new Error('Neurodes planetary heuristic missing for Earth - Cervantes')
}
if (cervantesNeurodes.gameMode !== 'Sabotage') {
  throw new Error(
    `Neurodes at Earth - Cervantes: expected gameMode "Sabotage", got "${cervantesNeurodes.gameMode}"`,
  )
}

for (const locationId of Object.keys(nodeLevels.nodes)) {
  if (locationId.includes('(Extra)')) {
    throw new Error(`Phantom (Extra) node survived build: ${locationId}`)
  }
}

for (const sources of Object.values(itemIndex.items)) {
  for (const source of sources) {
    if (source.locationId.includes('(Extra)')) {
      throw new Error(`Phantom (Extra) drop row survived build: ${source.locationId}`)
    }
  }
}

const atramentumSources = itemIndex.items.Atramentum ?? []
const vesperAtramentum = atramentumSources.filter((s) => s.locationId.includes('Vesper Relay'))
if (vesperAtramentum.length !== 1) {
  throw new Error(
    `Atramentum at Vesper Relay: expected exactly 1 synthetic source, got ${vesperAtramentum.length}`,
  )
}
const synthetic = vesperAtramentum[0] as {
  dropType: string
  tags?: string[]
  gameMode: string
}
if (synthetic.dropType !== 'MapContainer') {
  throw new Error(`Atramentum Vesper Relay: expected MapContainer, got ${synthetic.dropType}`)
}
if (!synthetic.tags?.includes('update42-heuristic')) {
  throw new Error('Atramentum Vesper Relay: missing update42-heuristic tag')
}
if (synthetic.gameMode !== "Follie's Hunt") {
  throw new Error(`Atramentum Vesper Relay: expected Follie's Hunt, got ${synthetic.gameMode}`)
}
if (atramentumSources.some((s) => s.locationId.includes('Vesper Relay') && (s as { dropType: string }).dropType === 'MissionReward')) {
  throw new Error('Atramentum Vesper Relay: native MissionReward row survived strip')
}

const virtualEnemyNodes = Object.keys(nodeLevels.nodes).filter((id) => id.startsWith('Enemy - '))
if (virtualEnemyNodes.length === 0) {
  throw new Error('No Enemy - virtual entity nodes in node_levels — UI toggle regression')
}

// --- Currency taxonomy invariants ---
const CURRENCY_EXPECTED_TAG: Record<string, string> = {
  Endo: 'currency-endo',
  Credits: 'currency-credits',
  'Void Traces': 'currency-traces',
  Kuva: 'currency-kuva',
}
for (const [item, tag] of Object.entries(CURRENCY_EXPECTED_TAG)) {
  const sources = itemIndex.items[item] ?? []
  if (sources.length === 0) throw new Error(`Currency invariant: no sources for ${item}`)
  const untagged = sources.filter((s) => !(s.tags ?? []).some((t) => t.startsWith('currency-')))
  if (untagged.length > 0) {
    throw new Error(
      `Currency invariant: ${item} has ${untagged.length} untagged source(s) (e.g. ${untagged[0].locationId})`,
    )
  }
  const wrongClass = sources.filter((s) => !(s.tags ?? []).includes(tag))
  if (wrongClass.length > 0) {
    throw new Error(
      `Currency invariant: ${item} has source(s) missing ${tag} (e.g. ${wrongClass[0].locationId})`,
    )
  }
}

const endoVodyanoi = (itemIndex.items.Endo ?? []).find((s) => s.locationId === 'Sedna - Vodyanoi')
if (!endoVodyanoi || !(endoVodyanoi.tags ?? []).includes('loot-scalable')) {
  throw new Error('Currency invariant: Vodyanoi Endo arena missing or not loot-scalable')
}

// --- Structured / guaranteed drop invariants ---
const netracell = (itemIndex.items['Entrati Lanthorn'] ?? []).find(
  (s) => s.locationId === 'Deimos - Netracell' && (s.tags ?? []).includes('guaranteed-drop'),
)
if (!netracell) {
  throw new Error('Structured invariant: Entrati Lanthorn Netracell guaranteed-drop source missing')
}

// --- Höllvania invariants ---
const motherboardBounty = (itemIndex.items['Techrot Motherboard'] ?? []).find(
  (s) => s.locationId.includes('Central Mall Bounty') && s.dropType === 'BountyReward',
)
if (!motherboardBounty) {
  throw new Error('Höllvania invariant: Techrot Motherboard L115-120 bounty source missing')
}
const hollvaniaNodes = Object.values(nodeLevels.nodes).filter((n) => (n as { planet?: string }).planet === 'Höllvania')
const untaggedHollvania = hollvaniaNodes.filter(
  (n) => !((n as { tags?: string[] }).tags ?? []).includes('hollvania'),
)
if (hollvaniaNodes.length === 0 || untaggedHollvania.length > 0) {
  throw new Error(
    `Höllvania invariant: ${untaggedHollvania.length}/${hollvaniaNodes.length} Höllvania nodes missing the hollvania tag`,
  )
}

console.log(`Validated index files (data version ${version})`)
