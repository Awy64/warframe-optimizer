import { useOptimizerStore } from '../../stores/optimizerStore'

export function ObjectiveCart() {
  const objectives = useOptimizerStore((s) => s.objectives)
  const removeObjective = useOptimizerStore((s) => s.removeObjective)
  const updateObjectiveQuantity = useOptimizerStore((s) => s.updateObjectiveQuantity)

  if (objectives.length === 0) {
    return (
      <p className="text-xs text-tenno-muted italic">No objectives selected. Search and add items above.</p>
    )
  }

  return (
    <ul className="space-y-2">
      {objectives.map((obj) => (
        <li
          key={obj.itemName}
          className="flex items-center justify-between gap-3 rounded-lg border border-tenno-border bg-tenno-panel/40 px-3 py-2 transition duration-200 hover:border-tenno-border-hover hover:bg-tenno-panel/60"
        >
          <span className="flex-1 truncate text-xs font-semibold uppercase tracking-wider text-orokin-dim hover:text-orokin transition duration-150">
            {obj.itemName}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => updateObjectiveQuantity(obj.itemName, obj.targetQuantity - 1)}
              disabled={obj.targetQuantity <= 1}
              className="flex h-6 w-6 items-center justify-center rounded border border-tenno-border bg-tenno-bg text-xs font-bold text-tenno-muted hover:border-tenno-cyan hover:text-tenno-cyan disabled:opacity-30 disabled:hover:border-tenno-border disabled:hover:text-tenno-muted transition duration-150"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              value={obj.targetQuantity}
              onChange={(e) =>
                updateObjectiveQuantity(obj.itemName, parseInt(e.target.value, 10) || 1)
              }
              className="w-14 rounded border border-tenno-border bg-tenno-bg py-0.5 text-center text-xs font-bold text-gray-100 transition duration-200 focus:border-tenno-cyan focus:shadow-[0_0_8px_rgba(78,205,196,0.15)] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => updateObjectiveQuantity(obj.itemName, obj.targetQuantity + 1)}
              className="flex h-6 w-6 items-center justify-center rounded border border-tenno-border bg-tenno-bg text-xs font-bold text-tenno-muted hover:border-tenno-cyan hover:text-tenno-cyan transition duration-150"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => removeObjective(obj.itemName)}
            className="flex h-6 w-6 items-center justify-center rounded border border-transparent text-sm text-tenno-muted hover:border-tenno-danger/30 hover:bg-tenno-danger/10 hover:text-tenno-danger transition duration-150"
            aria-label={`Remove ${obj.itemName}`}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  )
}

