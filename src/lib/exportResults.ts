import dataVersion from '../data_version.txt?raw'
import { buildGoldenPath, type RoutePlan, type RouteStep } from './routeItinerary'
import { filterPlayableNodes } from './rankedNodeFilters'
import { supplementWarnings } from './warnings'
import type {
  ArsenalState,
  DropSource,
  ItemIndex,
  Objective,
  RankedNode,
} from '../types'

export interface OptimalRouteExport {
  totalCostMinutes: number
  baseEtcMinutes: number
  tiedNodeCount: number
  tiedLocationIds: string[]
  primaryPlan: RoutePlan
  alternativeStarters: RoutePlan[]
}

export interface PrapaDebugExport {
  exportedAt: string
  dataVersion: string
  inputs: {
    objectives: Objective[]
    skillCoefficient: number
    arsenal: ArsenalState
  }
  summary: {
    rankedNodeCount: number
    optimalRouteCostMinutes: number | null
    optimalRouteTiedNodes: number | null
  }
  optimalRoute: OptimalRouteExport | null
  rankedNodes: PrapaDebugNode[]
}

export interface PrapaDebugNode extends RankedNode {
  rank: number
  warningsResolved: string[]
  dropSources: DropSource[]
}

function dropSourcesForNode(
  itemIndex: ItemIndex | null,
  objectives: Objective[],
  locationId: string,
): DropSource[] {
  if (!itemIndex) return []

  const seen = new Set<string>()
  const sources: DropSource[] = []

  for (const objective of objectives) {
    const itemSources = itemIndex.items[objective.itemName] ?? []
    for (const source of itemSources) {
      if (source.locationId !== locationId) continue
      const key = `${source.dropType}|${source.rotation}|${source.baseChance}|${source.timeGateMinutes ?? ''}`
      if (seen.has(key)) continue
      seen.add(key)
      sources.push(source)
    }
  }

  return sources
}

function optimalRouteExport(
  rankedNodes: RankedNode[],
  objectives: Objective[],
  arsenal: ArsenalState,
): OptimalRouteExport | null {
  const playableNodes = filterPlayableNodes(rankedNodes)
  const goldenPath = buildGoldenPath(playableNodes, objectives, arsenal)
  if (!goldenPath) return null

  return {
    totalCostMinutes: goldenPath.primaryPlan.finalCostMinutes,
    baseEtcMinutes: goldenPath.primaryPlan.baseEtcMinutes,
    tiedNodeCount: goldenPath.tiedNodes.length,
    tiedLocationIds: goldenPath.tiedNodes.map((node) => node.locationId),
    primaryPlan: goldenPath.primaryPlan,
    alternativeStarters: goldenPath.alternativeStarters,
  }
}

export function buildDebugExport(
  rankedNodes: RankedNode[],
  objectives: Objective[],
  skillCoefficient: number,
  arsenal: ArsenalState,
  itemIndex: ItemIndex | null,
): PrapaDebugExport {
  const optimalRoute = optimalRouteExport(rankedNodes, objectives, arsenal)

  return {
    exportedAt: new Date().toISOString(),
    dataVersion: dataVersion.trim(),
    inputs: { objectives, skillCoefficient, arsenal },
    summary: {
      rankedNodeCount: rankedNodes.length,
      optimalRouteCostMinutes: optimalRoute?.totalCostMinutes ?? null,
      optimalRouteTiedNodes: optimalRoute?.tiedNodeCount ?? null,
    },
    optimalRoute,
    rankedNodes: rankedNodes.map((node, index) => ({
      ...node,
      rank: index + 1,
      warningsResolved: supplementWarnings(node),
      dropSources: dropSourcesForNode(itemIndex, objectives, node.locationId),
    })),
  }
}

function timestampForFilename(iso: string): string {
  return iso.replace(/[:.]/g, '-').slice(0, 19)
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadDebugJson(exportData: PrapaDebugExport) {
  const stamp = timestampForFilename(exportData.exportedAt)
  downloadBlob(
    JSON.stringify(exportData, null, 2),
    `prapa-debug-${stamp}.json`,
    'application/json',
  )
}

function csvCell(value: string | number | boolean): string {
  const text = String(value)
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function routeStepsToCsvRows(planLabel: string, plan: RoutePlan): string[] {
  const header = [
    'section',
    'plan',
    'step',
    'locationId',
    'gameMode',
    'itemName',
    'quantity',
    'estimatedMinutes',
    'warnings',
  ].join(',')

  const rows = plan.steps.map((step: RouteStep) =>
    [
      'optimalRoute',
      planLabel,
      step.stepNumber,
      step.locationId,
      step.gameMode,
      step.itemName,
      step.quantity,
      step.estimatedMinutes.toFixed(6),
      step.warnings.join('; '),
    ]
      .map(csvCell)
      .join(','),
  )

  return [header, ...rows]
}

export function debugExportToCsv(exportData: PrapaDebugExport): string {
  const sections: string[] = []

  if (exportData.optimalRoute) {
    const { optimalRoute } = exportData
    sections.push(
      [
        'section,metric,value',
        ['optimalRoute', 'totalCostMinutes', optimalRoute.totalCostMinutes.toFixed(6)]
          .map((v) => csvCell(v))
          .join(','),
        ['optimalRoute', 'baseEtcMinutes', optimalRoute.baseEtcMinutes.toFixed(6)]
          .map((v) => csvCell(v))
          .join(','),
        ['optimalRoute', 'tiedNodeCount', optimalRoute.tiedNodeCount]
          .map((v) => csvCell(v))
          .join(','),
        ['optimalRoute', 'tiedLocationIds', optimalRoute.tiedLocationIds.join('; ')]
          .map((v) => csvCell(v))
          .join(','),
      ].join('\n'),
    )
    sections.push(routeStepsToCsvRows('primary', optimalRoute.primaryPlan).join('\n'))
    for (const alt of optimalRoute.alternativeStarters) {
      sections.push(
        routeStepsToCsvRows(`alternative:${alt.startingLocationId}`, alt).join('\n'),
      )
    }
    sections.push('')
  }

  const headers = [
    'rank',
    'locationId',
    'gameMode',
    'cost',
    'etcMinutes',
    'kpm',
    'frictionPenalty',
    'maxEnemyLevel',
    'matchedItems',
    'dropSourceCount',
    'dropTypes',
    'warnings',
  ]

  const rows = exportData.rankedNodes.map((node) => {
    const matched = node.matchedItems
      .map((item) => `${item.itemName}×${item.targetQuantity}(y=${item.yItem.toFixed(4)})`)
      .join('; ')
    const dropTypes = [...new Set(node.dropSources.map((s) => s.dropType))].join('; ')
    return [
      node.rank,
      node.locationId,
      node.gameMode,
      node.cost.toFixed(6),
      node.etcMinutes.toFixed(6),
      node.kpm.toFixed(2),
      node.frictionPenalty.toFixed(4),
      node.maxEnemyLevel,
      matched,
      node.dropSources.length,
      dropTypes,
      node.warningsResolved.join('; '),
    ]
      .map(csvCell)
      .join(',')
  })

  sections.push([headers.join(','), ...rows].join('\n'))
  return sections.join('\n')
}

export function downloadDebugCsv(exportData: PrapaDebugExport) {
  const stamp = timestampForFilename(exportData.exportedAt)
  downloadBlob(debugExportToCsv(exportData), `prapa-debug-${stamp}.csv`, 'text/csv')
}

export async function copyDebugJson(exportData: PrapaDebugExport): Promise<void> {
  await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2))
}
