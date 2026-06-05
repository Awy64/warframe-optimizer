/** Visual tier for a node's ETC relative to the best result in this run (lower minutes = better). */
export type EtcTier = 'top' | 'high' | 'mid' | 'low'

export function etcTier(etcMinutes: number, bestEtcMinutes: number): EtcTier {
  if (bestEtcMinutes <= 0 || etcMinutes <= 0 || !Number.isFinite(etcMinutes)) return 'low'
  const ratio = bestEtcMinutes / etcMinutes
  if (ratio >= 0.95) return 'top'
  if (ratio >= 0.6) return 'high'
  if (ratio >= 0.25) return 'mid'
  return 'low'
}

const TIER_CLASSES: Record<EtcTier, string> = {
  top: 'bg-orokin/20 text-orokin',
  high: 'bg-tenno-cyan/15 text-tenno-cyan',
  mid: 'bg-tenno-border/60 text-gray-300',
  low: 'bg-tenno-panel text-tenno-muted',
}

export function etcBadgeClasses(etcMinutes: number, bestEtcMinutes: number): string {
  return TIER_CLASSES[etcTier(etcMinutes, bestEtcMinutes)]
}
