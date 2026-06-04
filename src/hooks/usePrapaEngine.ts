import { useEffect, useMemo, useState } from 'react'
import { useOptimizerStore } from '../stores/optimizerStore'
import type { RankedNode } from '../types'
import { computeNodes, ensureWasm, wasmErrorMessage } from '../wasm/prapa'

export function usePrapaEngine() {
  const objectives = useOptimizerStore((s) => s.objectives)
  const skillCoefficient = useOptimizerStore((s) => s.skillCoefficient)
  const arsenal = useOptimizerStore((s) => s.arsenal)

  const [rankedNodes, setRankedNodes] = useState<RankedNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputKey = useMemo(
    () => JSON.stringify({ objectives, skillCoefficient, arsenal }),
    [objectives, skillCoefficient, arsenal],
  )

  useEffect(() => {
    if (objectives.length === 0) {
      setRankedNodes([])
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        await ensureWasm()
        if (cancelled) return
        const nodes = computeNodes(
          JSON.stringify(objectives),
          skillCoefficient,
          JSON.stringify(arsenal),
        )
        if (!cancelled) setRankedNodes(nodes)
      } catch (err) {
        if (!cancelled) {
          setError(wasmErrorMessage(err))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 150)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [inputKey, objectives, skillCoefficient, arsenal])

  return { rankedNodes, loading, error }
}
