const ROTATION_MINUTES: Record<string, number> = {
  A: 5,
  B: 15,
  C: 20,
}

export function rotationMinutes(gameMode: string, rotation: string): number {
  if (rotation in ROTATION_MINUTES) return ROTATION_MINUTES[rotation]
  const mode = gameMode.toLowerCase()
  if (mode.includes('capture')) return 2.5
  if (mode.includes('survival') || mode.includes('defense')) {
    return ROTATION_MINUTES[rotation] ?? 5
  }
  return 5
}

export function computeTadr(baseChance: number, gameMode: string, rotation: string): number {
  const minutes = rotationMinutes(gameMode, rotation)
  return baseChance / minutes
}

export function bountyClearMinutes(bountyLevel: string): number {
  const match = bountyLevel.match(/Level\s+(\d+)\s*-\s*(\d+)/i)
  if (!match) return 20
  const low = parseInt(match[1], 10)
  const high = parseInt(match[2], 10)
  const avg = (low + high) / 2
  if (avg <= 15) return 15
  if (avg <= 30) return 20
  if (avg <= 50) return 25
  return 30
}
