import type { RankedNode } from '../types'

const DEEP_DIVE_LIMIT = 20

const VIRTUAL_ENTITY_PREFIX = /^(?:Boss|Enemy) - /

const VIRTUAL_GAME_MODES = new Set(['Enemy Drop', 'Boss'])

/** Star Chart nodes only — excludes virtual entity metadata used for drop reference rows. */
export function isPlayableNode(node: RankedNode): boolean {
  if (VIRTUAL_ENTITY_PREFIX.test(node.locationId)) return false
  if (VIRTUAL_GAME_MODES.has(node.gameMode)) return false
  return true
}

export function filterPlayableNodes(rankedNodes: RankedNode[]): RankedNode[] {
  return rankedNodes.filter(isPlayableNode)
}

/** Mission nodes only — hides elite enemy-drop rows that overwhelm the board. */
export function filterDeepDiveNodes(rankedNodes: RankedNode[]): RankedNode[] {
  return filterPlayableNodes(rankedNodes).slice(0, DEEP_DIVE_LIMIT)
}
