import telemetry from '../../data/telemetry.json' with { type: 'json' }

export function rotationMinutes(gameMode: string, rotation: string): number {
  const mode = gameMode.toLowerCase()
  const baselines = telemetry.missionBaselines

  if (mode.includes('survival')) {
    const min = baselines.Survival.minutes
    if (rotation === 'A') return min
    if (rotation === 'B') return min * 3
    if (rotation === 'C') return min * 4
    return min
  }

  if (mode.includes('defense')) {
    const min = baselines.Defense.casualMinutes
    if (rotation === 'A') return min
    if (rotation === 'B') return min * 3
    if (rotation === 'C') return min * 4
    return min
  }

  if (mode.includes('excavation')) {
    const min = baselines.Excavation.expertMinutes
    if (rotation === 'A') return min
    if (rotation === 'B') return min * 3
    if (rotation === 'C') return min * 4
    return min
  }

  if (mode.includes('disruption')) {
    const min = baselines.Disruption.expertMinutes
    if (rotation === 'A') return min
    if (rotation === 'B') return min * 2
    if (rotation === 'C') return min * 3
    return min
  }

  if (mode.includes('capture')) {
    return baselines.Capture.ttxFloorMinutes
  }

  if (mode.includes('exterminate')) {
    return baselines.Exterminate.ttxFloorMinutes
  }

  // Fallback for others
  const ROTATION_MINUTES: Record<string, number> = {
    A: 5,
    B: 15,
    C: 20,
  }
  if (rotation in ROTATION_MINUTES) return ROTATION_MINUTES[rotation]
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
