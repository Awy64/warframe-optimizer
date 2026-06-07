import { filterPlayableNodes } from './rankedNodeFilters'
import { supplementWarnings } from './warnings'
import type { ArsenalState, Objective, RankedNode } from '../types'

export const ETC_TIE_EPSILON = 0.001


function consolidateSteps(steps: RouteStep[]): RouteStep[] {
  const consolidated: RouteStep[] = []
  const seen = new Map<string, RouteStep>()

  for (const step of steps) {
    const existing = seen.get(step.locationId)
    if (existing) {
      existing.itemName = `${existing.itemName}, ${step.itemName}`
      existing.estimatedMinutes = Math.max(existing.estimatedMinutes, step.estimatedMinutes)
      existing.quantity = Math.max(existing.quantity, step.quantity)
      existing.warnings = Array.from(new Set([...existing.warnings, ...step.warnings]))
      if (existing.items && step.items) {
        existing.items.push(...step.items)
      }
    } else {
      const stepCopy = {
        ...step,
        items: step.items ? [...step.items] : undefined,
      }
      consolidated.push(stepCopy)
      seen.set(step.locationId, stepCopy)
    }
  }

  // Merge items with the same itemName within each consolidated step and update itemName
  for (const step of consolidated) {
    if (step.items && step.items.length > 0) {
      const itemMap = new Map<string, number>()
      for (const item of step.items) {
        itemMap.set(item.itemName, (itemMap.get(item.itemName) ?? 0) + item.quantity)
      }
      step.items = Array.from(itemMap.entries()).map(([itemName, quantity]) => ({
        itemName,
        quantity,
      }))
      step.itemName = step.items.map(item => item.itemName).join(', ')
    }
  }

  for (let i = 0; i < consolidated.length; i++) {
    consolidated[i].stepNumber = i + 1
  }

  return consolidated
}

export interface ItemBestNode {
  yield: number
  node: RankedNode
}

export interface RouteStepItem {
  itemName: string
  quantity: number
}

export interface RouteStep {
  stepNumber: number
  locationId: string
  gameMode: string
  itemName: string
  quantity: number
  estimatedMinutes: number
  warnings: string[]
  items?: RouteStepItem[]
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

function isFolliesHuntNode(locationId: string, gameMode: string): boolean {
  return gameMode === "Follie's Hunt" || locationId.includes('Vesper Relay')
}

function baseCompletionTime(squadSize: number): number {
  if (squadSize === 1) return 14.0
  if (squadSize === 2) return 9.5
  if (squadSize === 3) return 7.5
  return 6.0
}

export function farmMinutesAtNode(
  quantity: number,
  yItem: number,
  locationId: string,
  gameMode: string,
  squadSize: number,
): number {
  if (yItem <= 0 || !Number.isFinite(yItem)) return Number.POSITIVE_INFINITY
  if (isFolliesHuntNode(locationId, gameMode)) {
    const runDuration = baseCompletionTime(squadSize)
    const yieldPerRun = Math.round(yItem * runDuration)
    return Math.max(0, Math.ceil((quantity - 0.00001) / yieldPerRun)) * runDuration
  }
  return quantity / yItem
}

/** Minutes to farm `targetQuantity` of an item at a node from its yield rate. */
export function itemEtaAtNode(
  targetQuantity: number,
  yItem: number,
  locationId?: string,
  gameMode?: string,
  squadSize?: number,
): number {
  if (locationId && gameMode && squadSize !== undefined) {
    return farmMinutesAtNode(targetQuantity, yItem, locationId, gameMode, squadSize)
  }
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

  const best = Math.min(...rankedNodes.map((node) => node.etcMinutes))
  return rankedNodes.filter((node) => Math.abs(node.etcMinutes - best) <= ETC_TIE_EPSILON)
}

/** Mirrors WASM Pass 2 and returns the step-by-step farming itinerary. */
export function simulateRoutePlan(
  startNode: RankedNode,
  objectives: Objective[],
  globalBest: Map<string, ItemBestNode>,
  arsenal: ArsenalState,
): RoutePlan | null {
  const yields = yieldsAtNode(startNode)
  let bestTarget: string | null = null
  let bestTotal = Number.POSITIVE_INFINITY

  for (const objective of objectives) {
    const yTarget = yields.get(objective.itemName) ?? 0
    if (yTarget <= 0) continue

    const timeHere = farmMinutesAtNode(
      objective.targetQuantity,
      yTarget,
      startNode.locationId,
      startNode.gameMode,
      arsenal.squadSize,
    )
    let remaining = 0

    for (const item of objectives) {
      const yj = yields.get(item.itemName) ?? 0
      let qRemaining = item.targetQuantity - yj * timeHere
      if (qRemaining < 0.0001) qRemaining = 0
      if (qRemaining <= 0) continue

      const best = globalBest.get(item.itemName)
      if (!best || best.yield <= 0) {
        remaining += 99_999
      } else {
        remaining += farmMinutesAtNode(
          qRemaining,
          best.yield,
          best.node.locationId,
          best.node.gameMode,
          arsenal.squadSize,
        )
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
  const primaryMinutes = farmMinutesAtNode(
    primaryObjective.targetQuantity,
    yPrimary,
    startNode.locationId,
    startNode.gameMode,
    arsenal.squadSize,
  )

  const startNodeItems: RouteStepItem[] = []
  for (const item of objectives) {
    const yj = yields.get(item.itemName) ?? 0
    if (yj > 0) {
      const farmed = Math.min(item.targetQuantity, yj * primaryMinutes)
      if (farmed >= 0.0001) {
        startNodeItems.push({
          itemName: item.itemName,
          quantity: farmed,
        })
      }
    }
  }

  const steps: RouteStep[] = [
    {
      stepNumber: 1,
      locationId: startNode.locationId,
      gameMode: startNode.gameMode,
      itemName: bestTarget,
      quantity: primaryObjective.targetQuantity,
      estimatedMinutes: primaryMinutes,
      warnings: supplementWarnings(startNode),
      items: startNodeItems,
    },
  ]

  const cleanup: RouteStep[] = []

  for (const item of objectives) {
    const yj = yields.get(item.itemName) ?? 0
    let qRemaining = item.targetQuantity - yj * primaryMinutes
    if (qRemaining < 0.0001) qRemaining = 0
    if (qRemaining <= 0) continue

    const best = globalBest.get(item.itemName)
    if (!best || best.yield <= 0) continue

    cleanup.push({
      stepNumber: 0,
      locationId: best.node.locationId,
      gameMode: best.node.gameMode,
      itemName: item.itemName,
      quantity: qRemaining,
      estimatedMinutes: farmMinutesAtNode(
        qRemaining,
        best.yield,
        best.node.locationId,
        best.node.gameMode,
        arsenal.squadSize,
      ),
      warnings: supplementWarnings(best.node),
      items: [{ itemName: item.itemName, quantity: qRemaining }],
    })
  }

  cleanup.sort((a, b) => b.estimatedMinutes - a.estimatedMinutes)
  for (const step of cleanup) {
    step.stepNumber = steps.length + 1
    steps.push(step)
  }

  const consolidated = consolidateSteps(steps)
  const stepSum = consolidated.reduce((sum, step) => sum + step.estimatedMinutes, 0)

  return {
    startingLocationId: startNode.locationId,
    baseEtcMinutes: stepSum,
    finalCostMinutes:
      startNode.etcMinutes > 0 ? stepSum * (startNode.cost / startNode.etcMinutes) : startNode.cost,
    steps: consolidated,
  }
}

export function buildGoldenPath(
  rankedNodes: RankedNode[],
  objectives: Objective[],
  arsenal: ArsenalState,
): GoldenPath | null {
  if (rankedNodes.length === 0 || objectives.length === 0) return null

  const validStarters = filterPlayableNodes(rankedNodes)

  if (validStarters.length === 0) return null

  const tiedNodes = nodesTiedAtBestEtc(validStarters)
  const globalBest = computeGlobalBestNodes(validStarters)

  const plans = tiedNodes
    .map((node) => simulateRoutePlan(node, objectives, globalBest, arsenal))
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
