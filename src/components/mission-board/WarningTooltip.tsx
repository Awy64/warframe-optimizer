interface WarningTooltipProps {
  warnings: string[]
}

export function WarningTooltip({ warnings }: WarningTooltipProps) {
  if (warnings.length === 0) return null

  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={`Warnings: ${warnings.join('. ')}`}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 text-[10px] font-bold text-amber-400 hover:border-amber-400/60"
      >
        i
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-56 -translate-x-1/2 rounded border border-amber-500/30 bg-tenno-bg px-2 py-1.5 text-left text-xs text-amber-100 shadow-lg group-hover:block group-focus-within:block"
      >
        <ul className="space-y-0.5">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      </span>
    </span>
  )
}
