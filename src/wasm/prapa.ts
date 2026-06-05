import init, { init_engine, compute_ranked_nodes } from '../../wasm/pkg/warframe_prapa_wasm'
import { assetUrl, dataAssetUrl } from '../lib/assets'
import type { PrapaEngineResult, RankedNode } from '../types'

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
          fetch(dataAssetUrl('item_index.json')),
          fetch(dataAssetUrl('node_levels.json')),
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

export function computeEngineResult(
  objectivesJson: string,
  skill: number,
  arsenalJson: string,
): PrapaEngineResult {
  const result = compute_ranked_nodes(objectivesJson, skill, arsenalJson, Date.now())
  const parsed = JSON.parse(result) as PrapaEngineResult | RankedNode[]
  if (Array.isArray(parsed)) {
    return { rankedNodes: parsed, pathingFailures: [] }
  }
  return parsed
}

export function computeNodes(
  objectivesJson: string,
  skill: number,
  arsenalJson: string,
): RankedNode[] {
  return computeEngineResult(objectivesJson, skill, arsenalJson).rankedNodes
}

export { wasmErrorMessage }
