import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DropSource, ItemIndexOutput, NodeLevelsOutput, NodeMeta, SkillTier, WfcdNode } from './lib/types.js'
import { parseBountyTier } from './lib/bounty-ev.js'
import { buildEnemyDropSource } from './lib/enemy-drops.js'
import { canonicalizeLocationId, dedupeAndMergeItemSources } from './lib/merge-sources.js'
import { locationId, normalizeItemName } from './lib/normalize.js'
import { fetchItemRarityOverrides, injectPlanetaryEnemyDrops } from './lib/planetary-drops.js'
import { applyItemAliases } from './lib/item-aliases.js'
import { ingestManualDrops } from './lib/manual-drops.js'
import { propagateDescendiaTags } from './lib/propagate-tags.js'
import { ingestRelicPrimeComponents } from './lib/sources/relics.js'
import { ingestTransientRewards } from './lib/sources/transients.js'
import { buildDropSource, validateIndex } from './lib/sanitize.js'
import enemyNodeMap from './lib/enemy-node-map.json' with { type: 'json' }
import transientLocations from './config/transient_locations.json' with { type: 'json' }
import manualDrops from './config/manual_drops.json' with { type: 'json' }
import nodeMultipliers from './config/node_multipliers.json' with { type: 'json' }
import descendiaItems from './config/descendia_items.json' with { type: 'json' }
import eximusItems from './config/eximus_items.json' with { type: 'json' }
import omniaCascadeNodes from './config/omnia_cascade_nodes.json' with { type: 'json' }
import planetaryEngine from './config/planetary_engine.json' with { type: 'json' }
import regionResourceTable from './config/region_resource_table.json' with { type: 'json' }

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PUBLIC = join(ROOT, 'public')
const WFCD_BASE = 'https://raw.githubusercontent.com/WFCD/warframe-drop-data/main/data'
const NODE_URL = 'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Node.json'

function extractBaseName(locId: string): string {
  return locId.replace(/^(Enemy|Boss) - /, '')
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  return res.json() as Promise<T>
}

function isPrimeComponent(name: string): boolean {
  if (!name.includes('Prime')) return false
  return /(Blueprint|Barrel|Receiver|Stock|Blade|Handle|Guard|Link|Chassis|Neuroptics|Systems|Harness|Cerebrum|Carapace|Wings|Pouch|Collar|Ornament)/i.test(name)
}

function inferSkillTier(nodeName: string, locId: string): SkillTier {
  const lower = nodeName.toLowerCase()
  if (lower.includes('descendia') || lower.includes('archimedea') || omniaCascadeNodes.includes(locId)) {
    return 'expert'
  }
  if (lower.includes(' arbitration') || (nodeMultipliers as Record<string, number>)[locId]) {
    return 'intermediate'
  }
  return 'baseline'
}

function inferTags(nodeName: string, planet: string, locId: string): string[] {
  const tags: string[] = []
  const lower = nodeName.toLowerCase()
  if (
    lower.includes('descendia') ||
    locId.includes('Dark Refractory') ||
    locId.includes('Recall:')
  ) {
    tags.push('descendia')
  }
  if (omniaCascadeNodes.includes(locId)) tags.push('omnia-cascade')
  if (lower.includes('hollvania') || planet.toLowerCase().includes('hollvania')) tags.push('hollvania')
  if (planet === 'Zariman' || locId.includes('Zariman')) tags.push('requires-zariman')
  if ((nodeMultipliers as Record<string, number>)[locId]) tags.push('dark-sector')
  return tags
}

function tagSource(source: DropSource, itemName: string): DropSource {
  const tags: string[] = [...(source.tags ?? [])]
  if ((descendiaItems as string[]).includes(itemName)) tags.push('descendia-exclusive')
  if ((eximusItems as string[]).includes(itemName)) tags.push('eximus-loot')
  if (isPrimeComponent(itemName)) tags.push('prime-component')
  if (source.locationId.includes('Zariman')) tags.push('requires-zariman')

  if (itemName === 'Argon Crystal' || itemName === 'Entrati Lanthorn' || itemName.includes('Voidplume')) {
    tags.push('search-resource')
  }
  if (source.locationId.toLowerCase().includes('caches')) {
    tags.push('caches')
  }

  return tags.length ? { ...source, tags } : source
}

const ACOLYTE_ENEMIES = new Set([
  'Misery',
  'Angst',
  'Torment',
  'Violence',
  'Malice',
  'Miseria',
  'Odium',
  'Pavor',
])

function tagSteelPathSources(index: Record<string, DropSource[]>): void {
  const sources = index['Steel Essence']
  if (!sources) return
  for (const source of sources) {
    const enemy = source.locationId.replace(/^Enemy - /, '')
    if (!ACOLYTE_ENEMIES.has(enemy)) continue
    source.tags = [...(source.tags ?? []), 'interval-spawn', 'steel-path']
    source.spawnIntervalMinutes = 6
    source.dropYield = 2
  }
}

function addEntry(index: Record<string, DropSource[]>, itemName: string, source: DropSource | null) {
  if (!source) return
  const canonical = normalizeItemName(itemName)
  if (!index[canonical]) index[canonical] = []
  index[canonical].push(tagSource(source, canonical))
}

const MISSION_INDEX_TO_GAME_MODE: Record<number, string> = {
  0: 'Assassination',
  1: 'Exterminate',
  2: 'Survival',
  3: 'Rescue',
  4: 'Interception',
  5: 'Sabotage',
  7: 'Capture',
  8: 'Defense',
  9: 'Mobile Defense',
  13: 'Sabotage',
  17: 'Excavation',
}

function gameModeForNode(node: WfcdNode): string {
  if (node.missionIndex != null && node.missionIndex in MISSION_INDEX_TO_GAME_MODE) {
    return MISSION_INDEX_TO_GAME_MODE[node.missionIndex]
  }
  return 'Mission'
}

function buildNodeLevels(wfcdNodes: WfcdNode[]): NodeLevelsOutput {
  const nodes: Record<string, NodeMeta> = {}

  for (const node of wfcdNodes) {
    const locId = locationId(node.systemName, node.name)
    nodes[locId] = {
      locationId: locId,
      planet: node.systemName,
      nodeName: node.name,
      gameMode: gameModeForNode(node),
      minEnemyLevel: node.minEnemyLevel ?? 1,
      maxEnemyLevel: node.maxEnemyLevel ?? 30,
      mNode: (nodeMultipliers as Record<string, number>)[locId] ?? 1.0,
      skillTier: inferSkillTier(node.name, locId),
      tags: inferTags(node.name, node.systemName, locId),
    }
  }

  for (const locId of omniaCascadeNodes) {
    const [planet, ...rest] = locId.split(' - ')
    nodes[locId] = {
      locationId: locId,
      planet,
      nodeName: rest.join(' - '),
      gameMode: 'Void Cascade',
      minEnemyLevel: 50,
      maxEnemyLevel: 70,
      mNode: 1.0,
      skillTier: 'expert',
      tags: ['omnia-cascade'],
    }
  }

  nodes['Descendia - Dark Refractory'] = {
    locationId: 'Descendia - Dark Refractory',
    planet: 'Descendia',
    nodeName: 'Dark Refractory',
    gameMode: 'Survival',
    minEnemyLevel: 60,
    maxEnemyLevel: 80,
    mNode: 1.0,
    skillTier: 'expert',
    tags: ['descendia'],
  }

  return { nodes }
}

function ensureNodeMeta(nodes: Record<string, NodeMeta>, source: DropSource) {
  if (nodes[source.locationId]) return
  const [planet, ...rest] = source.locationId.split(' - ')
  const nodeName = rest.join(' - ')
  nodes[source.locationId] = {
    locationId: source.locationId,
    planet: planet ?? 'Unknown',
    nodeName,
    gameMode: source.gameMode,
    minEnemyLevel: 1,
    maxEnemyLevel: 30,
    mNode: (nodeMultipliers as Record<string, number>)[source.locationId] ?? 1.0,
    skillTier: inferSkillTier(nodeName, source.locationId),
    tags: inferTags(nodeName, planet ?? '', source.locationId),
  }
}

async function main() {
  console.log('Fetching WFCD data...')
  const [
    missionRewards,
    cetusBounty,
    solarisBounty,
    deimosRewards,
    hexRewards,
    entratiLab,
    zarimanRewards,
    modLocations,
    resourceByAvatar,
    enemyBlueprintTables,
    blueprintLocations,
    syndicates,
    miscItems,
    transientRewards,
    relics,
    wfcdNodes,
  ] = await Promise.all([
    fetchJson(`${WFCD_BASE}/missionRewards.json`),
    fetchJson(`${WFCD_BASE}/cetusBountyRewards.json`),
    fetchJson(`${WFCD_BASE}/solarisBountyRewards.json`),
    fetchJson(`${WFCD_BASE}/deimosRewards.json`),
    fetchJson(`${WFCD_BASE}/hexRewards.json`),
    fetchJson(`${WFCD_BASE}/entratiLabRewards.json`),
    fetchJson(`${WFCD_BASE}/zarimanRewards.json`),
    fetchJson(`${WFCD_BASE}/modLocations.json`),
    fetchJson(`${WFCD_BASE}/resourceByAvatar.json`),
    fetchJson(`${WFCD_BASE}/enemyBlueprintTables.json`),
    fetchJson(`${WFCD_BASE}/blueprintLocations.json`),
    fetchJson(`${WFCD_BASE}/syndicates.json`),
    fetchJson(`${WFCD_BASE}/miscItems.json`),
    fetchJson(`${WFCD_BASE}/transientRewards.json`),
    fetchJson(`${WFCD_BASE}/relics.json`),
    fetchJson<WfcdNode[]>(NODE_URL),
  ])

  const index: Record<string, DropSource[]> = {}

  const missionRoot = missionRewards as {
    missionRewards: Record<string, Record<string, { gameMode: string; isEvent?: boolean; rewards: Record<string, { itemName: string; chance: number }[]> }>>
  }
  for (const [planet, nodes] of Object.entries(missionRoot.missionRewards ?? {})) {
    for (const [nodeName, node] of Object.entries(nodes)) {
      if (node.isEvent) continue
      for (const [rotation, rewards] of Object.entries(node.rewards ?? {})) {
        if (!Array.isArray(rewards)) continue
        for (const reward of rewards) {
          addEntry(index, reward.itemName, buildDropSource({
            locationId: locationId(planet, nodeName),
            dropType: 'MissionReward',
            gameMode: node.gameMode,
            rotation,
            baseChance: reward.chance,
          }))
        }
      }
    }
  }

  const bountyRegions: Array<[string, unknown, string]> = [
    ['Cetus', cetusBounty, 'cetusBountyRewards'],
    ['Fortuna', solarisBounty, 'solarisBountyRewards'],
    ['Deimos', deimosRewards, 'deimosRewards'],
    ['Hex', hexRewards, 'hexBountyRewards'],
    ['Entrati Lab', entratiLab, 'entratiLabRewards'],
    ['Zariman', zarimanRewards, 'zarimanRewards'],
  ]

  for (const [region, data, key] of bountyRegions) {
    const tiers = (data as Record<string, Array<{ bountyLevel: string; rewards: Record<string, { itemName: string }[]> }>>)[key] ?? []
    for (const tier of tiers) {
      for (const { itemName, source } of parseBountyTier(region, tier)) {
        const tagged =
          region === 'Zariman'
            ? { ...source, tags: [...(source.tags ?? []), 'requires-zariman'] }
            : source
        addEntry(index, itemName, tagged)
      }
    }
  }

  for (const entry of (modLocations as { modLocations: Array<{ modName: string; enemies: Array<{ enemyName: string; chance: number }> }> }).modLocations ?? []) {
    for (const enemy of entry.enemies ?? []) {
      if (!enemy.chance) continue
      const locId = canonicalizeLocationId(
        (enemyNodeMap as Record<string, string>)[enemy.enemyName] ?? `Enemy - ${enemy.enemyName}`,
      )
      addEntry(index, entry.modName, buildDropSource({
        locationId: locId,
        dropType: 'ModLocation',
        gameMode: 'Enemy Drop',
        rotation: 'A',
        baseChance: enemy.chance,
      }))
    }
  }

  for (const entry of (resourceByAvatar as { resourceByAvatar: Array<{ source: string; items: { item: string; chance: number }[] }> }).resourceByAvatar) {
    const locId = (enemyNodeMap as Record<string, string>)[entry.source] ?? `Enemy - ${entry.source}`
    for (const item of entry.items) {
      addEntry(index, item.item, buildEnemyDropSource(entry.source, {
        locationId: locId,
        gameMode: 'Enemy Drop',
        rotation: 'A',
        baseChance: item.chance,
      }))
    }
  }

  for (const table of (enemyBlueprintTables as { enemyBlueprintTables: Array<{ enemyName: string; items: { itemName: string; chance: number }[] }> }).enemyBlueprintTables ?? []) {
    const locId = (enemyNodeMap as Record<string, string>)[table.enemyName] ?? `Enemy - ${table.enemyName}`
    for (const item of table.items ?? []) {
      addEntry(index, item.itemName, buildEnemyDropSource(table.enemyName, {
        locationId: locId,
        gameMode: 'Enemy Drop',
        rotation: 'A',
        baseChance: item.chance,
      }))
    }
  }

  for (const entry of (blueprintLocations as { blueprintLocations: Array<{ itemName: string; enemies: Array<{ enemyName: string; chance: number }> }> }).blueprintLocations ?? []) {
    for (const enemy of entry.enemies ?? []) {
      if (!enemy.chance) continue
      const locId = canonicalizeLocationId(
        (enemyNodeMap as Record<string, string>)[enemy.enemyName] ?? `Enemy - ${enemy.enemyName}`,
      )
      addEntry(index, entry.itemName, buildDropSource({
        locationId: locId,
        dropType: 'Blueprint',
        gameMode: 'Enemy Drop',
        rotation: 'A',
        baseChance: enemy.chance,
      }))
    }
  }

  const syndicateRoot = syndicates as { syndicates: Record<string, Array<{ item: string; chance: number }>> }
  for (const [name, rewards] of Object.entries(syndicateRoot.syndicates ?? {})) {
    for (const reward of rewards) {
      addEntry(index, reward.item, buildDropSource({
        locationId: `Syndicate - ${name}`,
        dropType: 'Syndicate',
        gameMode: 'Syndicate',
        rotation: 'Full Clear',
        baseChance: reward.chance,
      }))
    }
  }

  for (const entry of (miscItems as { miscItems: Array<{ enemyName: string; items: { itemName: string; chance: number }[] }> }).miscItems ?? []) {
    const locId = (enemyNodeMap as Record<string, string>)[entry.enemyName] ?? `Boss - ${entry.enemyName}`
    for (const item of entry.items ?? []) {
      addEntry(index, item.itemName, buildEnemyDropSource(entry.enemyName, {
        locationId: locId,
        gameMode: 'Boss',
        rotation: 'A',
        baseChance: item.chance,
      }))
    }
  }

  const rarityOverrides = await fetchItemRarityOverrides()
  const planetaryInjected = injectPlanetaryEnemyDrops(
    index,
    wfcdNodes,
    regionResourceTable,
    planetaryEngine,
    rarityOverrides,
    addEntry,
  )
  console.log(`Injected ${planetaryInjected} planetary heuristic enemy drops`)

  const transientInjected = ingestTransientRewards(
    transientRewards,
    transientLocations as Record<string, string>,
    addEntry,
    index,
  )
  console.log(`Indexed ${transientInjected} transient reward rows`)

  const relicInjected = ingestRelicPrimeComponents(
    relics,
    omniaCascadeNodes as string[],
    isPrimeComponent,
    addEntry,
    index,
  )
  console.log(`Indexed ${relicInjected} Omnia cascade prime-component rows from relics`)

  const aliasCount = applyItemAliases(index)
  if (aliasCount > 0) console.log(`Applied ${aliasCount} item name alias(es)`)

  const manualCount = ingestManualDrops(manualDrops as import('./lib/manual-drops.js').ManualDropEntry[], addEntry, index)
  console.log(`Indexed ${manualCount} manual drop row(s)`)

  tagSteelPathSources(index)

  const ENEMY_SPAWN_MAPPINGS: Record<string, string[]> = {
    'Oxium Osprey': ['Jupiter - Io', 'Pluto - Outer Terminus'],
    'Vapos Oxium Osprey': ['Jupiter - Io'],
    'Juno Oxium Osprey': ['Pluto - Outer Terminus'],
    'Carabus': ['Sedna - Hydron', 'Saturn - Helene'],
    'Nemes': ['Jupiter - Io'],
    'Narmer Oxium Osprey': ['Fortuna Bounty - Level 40 - 60 Orb Vallis Bounty'],

    'Corrupted Vor': ['Void - Mot'],
    'Ambulas': ['Pluto - Hades'],
    'Kela De Thaym': ['Sedna - Merrow'],
    'General Sargas Ruk': ['Saturn - Tethys'],
    'Tyl Regor': ['Uranus - Titania'],
    'Jackal': ['Venus - Fossa'],
    'Lephantis': ['Deimos - Magnacidium'],
  }

  const IGNORED_ENTITIES = new Set([
    'Misery', 'Angst', 'Torment', 'Malice', 'Violence', 'Mania', // Acolytes
    'Stalker', 'Shadow Stalker', 'Protector Stalker', // Assassins
    'Zanuka Hunter', 'The Grustrag Three' // Death Squads
  ])

  const successfullyMappedEnemies = new Set<string>()

  for (const [itemName, sources] of Object.entries(index)) {
    const updatedSources: DropSource[] = []
    for (const source of sources) {
      const enemyName = source.locationId.replace(/^(Enemy|Boss) - /, '')
      if (ENEMY_SPAWN_MAPPINGS[enemyName]) {
        successfullyMappedEnemies.add(enemyName)
        for (const physicalNode of ENEMY_SPAWN_MAPPINGS[enemyName]) {
          const tags = [...(source.tags ?? [])]
          if (enemyName.includes('Vor')) tags.push('Vor')
          if (enemyName.includes('Stalker')) tags.push('Stalker')
          updatedSources.push({
            ...source,
            locationId: physicalNode,
            tags,
          })
        }
      } else {
        updatedSources.push(source)
      }
    }
    index[itemName] = updatedSources
  }

  dedupeAndMergeItemSources(index)
  validateIndex(index)
  const itemNames = Object.keys(index).sort((a, b) => a.localeCompare(b))
  const itemIndex: ItemIndexOutput = { items: index, itemNames }
  const nodeLevels = buildNodeLevels(wfcdNodes)

  for (const sources of Object.values(index)) {
    for (const s of sources) ensureNodeMeta(nodeLevels.nodes, s)
  }

  const nodes = Object.values(nodeLevels.nodes)
  for (const node of nodes) {
    if (node.gameMode === 'Bounty' || node.locationId.includes('Bounty')) {
      // Extract the highest level from strings like "Level 40 - 60" or "Level 100 - 100"
      const levelMatch = node.locationId.match(/Level\s+\d+\s*-\s*(\d+)/i)

      if (levelMatch && levelMatch[1]) {
        node.maxEnemyLevel = parseInt(levelMatch[1], 10)
      }
    }
  }

  const finalNodes = nodes.filter((node) => {
    if (node.locationId.startsWith('Enemy - ') || node.locationId.startsWith('Boss - ')) {
      const baseName = extractBaseName(node.locationId)
      if (successfullyMappedEnemies.has(baseName) || IGNORED_ENTITIES.has(baseName)) {
        // Successfully mapped OR intentionally ignored dynamic invader. Delete it quietly.
        return false
      } else {
        // Unmapped entity that isn't on the ignore list. Trip the alarm!
        console.warn(`[PRAPA MAINTENANCE ALERT] Unmapped Entity detected: "${baseName}".`)
        return true
      }
    }
    return true
  })

  const finalNodesRecord: Record<string, NodeMeta> = {}
  for (const node of finalNodes) {
    finalNodesRecord[node.locationId] = node
  }
  nodeLevels.nodes = finalNodesRecord

  propagateDescendiaTags(nodeLevels.nodes)

  mkdirSync(PUBLIC, { recursive: true })
  const itemJson = JSON.stringify(itemIndex)
  const dataVersion = createHash('sha256').update(itemJson).digest('hex').slice(0, 12)
  writeFileSync(join(PUBLIC, 'item_index.json'), itemJson)
  writeFileSync(join(PUBLIC, 'node_levels.json'), JSON.stringify(nodeLevels))
  writeFileSync(join(PUBLIC, 'data_version.txt'), `${dataVersion}\n`)
  writeFileSync(join(ROOT, 'src', 'data_version.txt'), `${dataVersion}\n`)
  console.log(`Built index: ${itemNames.length} items, ${Object.keys(nodeLevels.nodes).length} nodes`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
