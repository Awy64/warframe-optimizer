import { useEffect, useState, useRef } from 'react'
import { useOptimizerStore } from '../stores/optimizerStore'
import type { PrapaOutput } from '../types'
import { computeEngineResult, ensureWasm, wasmErrorMessage } from '../wasm/prapa'
import { buildGoldenPath } from '../lib/routeItinerary'
import { supplementWarnings } from '../lib/warnings'

export function usePrapaEngine() {
  const objectives = useOptimizerStore((s) => s.objectives)
  const skillCoefficient = useOptimizerStore((s) => s.skillCoefficient)
  const arsenal = useOptimizerStore((s) => s.arsenal)

  const [debouncedObjectives, setDebouncedObjectives] = useState(objectives)
  const [debouncedSkill, setDebouncedSkill] = useState(skillCoefficient)
  const [prapaOutput, setPrapaOutput] = useState<PrapaOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const prevLengthRef = useRef(objectives.length)

  // Debounce/Immediate effect for objectives
  useEffect(() => {
    if (objectives.length !== prevLengthRef.current) {
      prevLengthRef.current = objectives.length
      setDebouncedObjectives(objectives)
      return
    }

    const handler = setTimeout(() => {
      setDebouncedObjectives(objectives)
    }, 300)

    return () => {
      clearTimeout(handler)
    }
  }, [objectives])

  // Debounce effect for skillCoefficient
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSkill(skillCoefficient)
    }, 300)

    return () => {
      clearTimeout(handler)
    }
  }, [skillCoefficient])

  // Computation effect running WASM calculations
  useEffect(() => {
    if (debouncedObjectives.length === 0) {
      setPrapaOutput(null)
      return
    }

    let cancelled = false

    const runCompute = async () => {
      setLoading(true)
      setError(null)
      try {
        await ensureWasm()
        if (cancelled) return

        const result = computeEngineResult(
          JSON.stringify(debouncedObjectives),
          debouncedSkill,
          JSON.stringify(arsenal),
        )

        if (cancelled) return

        const goldenPath = buildGoldenPath(result.rankedNodes, debouncedObjectives)

        const output: PrapaOutput = {
          summary: {
            rankedNodeCount: result.rankedNodes.length,
            optimalRouteCostMinutes: goldenPath?.primaryPlan.finalCostMinutes ?? 0,
            optimalRouteTiedNodes: goldenPath?.tiedNodes.length ?? 0,
          },
          pathingFailures: result.pathingFailures,
          optimalRoute: goldenPath
            ? {
                totalCostMinutes: goldenPath.primaryPlan.finalCostMinutes,
                baseEtcMinutes: goldenPath.primaryPlan.baseEtcMinutes,
                tiedNodeCount: goldenPath.tiedNodes.length,
                primaryPlan: {
                  startingLocationId: goldenPath.primaryPlan.startingLocationId,
                  baseEtcMinutes: goldenPath.primaryPlan.baseEtcMinutes,
                  steps: goldenPath.primaryPlan.steps.map((step) => ({
                    stepNumber: step.stepNumber,
                    locationId: step.locationId,
                    gameMode: step.gameMode,
                    itemName: step.itemName,
                    quantity: step.quantity,
                    estimatedMinutes: step.estimatedMinutes,
                    warnings: step.warnings,
                    items: step.items,
                  })),
                },
                alternativeStarters: goldenPath.alternativeStarters,
              }
            : undefined,
          rankedNodes: result.rankedNodes.map((node, index) => ({
            rank: index + 1,
            locationId: node.locationId,
            gameMode: node.gameMode,
            cost: node.cost,
            etcMinutes: node.etcMinutes,
            frictionPenalty: node.frictionPenalty,
            kpm: node.kpm,
            maxEnemyLevel: node.maxEnemyLevel,
            frictionApplied: node.frictionApplied,
            matchedItems: node.matchedItems.map((item) => ({
              itemName: item.itemName,
              yItem: item.yItem,
            })),
            warningsResolved: supplementWarnings(node),
          })),
        }

        if (!cancelled) {
          setPrapaOutput(output)
        }
      } catch (err) {
        if (!cancelled) {
          setError(wasmErrorMessage(err))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    runCompute()

    return () => {
      cancelled = true
    }
  }, [debouncedObjectives, debouncedSkill, arsenal])

  return { prapaOutput, loading, error }
}

