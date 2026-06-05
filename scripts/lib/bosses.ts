export function enemyNameFromLocationId(locationId: string): string | null {
  const match = locationId.match(/^(?:Boss|Enemy) - (.+)$/)
  return match?.[1] ?? null
}
