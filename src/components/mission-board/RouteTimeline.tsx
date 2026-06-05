import { formatDuration } from '../../lib/formatDuration'
import type { RoutePlan } from '../../lib/routeItinerary'

interface RouteTimelineProps {
  plan: RoutePlan
  compact?: boolean
}

function StepRow({
  step,
  isLast,
  compact,
}: {
  step: RoutePlan['steps'][number]
  isLast: boolean
  compact: boolean
}) {
  return (
    <li className={`relative flex gap-3 ${compact ? 'pb-4' : 'pb-6'} last:pb-0`}>
      {!isLast && (
        <span
          className="absolute left-[13px] top-7 h-[calc(100%-0.75rem)] w-px bg-orokin-dim/35"
          aria-hidden
        />
      )}

      <div
        className={`flex shrink-0 items-center justify-center rounded-full border border-orokin/50 bg-orokin/10 font-bold text-orokin ${
          compact ? 'h-7 w-7 text-xs' : 'h-8 w-8 text-sm'
        }`}
      >
        {step.stepNumber}
      </div>

      <div
        className={`min-w-0 flex-1 rounded-lg border border-tenno-border/80 bg-tenno-bg/50 ${
          compact ? 'p-2.5' : 'p-3'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`font-semibold text-gray-100 ${compact ? 'text-sm' : ''}`}>
              {step.locationId}
            </p>
            <p className="text-xs text-tenno-muted">{step.gameMode}</p>
          </div>
          <span className="shrink-0 text-xs font-medium text-orokin">
            {formatDuration(step.estimatedMinutes, true)}
          </span>
        </div>

        <p className={`mt-1.5 text-tenno-cyan ${compact ? 'text-xs' : 'text-sm'}`}>
          Farm {step.quantity}× {step.itemName}
        </p>

        {step.warnings.length > 0 && (
          <ul className="mt-1.5 space-y-0.5">
            {step.warnings.map((warning) => (
              <li key={warning} className="text-xs text-amber-400/90">
                {warning}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}

export function RouteTimeline({ plan, compact = false }: RouteTimelineProps) {
  return (
    <ol className="list-none">
      {plan.steps.map((step, index) => (
        <StepRow
          key={`${step.stepNumber}-${step.locationId}-${step.itemName}`}
          step={step}
          isLast={index === plan.steps.length - 1}
          compact={compact}
        />
      ))}
    </ol>
  )
}
