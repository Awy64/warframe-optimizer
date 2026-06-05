import { supplementWarnings } from './warnings'
import type { Objective, RankedNode } from '../types'

export const ETC_TIE_EPSILON = 0.001

export interface ItemBestNode {
  yield: number
  node: RankedNode
}

export interface RouteStep {
  stepNumber: number
  locationId: string
  gameMode: string
  itemName: string
  quantity: number
  estimatedMinutes: number
  warnings: string[]
}

export interface RoutePlan {
  startingLocationId: string
  baseEtcMinutes: number
  finalCostMinutes: number
  steps: RouteStep[]
}

export interface GoldenPath {
  /** Nodes tied for the optimal base route time (pre-friction). */
  tiedNodes: RankedNode[]
  primaryPlan: RoutePlan
  /** Other tied starters that swap Step 1 only (same total route time). */
  alternativeStarters: RoutePlan[]
}

/** Minutes to farm `targetQuantity` of an item at a node from its yield rate. */
export function itemEtaAtNode(targetQuantity: number, yItem: number): number {
  if (yItem <= 0 || !Number.isFinite(yItem)) return Number.POSITIVE_INFINITY
  return targetQuantity / yItem
}

function yieldsAtNode(node: RankedNode): Map<string, number> {
  const map = new Map<string, number>()
  for (const item of node.matchedItems) {
    map.set(item.itemName, item.yItem)
  }
  return map
}

export function computeGlobalBestNodes(rankedNodes: RankedNode[]): Map<string, ItemBestNode> {
  const map = new Map<string, ItemBestNode>()

  for (const node of rankedNodes) {
    for (const item of node.matchedItems) {
      const existing = map.get(item.itemName)
      if (!existing || item.yItem > existing.yield) {
        map.set(item.itemName, { yield: item.yItem, node })
      }
    }
  }

  return map
}

export function nodesTiedAtBestEtc(rankedNodes: RankedNode[]): RankedNode[] {
  if (rankedNodes.length === 0) return []

  const best = rankedNodes[0].etcMinutes
  return rankedNodes.filter((node) => Math.abs(node.etcMinutes - best) <= ETC_TIE_EPSILON)
}

/** Mirrors WASM Pass 2 and returns the step-by-step farming itinerary. */
export function simulateRoutePlan(
  startNode: RankedNode,
  objectives: Objective[],
  globalBest: Map<string, ItemBestNode>,
): RoutePlan | null {
  const yields = yieldsAtNode(startNode)
  let bestTarget: string | null = null
  let bestTotal = Number.POSITIVE_INFINITY

  for (const objective of objectives) {
    const yTarget = yields.get(objective.itemName) ?? 0
    if (yTarget <= 0) continue

    const timeHere = objective.targetQuantity / yTarget
    let remaining = 0

    for (const item of objectives) {
      const yj = yields.get(item.itemName) ?? 0
      const qRemaining = Math.max(0, item.targetQuantity - yj * timeHere)
      if (qRemaining <= 0) continue

      const best = globalBest.get(item.itemName)
      if (!best || best.yield <= 0) {
        remaining += 99_999
      } else {
        remaining += qRemaining / best.yield
      }
    }

    const total = timeHere + remaining
    if (total < bestTotal) {
      bestTotal = total
      bestTarget = objective.itemName
    }
  }

  if (!bestTarget) return null

  const primaryObjective = objectives.find((o) => o.itemName === bestTarget)
  if (!primaryObjective) return null

  const yPrimary = yields.get(bestTarget) ?? 0
  const primaryMinutes = primaryObjective.targetQuantity / yPrimary

  const steps: RouteStep[] = [
    {
      stepNumber: 1,
      locationId: startNode.locationId,
      gameMode: startNode.gameMode,
      itemName: bestTarget,
      quantity: primaryObjective.targetQuantity,
      estimatedMinutes: primaryMinutes,
      warnings: supplementWarnings(startNode),
    },
  ]

  const cleanup: RouteStep[] = []

  for (const item of objectives) {
    const yj = yields.get(item.itemName) ?? 0
    const qRemaining = Math.max(0, item.targetQuantity - yj * primaryMinutes)
    if (qRemaining <= 0) continue

    const best = globalBest.get(item.itemName)
    if (!best || best.yield <= 0) continue

    cleanup.push({
      stepNumber: 0,
      locationId: best.node.locationId,
      gameMode: best.node.gameMode,
      itemName: item.itemName,
      quantity: qRemaining,
      estimatedMinutes: qRemaining / best.yield,
      warnings: supplementWarnings(best.node),
    })
  }

  cleanup.sort((a, b) => b.estimatedMinutes - a.estimatedMinutes)
  for (const step of cleanup) {
    step.stepNumber = steps.length + 1
    steps.push(step)
  }

  return {
    startingLocationId: startNode.locationId,
    baseEtcMinutes: startNode.etcMinutes,
    finalCostMinutes: startNode.cost,
    steps,
  }
}

export function buildGoldenPath(
  rankedNodes: RankedNode[],
  objectives: Objective[],
): GoldenPath | null {
  if (rankedNodes.length === 0 || objectives.length === 0) return null

  const tiedNodes = nodesTiedAtBestEtc(rankedNodes)
  const globalBest = computeGlobalBestNodes(rankedNodes)

  const plans = tiedNodes
    .map((node) => simulateRoutePlan(node, objectives, globalBest))
    .filter((plan): plan is RoutePlan => plan !== null)

  if (plans.length === 0) return null

  plans.sort((a, b) => {
    const firstA = a.steps[0]?.estimatedMinutes ?? Number.POSITIVE_INFINITY
    const firstB = b.steps[0]?.estimatedMinutes ?? Number.POSITIVE_INFINITY
    if (firstA !== firstB) return firstA - firstB
    return a.startingLocationId.localeCompare(b.startingLocationId)
  })

  const primaryPlan = plans[0]
  const seenStarters = new Set<string>([primaryPlan.startingLocationId])

  const alternativeStarters = plans.filter((plan) => {
    if (seenStarters.has(plan.startingLocationId)) return false
    seenStarters.add(plan.startingLocationId)
    return true
  })

  return { tiedNodes, primaryPlan, alternativeStarters }
}
