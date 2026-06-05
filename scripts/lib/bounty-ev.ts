import type { DropSource } from './types.js'
import { bountyLocationId, normalizeItemName } from './normalize.js'
import { buildDropSource } from './sanitize.js'
import { bountyClearMinutes } from './tadr.js'

interface BountyRewardEntry {
  itemName: string
  chance: number
  stage?: string
}

interface BountyTier {
  bountyLevel: string
  rewards: Record<string, BountyRewardEntry[]>
}

const BOUNTY_CURRENCY_ITEMS = new Set([
  'Endo',
  'Credits',
  'Credit',
  'Standing',
  'Kuva',
  'Void Traces',
  'Void Trace',
])

function countStages(stage?: string): number {
  if (!stage) return 1
  const matches = stage.match(/Stage\s+\d+/gi)
  return matches?.length ?? 1
}

/** Earliest bounty stage where a reward row can appear. */
export function minStageFromReward(stage?: string): number {
  if (!stage) return 1
  if (/final\s*stage/i.test(stage)) return 5
  const nums = [...stage.matchAll(/Stage\s+(\d+)/gi)].map((m) => parseInt(m[1], 10))
  return nums.length ? Math.min(...nums) : 1
}

/** Mandatory ramp time before high-yield late-stage pools unlock. */
export function bountyRampDeadMinutes(minStage: number): number {
  if (minStage >= 4) return 6
  if (minStage === 3) return 4
  if (minStage === 2) return 2
  return 0
}

export function isBountyFarmableItem(rawItemName: string): boolean {
  const itemName = normalizeItemName(rawItemName)
  if (!itemName) return false
  if (BOUNTY_CURRENCY_ITEMS.has(itemName)) return false
  return true
}

interface ItemEvEntry {
  ev: number
  minStage: number
}

function evForRewardPool(rewards: BountyRewardEntry[]): Map<string, ItemEvEntry> {
  const evByItem = new Map<string, ItemEvEntry>()

  for (const reward of rewards) {
    if (!isBountyFarmableItem(reward.itemName)) continue

    const itemName = normalizeItemName(reward.itemName)
    const stageWeight = countStages(reward.stage)
    const contribution = reward.chance * stageWeight
    const minStage = minStageFromReward(reward.stage)
    const existing = evByItem.get(itemName)
    if (!existing) {
      evByItem.set(itemName, { ev: contribution, minStage })
    } else {
      existing.ev += contribution
      existing.minStage = Math.min(existing.minStage, minStage)
    }
  }

  return evByItem
}

export interface BountyItemSource {
  itemName: string
  source: DropSource
}

export function parseBountyTier(
  region: string,
  tier: BountyTier,
  dropType: DropSource['dropType'] = 'BountyReward',
): BountyItemSource[] {
  const entries: BountyItemSource[] = []
  const clearMinutes = bountyClearMinutes(tier.bountyLevel)
  const locationId = bountyLocationId(region, tier.bountyLevel)

  /** A/B/C pools are alternatives — use max EV per item, not sum across pools. */
  const maxEvByItem = new Map<string, ItemEvEntry>()

  for (const rewards of Object.values(tier.rewards)) {
    const poolEv = evForRewardPool(rewards)
    for (const [itemName, entry] of poolEv) {
      const prev = maxEvByItem.get(itemName)
      if (!prev || entry.ev > prev.ev) {
        maxEvByItem.set(itemName, entry)
      }
    }
  }

  for (const [itemName, { ev: evPercent, minStage }] of maxEvByItem) {
    const effectiveMinutes = clearMinutes + bountyRampDeadMinutes(minStage)
    const source = buildDropSource({
      locationId,
      dropType,
      gameMode: 'Bounty',
      rotation: 'Full Clear',
      baseChance: evPercent,
      tadr: evPercent / effectiveMinutes,
    })
    if (source) entries.push({ itemName, source })
  }

  return entries
}

export function indexBountySources(
  region: string,
  data: unknown,
  rootKey: string,
): BountyItemSource[] {
  const root = data as Record<string, BountyTier[]>
  const tiers = root[rootKey] ?? []
  return tiers.flatMap((tier) => parseBountyTier(region, tier))
}
