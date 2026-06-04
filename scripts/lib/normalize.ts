export function locationId(planet: string, nodeName: string): string {
  return `${planet} - ${nodeName}`
}

export function bountyLocationId(region: string, bountyLevel: string): string {
  return `${region} Bounty - ${bountyLevel}`
}
