export function locationId(planet: string, nodeName: string): string {
  return `${planet} - ${nodeName}`
}

export function bountyLocationId(region: string, bountyLevel: string): string {
  return `${region} Bounty - ${bountyLevel}`
}

/** Strip WFCD quantity prefixes like "2X Orokin Cell" → "Orokin Cell". */
export function normalizeItemName(raw: string): string {
  return raw.replace(/^[\d,]+[xX]\s+/, '').trim()
}
