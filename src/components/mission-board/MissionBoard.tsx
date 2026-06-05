import { useMemo } from 'react'
import { usePrapaEngine } from '../../hooks/usePrapaEngine'
import {
  buildDebugExport,
  copyDebugJson,
  downloadDebugCsv,
  downloadDebugJson,
} from '../../lib/exportResults'
import { buildGoldenPath, computeGlobalBestNodes } from '../../lib/routeItinerary'
import { filterDeepDiveNodes } from '../../lib/rankedNodeFilters'
import { useOptimizerStore } from '../../stores/optimizerStore'
import { GoldenPath } from './GoldenPath'
import { NodeCard } from './NodeCard'

export function MissionBoard() {
  const { rankedNodes, pathingFailures, loading, error } = usePrapaEngine()
  const objectives = useOptimizerStore((s) => s.objectives)
  const skillCoefficient = useOptimizerStore((s) => s.skillCoefficient)
  const arsenal = useOptimizerStore((s) => s.arsenal)
  const itemIndex = useOptimizerStore((s) => s.itemIndex)

  const goldenPath = useMemo(
    () => buildGoldenPath(rankedNodes, objectives),
    [rankedNodes, objectives],
  )

  const deepDiveNodes = useMemo(() => filterDeepDiveNodes(rankedNodes), [rankedNodes])
  const globalBest = useMemo(() => computeGlobalBestNodes(rankedNodes), [rankedNodes])

  const debugExport = useMemo(
    () => buildDebugExport(rankedNodes, objectives, skillCoefficient, arsenal, itemIndex),
    [rankedNodes, objectives, skillCoefficient, arsenal, itemIndex],
  )

  const canExport = rankedNodes.length > 0 && !loading

  if (objectives.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-tenno-border">
        <p className="text-tenno-muted">Add items to your objective cart to see ranked farming nodes.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-tenno-panel" />
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="text-tenno-danger">{error}</p>
  }

  return (
    <div>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-100">Mission Board</h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-tenno-muted">{rankedNodes.length} nodes ranked</span>
          {canExport && (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => downloadDebugJson(debugExport)}
                className="rounded border border-tenno-border bg-tenno-panel px-2 py-1 text-xs text-tenno-cyan hover:border-orokin-dim"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => downloadDebugCsv(debugExport)}
                className="rounded border border-tenno-border bg-tenno-panel px-2 py-1 text-xs text-tenno-cyan hover:border-orokin-dim"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => void copyDebugJson(debugExport)}
                className="rounded border border-tenno-border bg-tenno-panel px-2 py-1 text-xs text-tenno-muted hover:border-orokin-dim hover:text-tenno-cyan"
              >
                Copy JSON
              </button>
            </div>
          )}
        </div>
      </header>

      {skillCoefficient <= 0.3 && (
        <p className="mb-4 text-sm text-tenno-muted">
          Novice skill: expert nodes (Descendia, Omnia Cascades, Arbitration) are hidden.
        </p>
      )}

      {pathingFailures.length > 0 && (
        <div className="mb-4 rounded-lg border border-tenno-danger/50 bg-tenno-danger/10 p-4">
          <h3 className="mb-2 text-sm font-semibold text-tenno-danger">Routing blocked</h3>
          <ul className="space-y-1 text-sm text-gray-200">
            {pathingFailures.map((failure) => (
              <li key={failure}>{failure}</li>
            ))}
          </ul>
        </div>
      )}

      {goldenPath && <GoldenPath goldenPath={goldenPath} />}

      <section>
        <header className="mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-tenno-muted">
            Deep dive
          </h3>
          <p className="mt-1 text-xs text-tenno-muted">
            Top {deepDiveNodes.length} mission nodes (enemy-drop rows hidden)
          </p>
        </header>

        <div className="space-y-3">
          {deepDiveNodes.map((node) => (
            <NodeCard
              key={node.locationId}
              node={node}
              globalBest={globalBest}
              rank={rankedNodes.findIndex((n) => n.locationId === node.locationId) + 1}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
