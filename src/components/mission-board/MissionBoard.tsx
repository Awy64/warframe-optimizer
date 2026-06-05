import { useMemo, useState } from 'react'
import { usePrapaEngine } from '../../hooks/usePrapaEngine'
import {
  buildDebugExport,
  downloadDebugCsv,
  downloadDebugJson,
} from '../../lib/exportResults'
import { useOptimizerStore } from '../../stores/optimizerStore'
import { GoldenPath } from './GoldenPath'
import { NodeTable } from './NodeTable'

export function MissionBoard() {
  const { prapaOutput, loading, error } = usePrapaEngine()
  const objectives = useOptimizerStore((s) => s.objectives)
  const skillCoefficient = useOptimizerStore((s) => s.skillCoefficient)
  const arsenal = useOptimizerStore((s) => s.arsenal)
  const itemIndex = useOptimizerStore((s) => s.itemIndex)

  const [showEnemyDrops, setShowEnemyDrops] = useState(false)
  const [displayLimit, setDisplayLimit] = useState(15)
  const [activeStarterLocationId, setActiveStarterLocationId] = useState<string | null>(null)

  // Swapper logic for active starter plan
  const activeGoldenPath = useMemo(() => {
    if (!prapaOutput || !prapaOutput.optimalRoute) return null

    const { optimalRoute } = prapaOutput
    const primaryPlan = optimalRoute.primaryPlan
    const alternativeStarters = optimalRoute.alternativeStarters || []

    if (!activeStarterLocationId || activeStarterLocationId === primaryPlan.startingLocationId) {
      return {
        primaryPlan,
        alternativeStarters,
        tiedNodes: Array(optimalRoute.tiedNodeCount).fill(null), // Placeholder to maintain length compatibility
      }
    }

    const selectedPlan = alternativeStarters.find(
      (p) => p.startingLocationId === activeStarterLocationId,
    )

    if (!selectedPlan) {
      return {
        primaryPlan,
        alternativeStarters,
        tiedNodes: Array(optimalRoute.tiedNodeCount).fill(null),
      }
    }

    const newAlternatives = [
      primaryPlan,
      ...alternativeStarters.filter((p) => p.startingLocationId !== activeStarterLocationId),
    ]

    return {
      primaryPlan: selectedPlan,
      alternativeStarters: newAlternatives,
      tiedNodes: Array(optimalRoute.tiedNodeCount).fill(null),
    }
  }, [prapaOutput, activeStarterLocationId])

  // Filter ranked nodes based on toggle
  const deepDiveNodes = useMemo(() => {
    if (!prapaOutput) return []
    let list = prapaOutput.rankedNodes
    if (!showEnemyDrops) {
      list = list.filter(
        (node) => node.gameMode !== 'Enemy Drop' && !node.locationId.startsWith('Enemy - '),
      )
    }
    return list
  }, [prapaOutput, showEnemyDrops])

  // Map debug export using internal types
  const debugExport = useMemo(() => {
    if (!prapaOutput) return null
    // Map PrapaOutput nodes back to RankedNode for debug helper
    const rawNodes = prapaOutput.rankedNodes.map((n) => ({
      locationId: n.locationId,
      gameMode: n.gameMode,
      cost: n.cost,
      etcMinutes: n.etcMinutes,
      frictionPenalty: 1.0,
      kpm: 10.0,
      matchedItems: n.matchedItems.map((mi) => ({
        itemName: mi.itemName,
        tadr: 0,
        targetQuantity: 1,
        yItem: mi.yItem,
      })),
      warnings: n.warningsResolved,
      frictionApplied: false,
      maxEnemyLevel: 30,
    }))
    return buildDebugExport(rawNodes, objectives, skillCoefficient, arsenal, itemIndex)
  }, [prapaOutput, objectives, skillCoefficient, arsenal, itemIndex])

  const canExport = prapaOutput && prapaOutput.rankedNodes.length > 0 && !loading

  if (objectives.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-tenno-border bg-tenno-bg/20">
        <p className="text-tenno-muted text-sm uppercase tracking-wider">
          Add items to your objective cart to see ranked farming nodes.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-28 animate-pulse rounded-lg bg-tenno-panel/50 border border-tenno-border/30" />
        <div className="h-64 animate-pulse rounded-lg bg-tenno-panel/30 border border-tenno-border/30" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-tenno-danger/30 bg-tenno-danger/10 p-4 text-tenno-danger font-bold text-sm">
        {error}
      </div>
    )
  }

  const pathingFailures = prapaOutput?.pathingFailures || []

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-tenno-border pb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-100 uppercase tracking-wider">Mission Board</h2>
          <p className="text-xs text-tenno-muted mt-0.5">
            {prapaOutput?.rankedNodes.length || 0} nodes evaluated and ranked
          </p>
        </div>
        {canExport && debugExport && (
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => downloadDebugJson(debugExport)}
              className="rounded border border-tenno-border bg-tenno-panel px-3 py-1.5 text-xs text-tenno-cyan hover:border-tenno-cyan/50 hover:bg-tenno-border/30 transition duration-150"
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={() => downloadDebugCsv(debugExport)}
              className="rounded border border-tenno-border bg-tenno-panel px-3 py-1.5 text-xs text-tenno-cyan hover:border-tenno-cyan/50 hover:bg-tenno-border/30 transition duration-150"
            >
              Export CSV
            </button>
          </div>
        )}
      </header>

      {skillCoefficient <= 0.3 && (
        <div className="rounded-lg border border-tenno-border/80 bg-tenno-panel/20 px-4 py-2.5 text-xs text-tenno-muted">
          <span className="text-orokin font-bold mr-1.5">⚠️ Novice Skill Limit:</span>
          Expert-tier mission nodes (such as Descendia, Omnia Cascades, and Arbitrations) are hidden.
        </div>
      )}

      {pathingFailures.length > 0 && (
        <div className="rounded-lg border border-tenno-danger/40 bg-tenno-danger/10 p-4 shadow-lg shadow-tenno-danger/5">
          <div className="flex items-center gap-2 text-tenno-danger">
            <span className="text-lg">⚠️</span>
            <h3 className="text-sm font-bold uppercase tracking-wider">Routing Blocked</h3>
          </div>
          <ul className="mt-2 space-y-1.5 text-xs text-gray-200 list-disc list-inside">
            {pathingFailures.map((failure) => (
              <li key={failure} className="font-semibold">{failure}</li>
            ))}
          </ul>
        </div>
      )}

      {pathingFailures.length === 0 && activeGoldenPath && (
        <GoldenPath
          goldenPath={activeGoldenPath}
          onSelectStarter={(locationId) => setActiveStarterLocationId(locationId)}
        />
      )}

      <section className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-tenno-muted">Deep Dive</h3>
            <p className="text-xs text-tenno-muted mt-0.5">
              Farming nodes matching your current objectives
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold uppercase tracking-wider text-tenno-muted hover:text-gray-200 transition">
            <input
              type="checkbox"
              checked={showEnemyDrops}
              onChange={(e) => {
                setShowEnemyDrops(e.target.checked)
                setDisplayLimit(15) // Reset limit on toggle
              }}
              className="accent-tenno-cyan"
            />
            Show Virtual Enemy Drops
          </label>
        </header>

        {deepDiveNodes.length > 0 ? (
          <div className="space-y-4">
            <NodeTable nodes={deepDiveNodes} displayLimit={displayLimit} />
            {deepDiveNodes.length > displayLimit && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setDisplayLimit((prev) => prev + 15)}
                  className="rounded border border-tenno-cyan/30 bg-tenno-cyan/5 px-6 py-2 text-xs font-bold uppercase tracking-wider text-tenno-cyan hover:border-tenno-cyan/80 hover:bg-tenno-cyan/15 hover:shadow-[0_0_10px_rgba(78,205,196,0.15)] transition duration-200 cursor-pointer"
                >
                  Load More Nodes
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-tenno-border bg-tenno-bg/25">
            <p className="text-xs text-tenno-muted uppercase tracking-wider">
              No matching nodes found.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

