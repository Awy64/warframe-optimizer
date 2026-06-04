import { usePrapaEngine } from '../../hooks/usePrapaEngine'
import { useOptimizerStore } from '../../stores/optimizerStore'
import { NodeCard } from './NodeCard'

export function MissionBoard() {
  const { rankedNodes, loading, error } = usePrapaEngine()
  const objectives = useOptimizerStore((s) => s.objectives)
  const skillCoefficient = useOptimizerStore((s) => s.skillCoefficient)

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
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-100">Mission Board</h2>
        <span className="text-sm text-tenno-muted">{rankedNodes.length} nodes ranked</span>
      </header>

      {skillCoefficient <= 0.3 && (
        <p className="mb-4 text-sm text-tenno-muted">
          Novice skill: expert nodes (Descendia, Omnia Cascades, Arbitration) are hidden.
        </p>
      )}

      <div className="space-y-3">
        {rankedNodes.slice(0, 50).map((node) => (
          <NodeCard key={node.locationId} node={node} />
        ))}
      </div>
    </div>
  )
}
