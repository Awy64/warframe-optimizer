import init, { init_engine, compute_ranked_nodes } from '../../wasm/pkg/warframe_prapa_wasm'
import type { RankedNode } from '../types'

let wasmReady = false
let initPromise: Promise<void> | null = null

export async function ensureWasm(): Promise<void> {
  if (wasmReady) return
  if (!initPromise) {
    initPromise = (async () => {
      await init()
      const [itemRes, nodeRes] = await Promise.all([
        fetch('/item_index.json'),
        fetch('/node_levels.json'),
      ])
      const itemJson = await itemRes.text()
      const nodeJson = await nodeRes.text()
      init_engine(itemJson, nodeJson)
      wasmReady = true
    })()
  }
  await initPromise
}

export function computeNodes(
  objectivesJson: string,
  skill: number,
  arsenalJson: string,
): RankedNode[] {
  const result = compute_ranked_nodes(objectivesJson, skill, arsenalJson, Date.now())
  return JSON.parse(result) as RankedNode[]
}
