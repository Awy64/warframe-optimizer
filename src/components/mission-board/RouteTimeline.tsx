import { formatDuration } from '../../lib/formatDuration'
import { useOptimizerStore } from '../../stores/optimizerStore'
import { useMemo } from 'react'

interface RouteStep {
  stepNumber: number
  locationId: string
  gameMode: string
  itemName: string
  quantity: number
  estimatedMinutes: number
  warnings: string[]
  items?: Array<{ itemName: string; quantity: number }>
}

interface RouteTimelineProps {
  plan: {
    steps: RouteStep[]
  }
  compact?: boolean
}

function StepRow({
  step,
  isLast,
  compact,
}: {
  step: RouteStep
  isLast: boolean
  compact: boolean
}) {
  const itemIndex = useOptimizerStore((s) => s.itemIndex)

  const targetSuffix = useMemo(() => {
    if (!itemIndex) return ''
    const targets: string[] = []
    const itemNames = step.items && step.items.length > 0
      ? step.items.map(i => i.itemName)
      : [step.itemName]

    for (const itemName of itemNames) {
      const sources = itemIndex.items[itemName] ?? []
      const matchedSource = sources.find((s) => s.locationId === step.locationId)
      if (matchedSource?.sourceEntity) {
        targets.push(matchedSource.sourceEntity)
      }
    }
    if (targets.length === 0) return ''
    const uniqueTargets = Array.from(new Set(targets))
    return ` (Target: ${uniqueTargets.join(', ')})`
  }, [itemIndex, step.locationId, step.items, step.itemName])

  return (
    <li className={`relative flex gap-4.5 ${compact ? 'pb-4' : 'pb-6'} last:pb-0`}>
      {!isLast && (
        <span
          className="absolute left-[14px] top-7.5 h-[calc(100%-1rem)] w-0.5 bg-orokin-dim/20 shadow-[0_0_4px_rgba(200,169,81,0.1)]"
          aria-hidden
        />
      )}

      <div
        className={`flex shrink-0 items-center justify-center rounded-full border border-orokin bg-orokin/10 font-extrabold text-orokin shadow-[0_0_8px_rgba(200,169,81,0.2)] ${
          compact ? 'h-7.5 w-7.5 text-xs' : 'h-8.5 w-8.5 text-sm'
        }`}
      >
        {step.stepNumber}
      </div>

      <div
        className={`min-w-0 flex-1 rounded-lg border border-tenno-border bg-tenno-panel/20 ${
          compact ? 'p-3' : 'p-4'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`font-bold text-gray-200 uppercase tracking-wide ${compact ? 'text-xs' : 'text-sm'}`}>
              {step.locationId}{targetSuffix}
            </p>
            <p className="text-[10px] text-tenno-muted uppercase tracking-wider font-semibold mt-0.5">
              {step.gameMode}
            </p>
          </div>
          <span className="shrink-0 text-xs font-bold text-orokin uppercase tracking-wide">
            {formatDuration(step.estimatedMinutes, true)}
          </span>
        </div>

        <p className={`mt-2 font-bold text-tenno-cyan uppercase tracking-wider ${compact ? 'text-[10px]' : 'text-xs'}`}>
          Farm{' '}
          {step.items && step.items.length > 0
            ? step.items.map((item) => `${Math.ceil(item.quantity)}× ${item.itemName}`).join(', ')
            : `${Math.ceil(step.quantity)}× ${step.itemName}`}
        </p>

        {step.warnings.length > 0 && (
          <ul className="mt-2 space-y-1 rounded bg-amber-500/5 border border-amber-500/10 p-2">
            {step.warnings.map((warning) => (
              <li key={warning} className="text-[10px] font-semibold text-amber-400 flex items-center gap-1">
                <span>⚠</span>
                <span>{warning}</span>
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
    <ol className="list-none p-0 m-0">
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

