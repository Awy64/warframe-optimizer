/** Human-readable duration from fractional minutes. */
export function formatDuration(minutes: number, approximate = false): string {
  if (!Number.isFinite(minutes) || minutes >= 99_999) return '—'

  const prefix = approximate ? '~' : ''

  if (minutes < 1 / 60) {
    return `${prefix}${Math.max(1, Math.round(minutes * 3600))} ms`
  }

  if (minutes < 1) {
    const seconds = Math.max(1, Math.round(minutes * 60))
    return `${prefix}${seconds} ${seconds === 1 ? 'second' : 'seconds'}`
  }

  if (minutes < 60) {
    const wholeMinutes = Math.floor(minutes)
    const seconds = Math.round((minutes - wholeMinutes) * 60)
    if (seconds === 0) return `${prefix}${wholeMinutes}m`
    return `${prefix}${wholeMinutes}m ${seconds}s`
  }

  const hours = Math.floor(minutes / 60)
  const remMinutes = Math.round(minutes % 60)
  if (remMinutes === 0) return `${prefix}${hours}h`
  return `${prefix}${hours}h ${remMinutes}m`
}

/** Compact ETA badge for ranked node cards. */
export function formatEtaBadge(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes >= 99_999) return '—'
  if (minutes >= 60) return `${(minutes / 60).toFixed(1)} hr`
  return `${minutes.toFixed(1)} mins`
}

/** @deprecated Use formatEtaBadge */
export const formatEtcBadge = formatEtaBadge
