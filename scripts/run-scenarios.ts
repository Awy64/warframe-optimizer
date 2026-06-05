/**
 * Integration scenarios against the live WASM engine + built item index.
 * Run: npm run test:scenarios
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { initSync, init_engine, compute_ranked_nodes } from '../wasm/pkg/warframe_prapa_wasm.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

interface Objective {
  itemName: string
  targetQuantity: number
}

interface MatchedItem {
  itemName: string
  tadr: number
  targetQuantity: number
  yItem: number
}

interface RankedNode {
  locationId: string
  gameMode: string
  cost: number
  etcMinutes: number
  frictionPenalty: number
  kpm: number
  matchedItems: MatchedItem[]
  warnings: string[]
  frictionApplied: boolean
  maxEnemyLevel: number
}

interface Scenario {
  id: number
  name: string
  skill: number
  objectives: Objective[]
  arsenal?: Record<string, boolean>
  checks: (ctx: ScenarioResult) => string[]
}

interface PrapaEngineResult {
  rankedNodes: RankedNode[]
  pathingFailures: string[]
}

interface ScenarioResult {
  scenario: Scenario
  ranked: RankedNode[]
  pathingFailures: string[]
  top10: RankedNode[]
  rankOf: (pattern: RegExp | string) => number | null
  find: (pattern: RegExp | string) => RankedNode | undefined
  hasItem: (itemName: string) => boolean
  hasWarning: (text: string) => boolean
  getItemSources: (itemName: string) => Array<{
    locationId: string
    baseChance: number
    tadr: number
  }>
}

const DEFAULT_ARSENAL = {
  hasIvara: false,
  hasAtlas: false,
  hasKhora: false,
  hasHydroid: false,
  hasNekros: false,
  hasHighSlash: false,
  hasVinquibus: false,
  dropChanceBoosterActive: false,
  resourceBoosterActive: false,
  hasZarimanUnlocked: true,
  steelPathActive: false,
}

function parseEngineResult(raw: string): PrapaEngineResult {
  const parsed = JSON.parse(raw) as PrapaEngineResult | RankedNode[]
  if (Array.isArray(parsed)) {
    return { rankedNodes: parsed, pathingFailures: [] }
  }
  return parsed
}

const SCENARIOS: Scenario[] = [
  {
    id: 1,
    name: 'Localized Synergy (Void Overlap)',
    skill: 0.5,
    objectives: [
      { itemName: 'Argon Crystal', targetQuantity: 5 },
      { itemName: 'Control Module', targetQuantity: 50 },
      { itemName: 'Gallium', targetQuantity: 25 },
    ],
    checks: ({ top10, rankOf, find }) => {
      const notes: string[] = []
      const voidRank1 = top10[0]?.locationId.startsWith('Void -')
      notes.push(
        voidRank1
          ? 'PASS: Rank 1 is a Void node'
          : `FAIL: Rank 1 is ${top10[0]?.locationId ?? 'none'} (expected Void - Mot/Ani)`,
      )
      const gabii = find(/Gabii/)
      if (gabii) notes.push(`INFO: Ceres - Gabii rank #${rankOf(/Gabii/)} cost=${gabii.cost.toFixed(1)}m`)
      const mot = find(/Void - Mot/)
      const ani = find(/Void - Ani/)
      if (mot) notes.push(`INFO: Void - Mot rank #${rankOf(/Void - Mot/)} cost=${mot.cost.toFixed(1)}m`)
      if (ani) notes.push(`INFO: Void - Ani rank #${rankOf(/Void - Ani/)} cost=${ani.cost.toFixed(1)}m`)
      notes.push(
        'NOTE: Engine uses two-pass ETC (no S_m synergy multiplier). Overlap is not boosted.',
      )
      return notes
    },
  },
  {
    id: 2,
    name: 'Volume Disparity (FOPM Stress)',
    skill: 0.5,
    objectives: [
      { itemName: 'Plastids', targetQuantity: 15000 },
      { itemName: 'Orokin Cell', targetQuantity: 2 },
    ],
    checks: ({ top10, find }) => {
      const notes: string[] = []
      const step1Candidates = [/Ophelia/, /Piscinas/, /Plastid/i]
      const rank1 = top10[0]
      const isPlastidFarm =
        rank1 &&
        (rank1.locationId.includes('Ophelia') ||
          rank1.locationId.includes('Piscinas') ||
          rank1.matchedItems.some((i) => i.itemName === 'Plastids' && i.yItem > 0))
      notes.push(
        isPlastidFarm
          ? `PASS: Rank 1 prioritizes Plastids (${rank1!.locationId})`
          : `FAIL: Rank 1 is ${rank1?.locationId ?? 'none'} (expected top Plastid farm)`,
      )
      const gabii = find(/Gabii/)
      if (gabii) {
        notes.push(
          `INFO: Gabii rank #${top10.indexOf(gabii) + 1 || '—'} — cell synergy should not beat volume`,
        )
      }
      return notes
    },
  },
  {
    id: 3,
    name: 'Boss vs Horde (timeGateMinutes)',
    skill: 0.5,
    objectives: [{ itemName: 'Orokin Cell', targetQuantity: 150 }],
    checks: ({ top10, rankOf, find }) => {
      const notes: string[] = []
      const rank1 = top10[0]
      const hordeWins =
        rank1 &&
        (rank1.locationId.includes('Gabii') || rank1.locationId.includes('Helene'))
      notes.push(
        hordeWins
          ? `PASS: Horde node wins (${rank1!.locationId})`
          : `FAIL: Rank 1 is ${rank1?.locationId ?? 'none'} (expected Gabii/Helene)`,
      )
      const vor = find(/Corrupted Vor/)
      const vorRank = rankOf(/Corrupted Vor/)
      if (vor) {
        notes.push(
          vorRank !== null && vorRank > 20
            ? `PASS: Corrupted Vor buried at rank #${vorRank} (cost=${vor.cost.toFixed(0)}m)`
            : `FAIL: Corrupted Vor at rank #${vorRank} (cost=${vor.cost.toFixed(0)}m) — expected off first page`,
        )
      } else {
        notes.push('WARN: Corrupted Vor not in ranked results')
      }
      return notes
    },
  },
  {
    id: 4,
    name: 'Descendia Bottleneck (skill 0.4)',
    skill: 0.4,
    objectives: [
      { itemName: 'Vinquibus Bayonet Blueprint', targetQuantity: 1 },
      { itemName: 'Galariak Prime Blueprint', targetQuantity: 1 },
    ],
    checks: ({ top10, find }) => {
      const notes: string[] = []
      const descendia = top10.filter(
        (n) =>
          n.locationId.includes('Dark Refractory') ||
          n.locationId.includes('Descendia') ||
          n.warnings.length > 0,
      )
      const survivability = top10.filter((n) =>
        n.warnings.some((w) => w.includes('survivability')),
      )
      const vinquibus = top10.filter((n) =>
        n.warnings.some((w) => w.includes('Vinquibus')),
      )
      notes.push(
        survivability.length > 0
          ? `PASS: ${survivability.length} nodes carry high-survivability warning`
          : 'FAIL: No high-survivability warning at skill 0.4',
      )
      notes.push(
        vinquibus.length > 0
          ? `PASS: ${vinquibus.length} nodes carry Vinquibus recommendation`
          : 'FAIL: No Vinquibus warning on Descendia route',
      )
      const dr = find(/Dark Refractory/)
      if (dr) {
        notes.push(
          `INFO: Dark Refractory rank #${top10.indexOf(dr) + 1} friction=${dr.frictionPenalty.toFixed(2)} cost=${dr.cost.toFixed(1)}m`,
        )
        notes.push(`INFO: warnings=${JSON.stringify(dr.warnings)}`)
      } else {
        notes.push('WARN: Dark Refractory not ranked (item may be missing from index)')
      }
      if (descendia.length === 0) notes.push('WARN: No Descendia-tagged nodes in top 10')
      notes.push('NOTE: S_m synergy removed — overlap penalty no longer applies as 1.0 cap')
      return notes
    },
  },
  {
    id: 5,
    name: 'Omnia Fissure Cascading (skill 0.9)',
    skill: 0.9,
    objectives: [
      { itemName: 'Lex Prime Barrel', targetQuantity: 1 },
      { itemName: 'Entrati Lanthorn', targetQuantity: 5 },
    ],
    checks: ({ top10, find, hasItem }) => {
      const notes: string[] = []
      const omniaNodes = top10.filter(
        (n) =>
          n.locationId.includes('Tuvul Commons') ||
          n.locationId.includes('Persto') ||
          n.locationId.includes('Albrecht'),
      )
      notes.push(
        omniaNodes.length > 0
          ? `PASS: Omnia cascade node(s) in top 10: ${omniaNodes.map((n) => n.locationId).join(', ')}`
          : 'FAIL: No Omnia cascade nodes in top 10',
      )
      const omnia = find(/Tuvul Commons|Albrecht.*Persto/)
      if (omnia) {
        const baseEtc = omnia.etcMinutes
        const finalCost = omnia.cost
        const ratio = baseEtc > 0 ? finalCost / baseEtc : 1
        notes.push(
          ratio <= 0.55
            ? `PASS: Omnia 0.5× cost multiplier active (cost/etc=${ratio.toFixed(2)})`
            : `INFO: cost=${finalCost.toFixed(2)} etc=${baseEtc.toFixed(2)} ratio=${ratio.toFixed(2)} (expected ~0.5 if prime+expert)`,
        )
      }
      const lexIndexed = hasItem('Lex Prime Barrel')
      notes.push(
        lexIndexed
          ? 'PASS: Lex Prime Barrel indexed and matched at Omnia cascade'
          : 'FAIL: Lex Prime Barrel missing from index',
      )
      return notes
    },
  },
  {
    id: 6,
    name: 'Quest-State Prerequisite (Zariman Lock)',
    skill: 0.5,
    objectives: [{ itemName: 'Voidplume Down', targetQuantity: 5 }],
    arsenal: { hasZarimanUnlocked: false },
    checks: ({ ranked, pathingFailures }) => {
      const notes: string[] = []
      const questFail = pathingFailures.some((f) => f.includes('Angels of the Zariman'))
      notes.push(
        questFail
          ? 'PASS: Fatal routing warning for locked Zariman quest'
          : 'FAIL: Expected Angels of the Zariman pathing failure',
      )
      notes.push(
        ranked.length === 0
          ? 'PASS: No accessible route returned'
          : `FAIL: Expected empty ranked nodes, got ${ranked.length}`,
      )
      return notes
    },
  },
  {
    id: 7,
    name: 'Fixed-Interval Spawns (Acolyte Ceiling)',
    skill: 0.5,
    objectives: [{ itemName: 'Steel Essence', targetQuantity: 20 }],
    arsenal: { steelPathActive: true },
    checks: ({ top10 }) => {
      const notes: string[] = []
      const rank1 = top10[0]
      if (!rank1) {
        notes.push('FAIL: No ranked nodes for Steel Essence')
        return notes
      }
      const inBand = rank1.etcMinutes >= 45 && rank1.etcMinutes <= 75
      notes.push(
        inBand
          ? `PASS: Acolyte interval ETC ~${rank1.etcMinutes.toFixed(1)}m (expected ~50–60m)`
          : `FAIL: ETC ${rank1.etcMinutes.toFixed(1)}m outside ~50–60m band (KPM hallucination?)`,
      )
      notes.push(
        rank1.locationId.startsWith('Enemy -')
          ? `PASS: Steel Path acolyte source (${rank1.locationId})`
          : `INFO: Rank 1 is ${rank1.locationId}`,
      )
      return notes
    },
  },
  {
    id: 8,
    name: 'Asynchronous Environmental Locks (Night Cycle)',
    skill: 0.5,
    objectives: [{ itemName: 'Eidolon Shard', targetQuantity: 1 }],
    checks: ({ top10, hasWarning }) => {
      const notes: string[] = []
      const rank1 = top10[0]
      if (!rank1) {
        notes.push('FAIL: Eidolon Shard not ranked')
        return notes
      }
      notes.push(
        rank1.etcMinutes >= 4 && rank1.etcMinutes <= 8
          ? `PASS: Base capture ETC ~${rank1.etcMinutes.toFixed(1)}m`
          : `FAIL: Expected ~5m capture ETC, got ${rank1.etcMinutes.toFixed(1)}m`,
      )
      notes.push(
        hasWarning('Plains of Eidolon Night Cycle')
          ? 'PASS: Async night-cycle warning injected'
          : 'FAIL: Missing async night-cycle warning',
      )
      return notes
    },
  },
  {
    id: 9,
    name: 'Bounty Stage Dead-Time Dilution (Aya)',
    skill: 0.5,
    objectives: [{ itemName: 'Aya', targetQuantity: 3 }],
    checks: ({ top10, getItemSources }) => {
      const notes: string[] = []
      const cetus = top10.find((n) => n.locationId.includes('Level 40 - 60 Cetus Bounty'))
      if (!cetus) {
        notes.push('FAIL: Expected Cetus 40-60 bounty in top results')
        return notes
      }
      const src = getItemSources('Aya').find((s) => s.locationId.includes('40 - 60 Cetus'))
      if (!src) {
        notes.push('FAIL: Aya source missing from index for Cetus 40-60')
        return notes
      }
      const clearMinutes = 25
      const undilutedTadr = src.baseChance / clearMinutes
      notes.push(
        src.tadr < undilutedTadr * 0.95
          ? `PASS: Index tadr ${src.tadr.toFixed(3)} diluted vs undiluted ${undilutedTadr.toFixed(3)} (+6m ramp)`
          : `FAIL: tadr not diluted (got ${src.tadr.toFixed(3)}, expected < ${undilutedTadr.toFixed(3)})`,
      )
      notes.push(
        cetus.etcMinutes >= 40 && cetus.etcMinutes <= 70
          ? `PASS: Route ETC ${cetus.etcMinutes.toFixed(1)}m in expected ~40–70m band`
          : `FAIL: Route ETC ${cetus.etcMinutes.toFixed(1)}m outside ~40–70m band`,
      )
      notes.push(`INFO: Rank 1: ${top10[0]?.locationId}`)
      return notes
    },
  },
]

function main() {
  const wasmPath = join(root, 'wasm/pkg/warframe_prapa_wasm_bg.wasm')
  const itemJson = readFileSync(join(root, 'public/item_index.json'), 'utf8')
  const nodeJson = readFileSync(join(root, 'public/node_levels.json'), 'utf8')

  initSync(readFileSync(wasmPath))
  init_engine(itemJson, nodeJson)

  const itemIndex = JSON.parse(itemJson) as {
    items: Record<
      string,
      Array<{ locationId: string; baseChance: number; tadr: number }>
    >
  }

  console.log('═'.repeat(72))
  console.log('PRAPA Engine Scenario Suite')
  console.log('═'.repeat(72))

  for (const scenario of SCENARIOS) {
    console.log(`\n▶ Test ${scenario.id}: ${scenario.name}`)
    console.log(`  skill=${scenario.skill} cart=${JSON.stringify(scenario.objectives)}`)

    for (const obj of scenario.objectives) {
      if (!itemIndex.items[obj.itemName]) {
        console.log(`  ⚠ ITEM MISSING FROM INDEX: "${obj.itemName}"`)
      }
    }

    const arsenal = { ...DEFAULT_ARSENAL, ...scenario.arsenal }
    const raw = compute_ranked_nodes(
      JSON.stringify(scenario.objectives),
      scenario.skill,
      JSON.stringify(arsenal),
      Date.now(),
    )
    const { rankedNodes: ranked, pathingFailures } = parseEngineResult(raw)

    const ctx: ScenarioResult = {
      scenario,
      ranked,
      pathingFailures,
      top10: ranked.slice(0, 10),
      rankOf: (pattern) => {
        const idx = ranked.findIndex((n) =>
          typeof pattern === 'string' ? n.locationId.includes(pattern) : pattern.test(n.locationId),
        )
        return idx === -1 ? null : idx + 1
      },
      find: (pattern) =>
        ranked.find((n) =>
          typeof pattern === 'string' ? n.locationId.includes(pattern) : pattern.test(n.locationId),
        ),
      hasItem: (itemName) =>
        ranked.some((n) => n.matchedItems.some((m) => m.itemName === itemName)),
      hasWarning: (text) => ranked.some((n) => n.warnings.some((w) => w.includes(text))),
      getItemSources: (itemName) => itemIndex.items[itemName] ?? [],
    }

    console.log(`  ${ranked.length} nodes ranked`)
    if (pathingFailures.length > 0) {
      console.log(`  Pathing failures: ${pathingFailures.join(' | ')}`)
    }
    console.log('  Top 10:')
    for (const [i, node] of ctx.top10.entries()) {
      const items = node.matchedItems
        .map((m) => `${m.itemName} Y=${m.yItem.toFixed(3)}`)
        .join('; ')
      const warn = node.warnings.length ? ` ⚠${node.warnings.length}` : ''
      console.log(
        `    #${i + 1} ${node.locationId} | cost=${node.cost.toFixed(1)}m etc=${node.etcMinutes.toFixed(1)}m Fp=${node.frictionPenalty.toFixed(2)}${warn}`,
      )
      if (items) console.log(`        ${items}`)
    }

    console.log('  Checks:')
    for (const line of scenario.checks(ctx)) {
      console.log(`    ${line}`)
    }
  }

  console.log('\n' + '═'.repeat(72))
}

try {
  main()
} catch (err) {
  console.error(err)
  process.exit(1)
}
