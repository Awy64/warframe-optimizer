import type { RankedNode } from '../types'

const DEEP_DIVE_LIMIT = 20

/** Mission nodes only — hides elite enemy-drop rows that overwhelm the board. */
export function filterDeepDiveNodes(rankedNodes: RankedNode[]): RankedNode[] {
  return rankedNodes
    .filter((node) => node.gameMode !== 'Enemy Drop' && !node.locationId.startsWith('Enemy - '))
    .slice(0, DEEP_DIVE_LIMIT)
}
