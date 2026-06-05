import type { NodeMeta } from './types.js'

/** Propagate `descendia` to Dark Refractory / Recall anomaly nodes for friction warnings. */
export function propagateDescendiaTags(nodes: Record<string, NodeMeta>): void {
  for (const node of Object.values(nodes)) {
    const id = node.locationId
    if (
      id.includes('Descendia') ||
      id.includes('Dark Refractory') ||
      id.includes('Recall:')
    ) {
      if (!node.tags.includes('descendia')) {
        node.tags.push('descendia')
      }
    }
  }
}
