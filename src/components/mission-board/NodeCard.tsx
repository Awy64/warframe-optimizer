import type { RankedNode } from '../../types'
import { supplementWarnings } from '../../lib/warnings'

interface NodeCardProps {
  node: RankedNode
}

export function NodeCard({ node }: NodeCardProps) {
  const warnings = supplementWarnings(node)
  const efficiencyPct = (node.efficiency * 100).toFixed(1)

  return (
    <article className="rounded-lg border border-tenno-border bg-tenno-panel p-4 transition hover:border-orokin-dim">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-100">{node.locationId}</h3>
          <p className="text-sm text-tenno-muted">{node.gameMode}</p>
        </div>
        <div className="text-right">
          <span className="rounded bg-orokin/20 px-2 py-0.5 text-sm font-bold text-orokin">
            {efficiencyPct}% eff
          </span>
          <p className="mt-1 text-xs text-tenno-muted">Cost {node.cost.toFixed(4)}</p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {node.matchedItems.map((item) => (
          <span
            key={item.itemName}
            className="rounded bg-tenno-bg px-2 py-0.5 text-xs text-tenno-cyan"
          >
            {item.itemName} ×{item.targetQuantity}
          </span>
        ))}
      </div>

      {warnings.length > 0 && (
        <ul className="mb-3 space-y-1">
          {warnings.map((w) => (
            <li key={w} className="text-xs text-tenno-danger">
              ⚠ {w}
            </li>
          ))}
        </ul>
      )}

      <details className="text-xs text-tenno-muted">
        <summary className="cursor-pointer hover:text-tenno-cyan">Yield details</summary>
        <dl className="mt-2 grid grid-cols-2 gap-1">
          <dt>KPM</dt>
          <dd>{node.kpm.toFixed(1)}</dd>
          <dt>Projected Y</dt>
          <dd>{node.projectedYield.toFixed(4)}</dd>
          <dt>Synergy S_m</dt>
          <dd>{node.synergyMultiplier.toFixed(2)}</dd>
          <dt>Friction F_p</dt>
          <dd>{node.frictionPenalty.toFixed(3)}</dd>
          <dt>Max enemy lvl</dt>
          <dd>{node.maxEnemyLevel}</dd>
        </dl>
      </details>
    </article>
  )
}
