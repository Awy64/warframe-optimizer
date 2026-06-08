/**
 * Integration scenarios against the live WASM engine + built item index.
 * Run: npm run test:scenarios
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { initSync, init_engine, compute_ranked_nodes } from '../wasm/pkg/warframe_prapa_wasm.js'
import { buildGoldenPath } from '../src/lib/routeItinerary.js'
import { filterPlayableNodes, isPlayableNode } from '../src/lib/rankedNodeFilters.js'

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
  arsenal?: Record<string, boolean | number | string>
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
  modDropChanceBoosterActive: false,
  creditBoosterActive: false,
  hasChromaEffigy: false,
  companion: 'none',
  retriever: 'none',
  hasAoeContainerFrame: false,
  hasZarimanUnlocked: true,
  steelPathActive: false,
  squadSize: 4,
}

function parseEngineResult(raw: string): PrapaEngineResult {
  const parsed = JSON.parse(raw) as PrapaEngineResult | RankedNode[]
  if (Array.isArray(parsed)) {
    return { rankedNodes: parsed, pathingFailures: [] }
  }
  return parsed
}

/** Best yield/min for a single item across all nodes under an arsenal override. */
function bestItemYield(
  itemName: string,
  arsenalOverride: Record<string, boolean | number | string>,
  skill = 0.9,
): number {
  const arsenal = { ...DEFAULT_ARSENAL, ...arsenalOverride }
  const raw = compute_ranked_nodes(
    JSON.stringify([{ itemName, targetQuantity: 100 }]),
    skill,
    JSON.stringify(arsenal),
    Date.now(),
  )
  const { rankedNodes } = parseEngineResult(raw)
  let best = 0
  for (const n of rankedNodes) {
    const y = n.matchedItems.find((m) => m.itemName === itemName)?.yItem ?? 0
    if (y > best) best = y
  }
  return best
}

const traceYield = (arsenal: Record<string, boolean | number | string>) =>
  bestItemYield('Void Traces', arsenal)

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
  {
    id: 10,
    name: 'The "Slash-Meta" Volumetric Escalation',
    skill: 0.7,
    objectives: [{ itemName: 'Orokin Cell', targetQuantity: 50 }],
    arsenal: {
      hasKhora: true,
      hasNekros: true,
      hasHighSlash: true,
      dropChanceBoosterActive: true,
      resourceBoosterActive: true,
      hasZarimanUnlocked: true,
    },
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

      if (rank1) {
        notes.push(`INFO: Top node ETC is ${rank1.etcMinutes.toFixed(1)}m`)
        // With 4x booster and 2.73x loot modifier (1 + 0.65 + 1.08), yield is high.
        // Unboosted Ceres - Gabii yield per min at 0.7 skill: 0.09 * (30 + 0.7 * 15) * 1.35 = 4.92 / 100 = 0.049 cells/min.
        // Boosted yield: 0.049 * 4 * 2.73 = 0.535 cells/min.
        // For 50 cells, ETC = 50 / 0.535 = 93.4 minutes.
        notes.push(
          rank1.etcMinutes < 120.0
            ? `PASS: Group farm ETC is highly competitive (${rank1.etcMinutes.toFixed(1)}m)`
            : `FAIL: Group farm ETC is too slow (${rank1.etcMinutes.toFixed(1)}m)`,
        )
      }

      const Ruk = find(/Sargas Ruk|Tethys/)
      const rukRank = rankOf(/Sargas Ruk|Tethys/)
      if (Ruk) {
        notes.push(
          rukRank !== null && rukRank > 10
            ? `PASS: Boss Sargas Ruk buried at rank #${rukRank} (cost=${Ruk.cost.toFixed(0)}m)`
            : `FAIL: Boss Sargas Ruk at rank #${rukRank} (cost=${Ruk.cost.toFixed(0)}m) — expected buried`,
        )
      } else {
        notes.push('PASS: Boss Sargas Ruk not in top 10/buried')
      }
      return notes
    },
  },
  {
    id: 11,
    name: 'The Progression Hard-Lock & Hybrid Path Finder',
    skill: 0.5,
    objectives: [
      { itemName: 'Voidplume Down', targetQuantity: 5 },
      { itemName: 'Plastids', targetQuantity: 500 },
    ],
    arsenal: {
      hasZarimanUnlocked: false,
    },
    checks: ({ ranked, pathingFailures, find, rankOf }) => {
      const notes: string[] = []
      const questFail = pathingFailures.some((f) =>
        f.includes("Pathing Failed: Target requires completion of 'Angels of the Zariman' quest."),
      )
      notes.push(
        questFail
          ? 'PASS: Fatal routing warning for locked Zariman quest matches exact expectation'
          : `FAIL: Expected exact Zariman quest lock pathing failure message, got: ${JSON.stringify(pathingFailures)}`,
      )

      const hasPlastidsNodes =
        ranked.length > 0 &&
        ranked.some((n) => n.matchedItems.some((i) => i.itemName === 'Plastids'))
      notes.push(
        hasPlastidsNodes
          ? `PASS: Pipeline successfully returned ${ranked.length} ranked nodes matching Plastids despite quest lock`
          : 'FAIL: Expected partial success node ranking for Plastids',
      )

      const ophelia = find(/Ophelia/)
      const opheliaRank = rankOf(/Ophelia/)
      if (ophelia) {
        notes.push(
          `INFO: Ophelia rank #${opheliaRank} cost=${ophelia.cost.toFixed(1)}m (expected high due to UNFARMABLE_ETC contribution)`
        )
        notes.push(
          ophelia.cost > 90000.0
            ? 'PASS: Node cost reflects inclusion of UNFARMABLE_ETC for missing objective'
            : `FAIL: Node cost ${ophelia.cost.toFixed(1)}m did not include UNFARMABLE_ETC contribution`,
        )
      }
      return notes
    },
  },
  {
    id: 12,
    name: 'The End-Game Steel Path / Interval Hybrid',
    skill: 0.9,
    objectives: [
      { itemName: 'Steel Essence', targetQuantity: 10 },
      { itemName: 'Orokin Cell', targetQuantity: 5 },
    ],
    arsenal: {
      steelPathActive: true,
      hasZarimanUnlocked: true,
    },
    checks: ({ top10, find, rankOf }) => {
      const notes: string[] = []
      // Let's verify that Steel Path Gabii or similar Ceres/Saturn SP node is ranked highly
      const steelPathNode = top10.find((n) => n.locationId.includes('Gabii'))
      notes.push(
        steelPathNode
          ? `PASS: Steel Path Gabii found in top 10: rank #${top10.indexOf(steelPathNode) + 1}`
          : 'FAIL: Steel Path Gabii not found in top 10',
      )

      // Verify acolyte fixed-interval math for Steel Essence
      // Yield = 2.0 / 6.0 * 1.0 (booster) = 0.33333 items/min.
      // For 10 Steel Essence, time = 30.0 minutes.
      const maliceNode = find(/Enemy - Malice/)
      if (maliceNode) {
        const seItem = maliceNode.matchedItems.find(i => i.itemName === 'Steel Essence')
        if (seItem) {
          const seYield = seItem.yItem
          const seTime = 10.0 / seYield
          const withinBand = Math.abs(seTime - 30.0) < 0.5
          notes.push(
            withinBand
              ? `PASS: Fixed-interval Acolyte spawn calculation is exactly 30.0 minutes (${seTime.toFixed(1)}m)`
              : `FAIL: Expected exactly 30.0 minutes base spawn time, got ${seTime.toFixed(1)}m`,
          )
        }
      }

      // Verify combined routing cost/etc (30.0m Acolytes, cells finished concurrently at 16.7m -> 30.0m max)
      if (steelPathNode) {
        const expectedCombined = 30.0
        const withinCombinedBand = Math.abs(steelPathNode.etcMinutes - expectedCombined) < 0.5
        notes.push(
          withinCombinedBand
            ? `PASS: Combined Steel Path routing ETC is exactly 30.0 minutes (${steelPathNode.etcMinutes.toFixed(1)}m)`
            : `FAIL: Expected 30.0 minutes combined ETC, got ${steelPathNode.etcMinutes.toFixed(1)}m`,
        )
      }
      return notes
    },
  },
  {
    id: 13,
    name: 'Squad Size Physics & Concurrency Constraints (Solo vs Squad)',
    skill: 0.5,
    objectives: [{ itemName: 'Serration', targetQuantity: 1 }],
    arsenal: { squadSize: 1 },
    checks: ({ top10, ranked }) => {
      const notes: string[] = []
      const soloExc = ranked.find((n) => n.gameMode === 'Excavation')
      if (soloExc) {
        notes.push(`INFO: Solo Excavation Node: ${soloExc.locationId} cost=${soloExc.cost.toFixed(1)}m etc=${soloExc.etcMinutes.toFixed(1)}m`)
        notes.push(
          soloExc.etcMinutes >= 5.5
            ? 'PASS: Solo Excavation carries 1.75x objective concurrency penalty'
            : `FAIL: Solo Excavation ETC is too low: ${soloExc.etcMinutes}m`
        )
      } else {
        notes.push('WARN: No Excavation node found in results')
      }
      return notes
    }
  },
  {
    id: 14,
    name: 'TypeScript Wrapper Formatting (Consolidation & Translation)',
    skill: 0.5,
    objectives: [
      { itemName: 'Orokin Cell', targetQuantity: 5 },
      { itemName: 'Argon Crystal', targetQuantity: 5 },
    ],
    checks: ({ ranked, scenario }) => {
      const notes: string[] = []
      const arsenal = { ...DEFAULT_ARSENAL, ...scenario.arsenal }
      const path = buildGoldenPath(filterPlayableNodes(ranked), scenario.objectives, arsenal)
      if (path) {
        notes.push(`INFO: Primary plan starting location: ${path.primaryPlan.startingLocationId}`)
        const steps = path.primaryPlan.steps
        notes.push(`INFO: Steps count: ${steps.length}`)
        for (const s of steps) {
          const itemsStr = s.items
            ? s.items.map(i => `${i.itemName} (qty ${i.quantity.toFixed(2)})`).join(', ')
            : s.itemName
          notes.push(`  Step #${s.stepNumber}: location=${s.locationId} items=[${itemsStr}] min=${s.estimatedMinutes.toFixed(1)}`)
        }

        const hasMot = steps.some(s => s.locationId === 'Void - Mot')
        notes.push(
          hasMot
            ? 'PASS: Translated virtual boss node to Void - Mot'
            : 'FAIL: Expected Void - Mot in steps'
        )

        const locationCount = new Set(steps.map(s => s.locationId)).size
        notes.push(
          locationCount === steps.length
            ? 'PASS: Simultaneous steps consolidated by locationId'
            : 'FAIL: Detected duplicate locationIds in steps'
        )

        const motStep = steps.find(s => s.locationId === 'Void - Mot')
        if (motStep) {
          const argon = motStep.items?.find(i => i.itemName === 'Argon Crystal')
          const cell = motStep.items?.find(i => i.itemName === 'Orokin Cell')
          if (argon && cell && Math.abs(argon.quantity - 5) < 0.01 && cell.quantity > 1.5 && cell.quantity < 1.7) {
            notes.push('PASS: Void - Mot step contains correct quantities for Argon Crystal and Orokin Cell')
          } else {
            notes.push(`FAIL: Void - Mot step quantities incorrect. Argon: ${argon?.quantity}, Orokin Cell: ${cell?.quantity}`)
          }
        } else {
          notes.push('FAIL: Void - Mot step not found')
        }

        const gabiiStep = steps.find(s => s.locationId === 'Ceres - Gabii')
        if (gabiiStep) {
          const cell = gabiiStep.items?.find(i => i.itemName === 'Orokin Cell')
          if (cell && cell.quantity > 3.3 && cell.quantity < 3.5) {
            notes.push('PASS: Ceres - Gabii step contains correct remaining quantity for Orokin Cell')
          } else {
            notes.push(`FAIL: Ceres - Gabii step quantities incorrect. Orokin Cell: ${cell?.quantity}`)
          }
        } else {
          notes.push('FAIL: Ceres - Gabii step not found')
        }
      } else {
        notes.push('FAIL: No golden path found')
      }
      return notes
    }
  },
  {
    id: 15,
    name: 'Playability Firewall (Virtual Entities Blocked From Route)',
    skill: 0.15,
    objectives: [{ itemName: 'Orokin Cell', targetQuantity: 2 }],
    arsenal: { squadSize: 1 },
    checks: ({ ranked, scenario }) => {
      const notes: string[] = []
      const virtualPrefix = /^(?:Boss|Enemy) - /

      const hasGhostRanked = ranked.some((n) => n.locationId.startsWith('Enemy - '))
      notes.push(
        hasGhostRanked
          ? 'PASS: Virtual enemy nodes still present in rankedNodes (data layer)'
          : 'WARN: No Enemy - rows in ranked list (index may have changed)',
      )

      const arsenal = { ...DEFAULT_ARSENAL, ...scenario.arsenal }
      const path = buildGoldenPath(filterPlayableNodes(ranked), scenario.objectives, arsenal)
      if (!path) {
        notes.push('FAIL: No golden path found')
        return notes
      }

      const step1 = path.primaryPlan.steps[0]
      notes.push(`INFO: Primary plan step 1: ${step1?.locationId ?? 'none'}`)

      notes.push(
        step1 && !virtualPrefix.test(step1.locationId)
          ? 'PASS: Step 1 is a physical Star Chart node'
          : `FAIL: Step 1 must not be a virtual entity, got ${step1?.locationId}`,
      )

      const allPlans = [path.primaryPlan, ...path.alternativeStarters]
      const badSteps = allPlans.flatMap((plan) =>
        plan.steps.filter(
          (step) =>
            !isPlayableNode({
              locationId: step.locationId,
              gameMode: step.gameMode,
            } as (typeof ranked)[0]),
        ),
      )
      notes.push(
        badSteps.length === 0
          ? 'PASS: All route steps are playable nodes'
          : `FAIL: ${badSteps.length} unplayable step(s): ${badSteps.map((s) => s.locationId).join(', ')}`,
      )

      notes.push(
        !virtualPrefix.test(path.primaryPlan.startingLocationId)
          ? `PASS: Starter is physical node (${path.primaryPlan.startingLocationId})`
          : `FAIL: Starter must not be virtual entity (${path.primaryPlan.startingLocationId})`,
      )

      return notes
    },
  },
  {
    id: 16,
    name: 'Endo Booster Taxonomy (mod-drop, not resource)',
    skill: 0.9,
    objectives: [{ itemName: 'Endo', targetQuantity: 4000 }],
    arsenal: {
      steelPathActive: true,
      modDropChanceBoosterActive: true,
      hasNekros: true,
      hasHighSlash: true,
    },
    checks: ({ find }) => {
      const notes: string[] = []
      const vodyanoi = find(/Vodyanoi/)
      if (!vodyanoi) {
        notes.push('FAIL: Vodyanoi Endo arena not ranked')
        return notes
      }
      const y = vodyanoi.matchedItems.find((m) => m.itemName === 'Endo')?.yItem ?? 0
      // base 100 × mod-drop (SP×2 × booster×2 = 4) × m_loot (Nekros+slash = 2.08) = 832.
      notes.push(
        Math.abs(y - 832) < 1
          ? `PASS: Vodyanoi Endo Y=${y.toFixed(1)} (mod-drop ×4 × loot 2.08)`
          : `FAIL: Vodyanoi Endo Y=${y.toFixed(1)} (expected ~832)`,
      )
      return notes
    },
  },
  {
    id: 17,
    name: 'Void Trace resource-booster inversion',
    skill: 0.9,
    objectives: [{ itemName: 'Void Traces', targetQuantity: 100 }],
    checks: ({ getItemSources }) => {
      const notes: string[] = []
      const sources = getItemSources('Void Traces')
      notes.push(
        sources.length > 0
          ? `PASS: ${sources.length} Void Traces source(s) indexed`
          : 'FAIL: No Void Traces sources',
      )
      // Drop-chance booster must be a no-op; resource booster must double yield.
      const base = traceYield({})
      const withDrop = traceYield({ dropChanceBoosterActive: true })
      const withResource = traceYield({ resourceBoosterActive: true })
      notes.push(
        Math.abs(base - withDrop) < 1e-6
          ? `PASS: Drop-chance booster is a no-op for Traces (Y=${base.toFixed(1)})`
          : `FAIL: Drop booster changed Traces ${base.toFixed(1)} -> ${withDrop.toFixed(1)}`,
      )
      notes.push(
        Math.abs(withResource - base * 2) < 1e-3
          ? `PASS: Resource booster doubles Traces (${base.toFixed(1)} -> ${withResource.toFixed(1)})`
          : `FAIL: Resource booster did not double Traces (${base.toFixed(1)} -> ${withResource.toFixed(1)})`,
      )
      return notes
    },
  },
  {
    id: 18,
    name: 'Credits with Chroma Effigy',
    skill: 0.9,
    objectives: [{ itemName: 'Credits', targetQuantity: 1000000 }],
    arsenal: { creditBoosterActive: true, hasChromaEffigy: true },
    checks: ({ top10, find }) => {
      const notes: string[] = []
      const index = find(/The Index/)
      notes.push(
        top10[0]?.locationId.includes('The Index')
          ? 'PASS: The Index is the top credit farm'
          : `INFO: Rank 1 is ${top10[0]?.locationId}`,
      )
      if (index) {
        const y = index.matchedItems.find((m) => m.itemName === 'Credits')?.yItem ?? 0
        // base 83000 × credit booster 2 × Chroma 2 = 332000.
        notes.push(
          Math.abs(y - 332000) < 1
            ? `PASS: The Index Credits Y=${y.toFixed(0)} (×2 booster × ×2 Effigy)`
            : `FAIL: The Index Credits Y=${y.toFixed(0)} (expected 332000)`,
        )
      }
      return notes
    },
  },
  {
    id: 19,
    name: 'Entrati Lanthorn — Netracell guaranteed primary',
    skill: 0.9,
    objectives: [{ itemName: 'Entrati Lanthorn', targetQuantity: 10 }],
    checks: ({ top10 }) => {
      const notes: string[] = []
      notes.push(
        top10[0]?.locationId === 'Deimos - Netracell'
          ? 'PASS: Netracell is the primary Lanthorn source'
          : `FAIL: Rank 1 is ${top10[0]?.locationId} (expected Deimos - Netracell)`,
      )
      return notes
    },
  },
  {
    id: 20,
    name: 'Techrot Motherboard — L115-120 bounty routable',
    skill: 0.9,
    objectives: [{ itemName: 'Techrot Motherboard', targetQuantity: 8 }],
    checks: ({ ranked, find }) => {
      const notes: string[] = []
      notes.push(
        ranked.length > 0
          ? `PASS: ${ranked.length} routable Motherboard node(s)`
          : 'FAIL: No routable Motherboard nodes',
      )
      const bounty = find(/Central Mall Bounty/)
      notes.push(
        bounty
          ? `PASS: L115-120 Central Mall bounty ranked (#${ranked.indexOf(bounty) + 1})`
          : 'FAIL: Central Mall bounty not ranked',
      )
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
