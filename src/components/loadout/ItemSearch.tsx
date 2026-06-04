import { useMemo, useState } from 'react'
import { useOptimizerStore } from '../../stores/optimizerStore'

export function ItemSearch() {
  const itemIndex = useOptimizerStore((s) => s.itemIndex)
  const addObjective = useOptimizerStore((s) => s.addObjective)
  const objectives = useOptimizerStore((s) => s.objectives)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const results = useMemo(() => {
    if (!itemIndex || query.length < 1) return []
    const q = query.toLowerCase()
    return itemIndex.itemNames
      .filter((name) => name.toLowerCase().includes(q))
      .filter((name) => !objectives.some((o) => o.itemName === name))
      .sort((a, b) => {
        const al = a.toLowerCase()
        const bl = b.toLowerCase()
        const aStarts = al.startsWith(q) ? 0 : 1
        const bStarts = bl.startsWith(q) ? 0 : 1
        if (aStarts !== bStarts) return aStarts - bStarts
        return al.localeCompare(bl)
      })
      .slice(0, 12)
  }, [itemIndex, query, objectives])

  return (
    <div className="relative">
      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-tenno-muted">
        Search Items
      </label>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Orokin Cell, Plastids..."
        className="w-full rounded border border-tenno-border bg-tenno-bg px-3 py-2 text-sm text-gray-100 placeholder:text-tenno-muted focus:border-orokin focus:outline-none"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded border border-tenno-border bg-tenno-panel shadow-lg">
          {results.map((name) => (
            <li key={name}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-tenno-border/50 hover:text-orokin"
                onClick={() => {
                  addObjective(name)
                  setQuery('')
                  setOpen(false)
                }}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
