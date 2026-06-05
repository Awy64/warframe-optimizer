import { useMemo, useState, useEffect, useRef } from 'react'
import { searchItemNames } from '../../lib/itemSearch'
import { useOptimizerStore } from '../../stores/optimizerStore'

export function ItemSearch() {
  const itemIndex = useOptimizerStore((s) => s.itemIndex)
  const addObjective = useOptimizerStore((s) => s.addObjective)
  const objectives = useOptimizerStore((s) => s.objectives)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    if (!itemIndex || query.trim().length < 1) return []
    return searchItemNames(
      itemIndex.itemNames,
      query,
      objectives.map((o) => o.itemName),
      12,
    )
  }, [itemIndex, query, objectives])

  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(0)
  }, [results])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = results[highlightedIndex]
      if (selected) {
        addObjective(selected)
        setQuery('')
        setOpen(false)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
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
        onKeyDown={handleKeyDown}
        placeholder="Orokin Cell, Plastids..."
        className="w-full rounded border border-tenno-border bg-tenno-bg px-3 py-2 text-sm text-gray-100 placeholder:text-tenno-muted transition duration-200 focus:border-tenno-cyan focus:shadow-[0_0_10px_rgba(78,205,196,0.2)] focus:outline-none"
        aria-autocomplete="list"
        aria-expanded={open && results.length > 0}
        role="combobox"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded border border-tenno-border bg-tenno-panel shadow-lg shadow-black/50 transition duration-150 ease-out">
          {results.map((name, idx) => (
            <li key={name}>
              <button
                type="button"
                className={`w-full px-3 py-2 text-left text-sm transition-colors duration-150 ${
                  idx === highlightedIndex
                    ? 'bg-tenno-border/80 text-tenno-cyan font-medium'
                    : 'text-gray-300 hover:bg-tenno-border/40 hover:text-orokin'
                }`}
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

