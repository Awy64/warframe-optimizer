import { useOptimizerStore } from '../../stores/optimizerStore'

export function ObjectiveCart() {
  const objectives = useOptimizerStore((s) => s.objectives)
  const removeObjective = useOptimizerStore((s) => s.removeObjective)
  const updateObjectiveQuantity = useOptimizerStore((s) => s.updateObjectiveQuantity)

  if (objectives.length === 0) {
    return (
      <p className="text-sm text-tenno-muted">No objectives selected. Search and add items above.</p>
    )
  }

  return (
    <ul className="space-y-2">
      {objectives.map((obj) => (
        <li
          key={obj.itemName}
          className="flex items-center gap-2 rounded border border-tenno-border bg-tenno-bg px-2 py-1.5"
        >
          <span className="flex-1 truncate text-sm text-orokin">{obj.itemName}</span>
          <input
            type="number"
            min={1}
            value={obj.targetQuantity}
            onChange={(e) =>
              updateObjectiveQuantity(obj.itemName, parseInt(e.target.value, 10) || 1)
            }
            className="w-16 rounded border border-tenno-border bg-tenno-panel px-2 py-0.5 text-sm"
          />
          <button
            type="button"
            onClick={() => removeObjective(obj.itemName)}
            className="text-tenno-muted hover:text-tenno-danger"
            aria-label={`Remove ${obj.itemName}`}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  )
}
