import { useState } from 'react'
import { formatDuration } from '../../lib/formatDuration'
import type { GoldenPath as GoldenPathResult } from '../../lib/routeItinerary'
import { RouteTimeline } from './RouteTimeline'

interface GoldenPathProps {
  goldenPath: GoldenPathResult
}

export function GoldenPath({ goldenPath }: GoldenPathProps) {
  const { primaryPlan, alternativeStarters, tiedNodes } = goldenPath
  const [showAlternatives, setShowAlternatives] = useState(false)
  const totalLabel = formatDuration(primaryPlan.baseEtcMinutes, true)

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-orokin/40 bg-gradient-to-br from-orokin/10 via-tenno-panel to-tenno-panel shadow-lg shadow-orokin/5">
      <header className="border-b border-orokin/30 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orokin">
              Golden path
            </p>
            <h3 className="mt-1 text-xl font-bold text-gray-100">
              {totalLabel} total route
            </h3>
            <p className="mt-1 text-sm text-tenno-muted">
              Start at{' '}
              <span className="text-gray-200">{primaryPlan.startingLocationId}</span>
            </p>
          </div>
          <span className="rounded-full border border-orokin/30 bg-orokin/10 px-3 py-1 text-xs text-orokin">
            {tiedNodes.length} tied node{tiedNodes.length === 1 ? '' : 's'}
          </span>
        </div>
      </header>

      <div className="px-4 py-4 sm:px-5">
        <RouteTimeline plan={primaryPlan} />

        {alternativeStarters.length > 0 && (
          <div className="mt-5 border-t border-orokin-dim/30 pt-4">
            <button
              type="button"
              onClick={() => setShowAlternatives((open) => !open)}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-tenno-border/60 bg-tenno-bg/40 px-3 py-2 text-left text-sm text-tenno-cyan transition hover:border-orokin-dim/50 hover:text-orokin"
              aria-expanded={showAlternatives}
            >
              <span>
                View alternative routes
                <span className="ml-2 text-xs text-tenno-muted">
                  ({alternativeStarters.length} same-time option
                  {alternativeStarters.length === 1 ? '' : 's'})
                </span>
              </span>
              <span className="text-tenno-muted" aria-hidden>
                {showAlternatives ? '▾' : '▸'}
              </span>
            </button>

            {showAlternatives && (
              <div className="mt-3 space-y-4">
                {alternativeStarters.map((plan) => (
                  <div
                    key={plan.startingLocationId}
                    className="rounded-lg border border-tenno-border/50 bg-tenno-bg/30 p-3"
                  >
                    <p className="mb-3 text-sm font-medium text-gray-200">
                      Start at {plan.startingLocationId}
                      <span className="ml-2 text-xs font-normal text-tenno-muted">
                        ({formatDuration(plan.baseEtcMinutes, true)} total)
                      </span>
                    </p>
                    <RouteTimeline plan={plan} compact />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
