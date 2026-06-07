import type { RankedNode } from '../../types'
import { formatDuration, formatEtaBadge } from '../../lib/formatDuration'
import { farmMinutesAtNode, type ItemBestNode } from '../../lib/routeItinerary'
import { useOptimizerStore } from '../../stores/optimizerStore'
import { supplementWarnings } from '../../lib/warnings'
import { etcBadgeClasses } from '../../lib/yieldTier'
import { WarningTooltip } from './WarningTooltip'

interface NodeCardProps {
  node: RankedNode
  globalBest: Map<string, ItemBestNode>
  rank: number
}

export function NodeCard({ node, globalBest, rank }: NodeCardProps) {
  const arsenal = useOptimizerStore((s) => s.arsenal)
  const warnings = supplementWarnings(node)
  const uniqueMatches = Array.from(
    new Map(node.matchedItems.map((item) => [item.itemName, item])).values(),
  )

  return (
    <article className="rounded-lg border border-tenno-border bg-tenno-panel p-4 transition hover:border-orokin-dim/60">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-tenno-muted">#{rank}</span>
            <h3 className="truncate font-semibold text-gray-100">{node.locationId}</h3>
            <WarningTooltip warnings={warnings} />
          </div>
          <p className="text-sm text-tenno-muted">{node.gameMode}</p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {uniqueMatches.map((item) => {
          const etaMinutes = farmMinutesAtNode(
            item.targetQuantity,
            item.yItem,
            node.locationId,
            node.gameMode,
            arsenal.squadSize,
          )
          const best = globalBest.get(item.itemName)
          const bestEtaMinutes = best
            ? farmMinutesAtNode(
                item.targetQuantity,
                best.yield,
                best.node.locationId,
                best.node.gameMode,
                arsenal.squadSize,
              )
            : etaMinutes
          const badgeClasses = etcBadgeClasses(etaMinutes, bestEtaMinutes)

          return (
            <div
              key={item.itemName}
              className="flex flex-wrap items-center gap-1.5 rounded-md border border-tenno-border/80 bg-tenno-bg px-2.5 py-1.5"
            >
              <span className="text-xs font-medium text-tenno-cyan">
                {item.itemName}
                {item.targetQuantity > 1 ? ` ×${item.targetQuantity}` : ''}
              </span>
              <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${badgeClasses}`}>
                ETA: {formatDuration(etaMinutes, true)}
              </span>
            </div>
          )
        })}
      </div>

      <details className="text-xs text-tenno-muted">
        <summary className="cursor-pointer hover:text-tenno-cyan">Nerd stats</summary>
        <dl className="mt-2 grid grid-cols-2 gap-1">
          <dt>KPM</dt>
          <dd>{node.kpm.toFixed(1)}</dd>
          <dt>Full route ETC</dt>
          <dd>{formatEtaBadge(node.cost)}</dd>
          <dt>Base ETC</dt>
          <dd>{formatEtaBadge(node.etcMinutes)}</dd>
          <dt>Friction F_p</dt>
          <dd>{node.frictionPenalty.toFixed(3)}</dd>
          <dt>Max enemy lvl</dt>
          <dd>{node.maxEnemyLevel}</dd>
          {uniqueMatches.map((item) => (
            <div key={item.itemName} className="contents">
              <dt>{item.itemName} Y</dt>
              <dd>{item.yItem.toFixed(4)}/min</dd>
            </div>
          ))}
        </dl>
      </details>
    </article>
  )
}
