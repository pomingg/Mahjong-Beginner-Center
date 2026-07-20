import { useCallback, useMemo, useState } from 'react'
import { evaluateAllDiscards } from '../../engine/discardEvaluator'
import { dealNewRound } from '../../engine/handGenerator'
import { analyzeHandRoutes } from '../../engine/handRoutes'
import { computeShanten } from '../../engine/shanten'
import { addTile } from '../../engine/tiles'
import type { DiscardEvaluation, HandCounts, TileKind } from '../../engine/types'
import { analyzeHandBeforeDiscard } from '../../explain/analyzeHand'
import { describeHandRoutes, type HandRouteDescription } from '../../explain/describeRoutes'
import { explainDiscard, type DiscardExplanation } from '../../explain/explainDiscard'

export type SingleHandPhase = 'idle' | 'analysis' | 'feedback'

interface SingleHandState {
  hand: HandCounts
  drawnTile: TileKind
  evaluations: DiscardEvaluation[]
  routeDescription: HandRouteDescription
}

export function useSingleHand() {
  const [state, setState] = useState<SingleHandState | null>(null)
  const [explanation, setExplanation] = useState<DiscardExplanation | null>(null)

  const deal = useCallback(() => {
    const { hand: baseHand, wall } = dealNewRound()
    const drawnTile = wall[0]
    const hand = addTile(baseHand, drawnTile)

    if (computeShanten(hand) === -1) {
      const { hand: h2, wall: w2 } = dealNewRound()
      const d2 = w2[0]
      const full2 = addTile(h2, d2)
      const evaluations = evaluateAllDiscards(full2)
      const routeAnalysis = analyzeHandRoutes(full2)
      const routeDescription = describeHandRoutes(routeAnalysis)
      setState({ hand: full2, drawnTile: d2, evaluations, routeDescription })
    } else {
      const evaluations = evaluateAllDiscards(hand)
      const routeAnalysis = analyzeHandRoutes(hand)
      const routeDescription = describeHandRoutes(routeAnalysis)
      setState({ hand, drawnTile, evaluations, routeDescription })
    }
    setExplanation(null)
  }, [])

  const discard = useCallback(
    (kind: TileKind) => {
      if (!state) return
      const chosen = state.evaluations.find((e) => e.discard === kind)
      if (!chosen) return
      setExplanation(explainDiscard(chosen, state.evaluations))
    },
    [state],
  )

  const phase: SingleHandPhase = useMemo(() => {
    if (!state) return 'idle'
    if (explanation) return 'feedback'
    return 'analysis'
  }, [state, explanation])

  const handAnalysis = useMemo(() => {
    if (!state) return null
    return analyzeHandBeforeDiscard(state.hand, state.evaluations)
  }, [state])

  return {
    state,
    phase,
    handAnalysis,
    explanation,
    deal,
    discard,
    newHand: deal,
  }
}
