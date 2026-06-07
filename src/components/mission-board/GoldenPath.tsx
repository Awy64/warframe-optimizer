import { useState, useMemo } from 'react'
import { formatDuration } from '../../lib/formatDuration'
import type { RoutePlan, RouteStep } from '../../lib/routeItinerary'
import { RouteTimeline } from './RouteTimeline'
import { useOptimizerStore } from '../../stores/optimizerStore'

interface GoldenPathProps {
  goldenPath: {
    primaryPlan: RoutePlan
    alternativeStarters: RoutePlan[]
  }
  onSelectStarter: (locationId: string) => void
}

export function GoldenPath({ goldenPath, onSelectStarter }: GoldenPathProps) {
  const { primaryPlan, alternativeStarters } = goldenPath
  const [showAlternatives, setShowAlternatives] = useState(false)
  const totalLabel = formatDuration(primaryPlan.baseEtcMinutes, true)
  const itemIndex = useOptimizerStore((s) => s.itemIndex)

  const getTargetSuffix = (locationId: string, steps: RouteStep[]) => {
    if (!itemIndex) return ''
    const step = steps.find(s => s.locationId === locationId)
    if (!step) return ''
    const targets: string[] = []
    const itemNames = step.items && step.items.length > 0
      ? step.items.map(i => i.itemName)
      : [step.itemName]
    for (const itemName of itemNames) {
      const sources = itemIndex.items[itemName] ?? []
      const matchedSource = sources.find((s) => s.locationId === locationId)
      if (matchedSource?.sourceEntity) {
        targets.push(matchedSource.sourceEntity)
      }
    }
    if (targets.length === 0) return ''
    const uniqueTargets = Array.from(new Set(targets))
    return ` (Target: ${uniqueTargets.join(', ')})`
  }

  const primarySuffix = useMemo(() => {
    return getTargetSuffix(primaryPlan.startingLocationId, primaryPlan.steps)
  }, [itemIndex, primaryPlan])

  return (
    <section className="overflow-hidden rounded-xl border border-orokin/30 bg-gradient-to-b from-tenno-panel/90 to-tenno-panel/40 shadow-lg shadow-black/30">
      <header className="border-b border-tenno-border px-5 py-4 bg-tenno-panel/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orokin">
              Golden Path
            </p>
            <h3 className="mt-1 text-lg font-extrabold text-gray-100 uppercase tracking-wide">
              {totalLabel} Route Plan
            </h3>
            <p className="mt-1 text-xs text-tenno-muted">
              Optimal starting location:{' '}
              <span className="text-tenno-cyan font-bold">{primaryPlan.startingLocationId}{primarySuffix}</span>
            </p>
          </div>
          {alternativeStarters.length > 0 && (
            <span className="rounded-full border border-orokin/40 bg-orokin/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orokin">
              {alternativeStarters.length + 1} Starters Tied
            </span>
          )}
        </div>
      </header>

      <div className="p-5">
        <RouteTimeline plan={primaryPlan} />

        {alternativeStarters.length > 0 && (
          <div className="mt-5 border-t border-tenno-border pt-4">
            <button
              type="button"
              onClick={() => setShowAlternatives((open) => !open)}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-tenno-border/60 bg-tenno-bg/40 px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-tenno-cyan hover:border-tenno-cyan/40 hover:text-orokin hover:bg-tenno-cyan/5 transition duration-150"
              aria-expanded={showAlternatives}
            >
              <span>
                Alternative Starters Available
                <span className="ml-2 text-[10px] text-tenno-muted font-normal normal-case">
                  ({alternativeStarters.length} same-time option
                  {alternativeStarters.length === 1 ? '' : 's'})
                </span>
              </span>
              <span className="text-tenno-muted" aria-hidden>
                {showAlternatives ? '▾' : '▸'}
              </span>
            </button>

            {showAlternatives && (
              <div className="mt-3 space-y-3">
                {alternativeStarters.map((plan) => {
                  const altSuffix = getTargetSuffix(plan.startingLocationId, plan.steps)
                  return (
                    <button
                      key={plan.startingLocationId}
                      type="button"
                      onClick={() => onSelectStarter(plan.startingLocationId)}
                      className="w-full text-left rounded-lg border border-tenno-border bg-tenno-bg/20 p-3 hover:border-tenno-cyan/40 hover:bg-tenno-cyan/5 transition duration-150 cursor-pointer group block"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-200 group-hover:text-tenno-cyan transition">
                          Start at {plan.startingLocationId}{altSuffix}
                          <span className="ml-2 text-[10px] font-normal text-tenno-muted">
                            ({formatDuration(plan.baseEtcMinutes, true)} total)
                          </span>
                        </p>
                        <span className="text-[10px] font-bold text-tenno-cyan uppercase tracking-wider opacity-0 group-hover:opacity-100 transition duration-150">
                          Select Route &rarr;
                        </span>
                      </div>
                      <div className="mt-2.5">
                        <RouteTimeline plan={plan} compact />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

