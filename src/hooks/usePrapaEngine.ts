import { useEffect, useMemo, useState } from 'react'
import { useOptimizerStore } from '../stores/optimizerStore'
import type { RankedNode } from '../types'
import { computeEngineResult, ensureWasm, wasmErrorMessage } from '../wasm/prapa'

export function usePrapaEngine() {
  const objectives = useOptimizerStore((s) => s.objectives)
  const skillCoefficient = useOptimizerStore((s) => s.skillCoefficient)
  const arsenal = useOptimizerStore((s) => s.arsenal)

  const [rankedNodes, setRankedNodes] = useState<RankedNode[]>([])
  const [pathingFailures, setPathingFailures] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputKey = useMemo(
    () => JSON.stringify({ objectives, skillCoefficient, arsenal }),
    [objectives, skillCoefficient, arsenal],
  )

  useEffect(() => {
    if (objectives.length === 0) {
      setRankedNodes([])
      setPathingFailures([])
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        await ensureWasm()
        if (cancelled) return
        const result = computeEngineResult(
          JSON.stringify(objectives),
          skillCoefficient,
          JSON.stringify(arsenal),
        )
        if (!cancelled) {
          setRankedNodes(result.rankedNodes)
          setPathingFailures(result.pathingFailures)
        }
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

  return { rankedNodes, pathingFailures, loading, error }
}
