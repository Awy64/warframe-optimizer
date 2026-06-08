export function locationId(planet: string, nodeName: string): string {
  return `${planet} - ${nodeName}`
}

export function bountyLocationId(region: string, bountyLevel: string): string {
  return `${region} Bounty - ${bountyLevel}`
}

/** Strip WFCD quantity prefixes like "2X Orokin Cell" or "400 Endo" → item name. */
export function normalizeItemName(raw: string): string {
  return raw
    .replace(/^[\d,]+[xX]\s+/, '')
    .replace(/^\d+\s+/, '')
    .trim()
}

/**
 * Parse the bundle quantity encoded in a WFCD reward string.
 * "4000 Endo" → 4000, "8X Techrot Motherboard" → 8, "Orokin Cell" → 1.
 */
export function parseItemQuantity(raw: string): number {
  const mult = raw.match(/^([\d,]+)[xX]\s+/)
  if (mult) return parseInt(mult[1].replace(/,/g, ''), 10) || 1
  const lead = raw.match(/^([\d,]+)\s+/)
  if (lead) return parseInt(lead[1].replace(/,/g, ''), 10) || 1
  return 1
}
