import type { DropSource } from './types.js'
import { bountyLocationId } from './normalize.js'
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

function countStages(stage?: string): number {
  if (!stage) return 1
  const matches = stage.match(/Stage\s+\d+/gi)
  return matches?.length ?? 1
}

export function parseBountyTier(
  region: string,
  tier: BountyTier,
  dropType: DropSource['dropType'] = 'BountyReward',
): DropSource[] {
  const sources: DropSource[] = []
  const clearMinutes = bountyClearMinutes(tier.bountyLevel)
  const locationId = bountyLocationId(region, tier.bountyLevel)

  const evByItem = new Map<string, number>()

  for (const rewards of Object.values(tier.rewards)) {
    for (const reward of rewards) {
      const stageWeight = countStages(reward.stage)
      const contribution = reward.chance * stageWeight
      evByItem.set(reward.itemName, (evByItem.get(reward.itemName) ?? 0) + contribution)
    }
  }

  for (const [itemName, evPercent] of evByItem) {
    sources.push({
      locationId,
      dropType,
      gameMode: 'Bounty',
      rotation: 'Full Clear',
      baseChance: evPercent,
      tadr: evPercent / clearMinutes,
    })
  }

  return sources
}

export function indexBountySources(
  region: string,
  data: unknown,
  rootKey: string,
): DropSource[] {
  const root = data as Record<string, BountyTier[]>
  const tiers = root[rootKey] ?? []
  return tiers.flatMap((tier) => parseBountyTier(region, tier))
}
