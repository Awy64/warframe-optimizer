import type { RankedNode } from '../types'

const STATIONARY_MODES = ['Survival', 'Defense', 'Interception']

export function supplementWarnings(node: RankedNode): string[] {
  const warnings = [...node.warnings]

  if (STATIONARY_MODES.some((m) => node.gameMode.includes(m))) {
    const msg = 'Requires stationary camp'
    if (!warnings.includes(msg)) warnings.push(msg)
  }

  if (node.maxEnemyLevel >= 50) {
    const msg = 'Requires high-survivability loadout'
    if (!warnings.includes(msg)) warnings.push(msg)
  }

  return warnings
}
