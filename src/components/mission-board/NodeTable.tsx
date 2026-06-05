import { useMemo, useState } from 'react'
import { formatDuration } from '../../lib/formatDuration'

interface MatchedItem {
  itemName: string
  yItem: number
}

interface RankedNodeRow {
  rank: number
  locationId: string
  gameMode: string
  cost: number
  etcMinutes: number
  matchedItems: MatchedItem[]
  warningsResolved: string[]
}

interface NodeTableProps {
  nodes: RankedNodeRow[]
  displayLimit: number
}

type SortField = 'rank' | 'locationId' | 'gameMode' | 'cost'

function getEnemyLocationDescription(locationId: string): string {
  const id = locationId.toLowerCase()
  if (
    id.includes('angst') ||
    id.includes('misery') ||
    id.includes('malice') ||
    id.includes('violence') ||
    id.includes('torment') ||
    id.includes('mania')
  ) {
    return 'Spawns dynamically in any Steel Path mission.'
  }
  if (id.includes('corrupted vor')) {
    return 'Spawns in high-level Void missions (Mot, Mithra, Aten, Marduk).'
  }
  if (id.includes('sister of parvos')) {
    return 'Spawns in Corpus ship missions via Granum Void (Hard Mode).'
  }
  if (id.includes('sentient') || id.includes('eidolon')) {
    return 'Spawns on Earth (Plains of Eidolon) at night.'
  }
  if (id.includes('executioner')) {
    return 'Found in Rathuum Arenas (Sedna - Yam/Vodyanoi).'
  }
  if (id.includes('demolisher')) {
    return 'Found in Disruption missions (e.g., Uranus - Ur, Sedna - Kelpie).'
  }
  if (id.includes('tusk')) {
    return 'Found on Earth (Plains of Eidolon).'
  }
  if (id.includes('vapos')) {
    return 'Found on Jupiter (Corpus Gas City nodes).'
  }
  if (
    id.includes('taro') ||
    id.includes('axio') ||
    id.includes('vorac') ||
    id.includes('orm')
  ) {
    return 'Found in Railjack Corpus missions or Orb Vallis/Deimos.'
  }
  if (id.includes('kuva')) {
    return 'Found on the Kuva Fortress.'
  }
  if (id.includes('scaldra') || id.includes('techrot') || id.includes('h-09')) {
    return 'Found in Höllvania / 1999 missions.'
  }
  if (
    id.includes('grineer') ||
    id.includes('lancer') ||
    id.includes('trooper') ||
    id.includes('heavy gunner') ||
    id.includes('eviscerator') ||
    id.includes('bombard') ||
    id.includes('butcher')
  ) {
    return 'Spawns in standard Grineer mission nodes.'
  }
  if (
    id.includes('corpus') ||
    id.includes('crewman') ||
    id.includes('moa') ||
    id.includes('osprey')
  ) {
    return 'Spawns in standard Corpus mission nodes.'
  }
  if (
    id.includes('infested') ||
    id.includes('charger') ||
    id.includes('runner') ||
    id.includes('leaper') ||
    id.includes('ancient')
  ) {
    return 'Spawns in standard Infested nodes / Dark Sectors.'
  }
  return 'Spawns in missions matching this enemy faction and level.'
}

export function NodeTable({ nodes, displayLimit }: NodeTableProps) {
  const [sortBy, setSortBy] = useState<SortField>('rank')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortDirection('asc')
    }
  }

  const getCumulativeYield = (node: RankedNodeRow) => {
    return node.matchedItems.reduce((sum, item) => sum + item.yItem, 0)
  }

  // Sort nodes with tie-breaker logic
  const sortedNodes = useMemo(() => {
    const sorted = [...nodes]
    sorted.sort((a, b) => {
      // Helper to handle ties
      const handleTies = () => {
        const yieldA = getCumulativeYield(a)
        const yieldB = getCumulativeYield(b)
        // Highest yield first
        return yieldB - yieldA
      }

      if (sortBy === 'rank') {
        if (Math.abs(a.etcMinutes - b.etcMinutes) < 1e-5) {
          return handleTies()
        }
        return sortDirection === 'asc' ? a.rank - b.rank : b.rank - a.rank
      }
      if (sortBy === 'locationId') {
        return sortDirection === 'asc'
          ? a.locationId.localeCompare(b.locationId)
          : b.locationId.localeCompare(a.locationId)
      }
      if (sortBy === 'gameMode') {
        return sortDirection === 'asc'
          ? a.gameMode.localeCompare(b.gameMode)
          : b.gameMode.localeCompare(a.gameMode)
      }
      if (sortBy === 'cost') {
        if (Math.abs(a.etcMinutes - b.etcMinutes) < 1e-5) {
          return handleTies()
        }
        return sortDirection === 'asc' ? a.cost - b.cost : b.cost - a.cost
      }
      return 0
    })
    return sorted
  }, [nodes, sortBy, sortDirection])

  const visibleNodes = useMemo(() => {
    return sortedNodes.slice(0, displayLimit)
  }, [sortedNodes, displayLimit])

  const renderSortIndicator = (field: SortField) => {
    if (sortBy !== field) return <span className="ml-1 text-tenno-muted opacity-40">↕</span>
    return sortDirection === 'asc' ? (
      <span className="ml-1 text-tenno-cyan">▲</span>
    ) : (
      <span className="ml-1 text-tenno-cyan">▼</span>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-tenno-border bg-tenno-panel/20">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="border-b border-tenno-border bg-tenno-panel/80 uppercase font-semibold text-tenno-muted">
          <tr>
            <th
              onClick={() => toggleSort('rank')}
              className="cursor-pointer px-4 py-3 select-none hover:text-gray-100"
            >
              Rank {renderSortIndicator('rank')}
            </th>
            <th
              onClick={() => toggleSort('locationId')}
              className="cursor-pointer px-4 py-3 select-none hover:text-gray-100"
            >
              Node Name / Location {renderSortIndicator('locationId')}
            </th>
            <th
              onClick={() => toggleSort('gameMode')}
              className="cursor-pointer px-4 py-3 select-none hover:text-gray-100"
            >
              Game Mode {renderSortIndicator('gameMode')}
            </th>
            <th
              onClick={() => toggleSort('cost')}
              className="cursor-pointer px-4 py-3 select-none hover:text-gray-100"
            >
              Total ETC {renderSortIndicator('cost')}
            </th>
            <th className="px-4 py-3">Matched Items & Yields</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-tenno-border/40">
          {visibleNodes.map((node) => {
            const isEnemyNode = node.locationId.startsWith('Enemy - ')
            return (
              <tr
                key={node.locationId}
                className="transition duration-150 hover:bg-tenno-panel/30"
              >
                <td className="px-4 py-3 font-semibold text-tenno-cyan">#{node.rank}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 font-bold text-gray-200">
                      <span>{node.locationId}</span>
                      {node.warningsResolved.length > 0 && (
                        <span className="group relative inline-flex">
                          <button
                            type="button"
                            aria-label={`Warnings: ${node.warningsResolved.join('. ')}`}
                            className="flex h-4.5 w-4.5 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 text-[9px] font-bold text-amber-400 hover:border-amber-400/60"
                          >
                            !
                          </button>
                          <span
                            role="tooltip"
                            className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-48 -translate-x-1/2 rounded border border-amber-500/30 bg-tenno-bg px-2.5 py-1.5 text-left text-[11px] text-amber-100 shadow-xl group-hover:block group-focus-within:block"
                          >
                            <ul className="list-disc list-inside space-y-0.5">
                              {node.warningsResolved.map((w) => (
                                <li key={w}>{w}</li>
                              ))}
                            </ul>
                          </span>
                        </span>
                      )}
                    </div>
                    {isEnemyNode && (
                      <span className="mt-0.5 text-[10px] text-tenno-muted italic">
                        Spawns: {getEnemyLocationDescription(node.locationId)}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-tenno-muted">{node.gameMode}</td>
                <td className="px-4 py-3 font-medium text-orokin">
                  {formatDuration(node.cost, true)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {node.matchedItems.map((item) => (
                      <div
                        key={item.itemName}
                        className="flex items-center gap-1 rounded bg-tenno-bg px-2 py-0.5 border border-tenno-border/60"
                      >
                        <span className="text-[10px] font-bold text-tenno-cyan">
                          {item.itemName}
                        </span>
                        <span className="text-[9px] text-orokin font-semibold">
                          {item.yItem.toFixed(3)}/m
                        </span>
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
