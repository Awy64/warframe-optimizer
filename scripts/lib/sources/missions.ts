import type { DropSource } from '../types.js'
import { locationId } from '../normalize.js'
import { computeTadr } from '../tadr.js'

interface MissionRewardEntry {
  itemName: string
  chance: number
}

interface MissionNode {
  gameMode: string
  isEvent?: boolean
  rewards: Record<string, MissionRewardEntry[]>
}

export function parseMissionRewards(data: unknown): DropSource[] {
  const root = data as { missionRewards: Record<string, Record<string, MissionNode>> }
  const sources: DropSource[] = []

  for (const [planet, nodes] of Object.entries(root.missionRewards ?? {})) {
    for (const [nodeName, node] of Object.entries(nodes)) {
      if (node.isEvent) continue
      const loc = locationId(planet, nodeName)
      for (const [rotation, rewards] of Object.entries(node.rewards ?? {})) {
        for (const reward of rewards) {
          sources.push({
            locationId: loc,
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

  return sources
}
