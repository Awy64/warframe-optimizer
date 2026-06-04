import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DropSource, ItemIndexOutput, NodeLevelsOutput, NodeMeta, SkillTier, WfcdNode } from './lib/types.js'
import { indexBountySources } from './lib/bounty-ev.js'
import { locationId } from './lib/normalize.js'
import { computeTadr } from './lib/tadr.js'
import enemyNodeMap from './lib/enemy-node-map.json' with { type: 'json' }
import nodeMultipliers from './config/node_multipliers.json' with { type: 'json' }
import descendiaItems from './config/descendia_items.json' with { type: 'json' }
import eximusItems from './config/eximus_items.json' with { type: 'json' }
import omniaCascadeNodes from './config/omnia_cascade_nodes.json' with { type: 'json' }
import resourceFarmOverrides from './config/resource_farm_overrides.json' with { type: 'json' }

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PUBLIC = join(ROOT, 'public')
const WFCD_BASE = 'https://raw.githubusercontent.com/WFCD/warframe-drop-data/main/data'
const NODE_URL = 'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Node.json'

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
  if (lower.includes('descendia')) tags.push('descendia')
  if (omniaCascadeNodes.includes(locId)) tags.push('omnia-cascade')
  if (lower.includes('hollvania') || planet.toLowerCase().includes('hollvania')) tags.push('hollvania')
  if ((nodeMultipliers as Record<string, number>)[locId]) tags.push('dark-sector')
  return tags
}

function tagSource(source: DropSource, itemName: string): DropSource {
  const tags: string[] = [...(source.tags ?? [])]
  if ((descendiaItems as string[]).includes(itemName)) tags.push('descendia-exclusive')
  if ((eximusItems as string[]).includes(itemName)) tags.push('eximus-loot')
  if (isPrimeComponent(itemName)) tags.push('prime-component')
  return tags.length ? { ...source, tags } : source
}

function addEntry(index: Record<string, DropSource[]>, itemName: string, source: DropSource) {
  if (!index[itemName]) index[itemName] = []
  index[itemName].push(tagSource(source, itemName))
}

function buildNodeLevels(wfcdNodes: WfcdNode[]): NodeLevelsOutput {
  const nodes: Record<string, NodeMeta> = {}

  for (const node of wfcdNodes) {
    const locId = locationId(node.systemName, node.name)
    nodes[locId] = {
      locationId: locId,
      planet: node.systemName,
      nodeName: node.name,
      gameMode: 'Mission',
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
    modLocations,
    resourceByAvatar,
    enemyBlueprintTables,
    blueprintLocations,
    syndicates,
    miscItems,
    wfcdNodes,
  ] = await Promise.all([
    fetchJson(`${WFCD_BASE}/missionRewards.json`),
    fetchJson(`${WFCD_BASE}/cetusBountyRewards.json`),
    fetchJson(`${WFCD_BASE}/solarisBountyRewards.json`),
    fetchJson(`${WFCD_BASE}/deimosRewards.json`),
    fetchJson(`${WFCD_BASE}/hexRewards.json`),
    fetchJson(`${WFCD_BASE}/entratiLabRewards.json`),
    fetchJson(`${WFCD_BASE}/modLocations.json`),
    fetchJson(`${WFCD_BASE}/resourceByAvatar.json`),
    fetchJson(`${WFCD_BASE}/enemyBlueprintTables.json`),
    fetchJson(`${WFCD_BASE}/blueprintLocations.json`),
    fetchJson(`${WFCD_BASE}/syndicates.json`),
    fetchJson(`${WFCD_BASE}/miscItems.json`),
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
          addEntry(index, reward.itemName, {
            locationId: locationId(planet, nodeName),
            dropType: 'MissionReward',
            gameMode: node.gameMode,
            rotation,
            baseChance: reward.chance,
            tadr: computeTadr(reward.chance, node.gameMode, rotation),
          })
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
  ]

  for (const [region, data, key] of bountyRegions) {
    const tiers = (data as Record<string, Array<{ bountyLevel: string; rewards: Record<string, { itemName: string }[]> }>>)[key] ?? []
    for (const tier of tiers) {
      const tierSources = indexBountySources(region, { [key]: [tier] }, key)
      const itemSet = new Set<string>()
      for (const rewards of Object.values(tier.rewards ?? {})) {
        for (const r of rewards) itemSet.add(r.itemName)
      }
      for (const itemName of itemSet) {
        for (const s of tierSources) {
          addEntry(index, itemName, s)
        }
      }
    }
  }

  for (const entry of (modLocations as { modLocations: Array<{ modName: string; enemies: Array<{ enemyName: string; chance: number }> }> }).modLocations ?? []) {
    for (const enemy of entry.enemies ?? []) {
      if (!enemy.chance) continue
      const locId = (enemyNodeMap as Record<string, string>)[enemy.enemyName] ?? `Enemy - ${enemy.enemyName}`
      addEntry(index, entry.modName, {
        locationId: locId,
        dropType: 'ModLocation',
        gameMode: 'Enemy Drop',
        rotation: 'A',
        baseChance: enemy.chance,
        tadr: computeTadr(enemy.chance, 'Enemy Drop', 'A'),
      })
    }
  }

  for (const entry of (resourceByAvatar as { resourceByAvatar: Array<{ source: string; items: { item: string; chance: number }[] }> }).resourceByAvatar) {
    const locId = (enemyNodeMap as Record<string, string>)[entry.source] ?? `Enemy - ${entry.source}`
    for (const item of entry.items) {
      addEntry(index, item.item, {
        locationId: locId,
        dropType: 'EnemyDrop',
        gameMode: 'Enemy Drop',
        rotation: 'A',
        baseChance: item.chance,
        tadr: computeTadr(item.chance, 'Enemy Drop', 'A'),
      })
    }
  }

  for (const table of (enemyBlueprintTables as { enemyBlueprintTables: Array<{ enemyName: string; items: { itemName: string; chance: number }[] }> }).enemyBlueprintTables ?? []) {
    const locId = (enemyNodeMap as Record<string, string>)[table.enemyName] ?? `Enemy - ${table.enemyName}`
    for (const item of table.items ?? []) {
      addEntry(index, item.itemName, {
        locationId: locId,
        dropType: 'EnemyDrop',
        gameMode: 'Enemy Drop',
        rotation: 'A',
        baseChance: item.chance,
        tadr: computeTadr(item.chance, 'Enemy Drop', 'A'),
      })
    }
  }

  for (const entry of (blueprintLocations as { blueprintLocations: Array<{ itemName: string; enemies: Array<{ enemyName: string; chance: number }> }> }).blueprintLocations ?? []) {
    for (const enemy of entry.enemies ?? []) {
      if (!enemy.chance) continue
      const locId = (enemyNodeMap as Record<string, string>)[enemy.enemyName] ?? `Enemy - ${enemy.enemyName}`
      addEntry(index, entry.itemName, {
        locationId: locId,
        dropType: 'Blueprint',
        gameMode: 'Enemy Drop',
        rotation: 'A',
        baseChance: enemy.chance,
        tadr: computeTadr(enemy.chance, 'Enemy Drop', 'A'),
      })
    }
  }

  const syndicateRoot = syndicates as { syndicates: Record<string, Array<{ item: string; chance: number }>> }
  for (const [name, rewards] of Object.entries(syndicateRoot.syndicates ?? {})) {
    for (const reward of rewards) {
      addEntry(index, reward.item, {
        locationId: `Syndicate - ${name}`,
        dropType: 'Syndicate',
        gameMode: 'Syndicate',
        rotation: 'Full Clear',
        baseChance: reward.chance,
        tadr: reward.chance / 5,
      })
    }
  }

  for (const entry of (miscItems as { miscItems: Array<{ enemyName: string; items: { itemName: string; chance: number }[] }> }).miscItems ?? []) {
    const locId = (enemyNodeMap as Record<string, string>)[entry.enemyName] ?? `Boss - ${entry.enemyName}`
    for (const item of entry.items ?? []) {
      addEntry(index, item.itemName, {
        locationId: locId,
        dropType: 'EnemyDrop',
        gameMode: 'Boss',
        rotation: 'A',
        baseChance: item.chance,
        tadr: computeTadr(item.chance, 'Boss', 'A'),
      })
    }
  }

  for (const override of resourceFarmOverrides as Array<{ itemName: string; locationId: string; gameMode: string; baseChance: number; rotation: string }>) {
    addEntry(index, override.itemName, {
      locationId: override.locationId,
      dropType: 'EnemyDrop',
      gameMode: override.gameMode,
      rotation: override.rotation,
      baseChance: override.baseChance,
      tadr: computeTadr(override.baseChance, override.gameMode, override.rotation),
    })
  }

  const itemNames = Object.keys(index).sort((a, b) => a.localeCompare(b))
  const itemIndex: ItemIndexOutput = { items: index, itemNames }
  const nodeLevels = buildNodeLevels(wfcdNodes)

  for (const sources of Object.values(index)) {
    for (const s of sources) ensureNodeMeta(nodeLevels.nodes, s)
  }

  mkdirSync(PUBLIC, { recursive: true })
  writeFileSync(join(PUBLIC, 'item_index.json'), JSON.stringify(itemIndex))
  writeFileSync(join(PUBLIC, 'node_levels.json'), JSON.stringify(nodeLevels))
  console.log(`Built index: ${itemNames.length} items, ${Object.keys(nodeLevels.nodes).length} nodes`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
