import init, { init_engine, compute_ranked_nodes } from '../../wasm/pkg/warframe_prapa_wasm'
import { assetUrl } from '../lib/assets'
import type { RankedNode } from '../types'

let wasmReady = false
let initPromise: Promise<void> | null = null

function wasmErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return 'WASM compute failed'
}

export async function ensureWasm(): Promise<void> {
  if (wasmReady) return
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await init(assetUrl('warframe_prapa_wasm_bg.wasm'))
        const [itemRes, nodeRes] = await Promise.all([
          fetch(assetUrl('item_index.json')),
          fetch(assetUrl('node_levels.json')),
        ])
        if (!itemRes.ok) {
          throw new Error(`Failed to load item index (${itemRes.status})`)
        }
        if (!nodeRes.ok) {
          throw new Error(`Failed to load node levels (${nodeRes.status})`)
        }
        const itemJson = await itemRes.text()
        const nodeJson = await nodeRes.text()
        init_engine(itemJson, nodeJson)
        wasmReady = true
      } catch (err) {
        initPromise = null
        throw err
      }
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

export { wasmErrorMessage }
