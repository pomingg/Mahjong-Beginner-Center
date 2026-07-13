import { useCallback, useMemo, useState } from 'react'
import { evaluateAllDiscards } from '../../engine/discardEvaluator'
import { createRound, declareWin, discardTile, drawTile } from '../../engine/gameRound'
import { computeShanten } from '../../engine/shanten'
import type { DiscardEvaluation, RoundState, TileKind } from '../../engine/types'
import { explainDiscard, type DiscardExplanation } from '../../explain/explainDiscard'

export type TrainingPhase = 'idle' | 'awaiting-discard' | 'feedback' | 'round-over'

export function useTrainingRound() {
  const [state, setState] = useState<RoundState>(createRound)
  const [pendingEvaluations, setPendingEvaluations] = useState<DiscardEvaluation[] | null>(null)
  const [lastExplanation, setLastExplanation] = useState<DiscardExplanation | null>(null)
  const [showSummary, setShowSummary] = useState(false)

  const draw = useCallback(() => {
    if (state.status !== 'playing' || state.drawnTile !== null) return

    const drawn = drawTile(state)
    if (drawn.status !== 'playing') {
      setState(drawn)
      setPendingEvaluations(null)
      setShowSummary(true)
      return
    }

    if (computeShanten(drawn.hand) === -1) {
      setState(declareWin(drawn))
      setPendingEvaluations(null)
      setShowSummary(true)
      return
    }

    setState(drawn)
    setPendingEvaluations(evaluateAllDiscards(drawn.hand))
    setLastExplanation(null)
  }, [state])

  const discard = useCallback(
    (kind: TileKind) => {
      if (!pendingEvaluations) return
      const chosen = pendingEvaluations.find((e) => e.discard === kind)
      if (!chosen) return

      const explanation = explainDiscard(chosen, pendingEvaluations)
      const next = discardTile(state, kind)
      setLastExplanation(explanation)
      setPendingEvaluations(null)
      setState(next)
    },
    [state, pendingEvaluations],
  )

  const proceedAfterFeedback = useCallback(() => {
    setLastExplanation(null)
    if (state.status !== 'playing') {
      setShowSummary(true)
      return
    }
    draw()
  }, [state.status, draw])

  const newRound = useCallback(() => {
    setState(createRound())
    setPendingEvaluations(null)
    setLastExplanation(null)
    setShowSummary(false)
  }, [])

  const phase: TrainingPhase = useMemo(() => {
    if (showSummary) return 'round-over'
    if (lastExplanation) return 'feedback'
    if (state.drawnTile !== null) return 'awaiting-discard'
    return 'idle'
  }, [showSummary, lastExplanation, state.drawnTile])

  const stats = useMemo(() => {
    const totalTurns = state.history.length
    const optimalTurns = state.history.filter((t) => t.wasOptimal).length
    // 維持住向聽（含最佳）視為合格的一手；只有真正退向聽才算失誤
    const keptTurns = state.history.filter((t) => t.keptShanten).length
    const regressedTurns = totalTurns - keptTurns
    return { totalTurns, optimalTurns, keptTurns, regressedTurns }
  }, [state.history])

  return {
    state,
    phase,
    pendingEvaluations,
    lastExplanation,
    stats,
    draw,
    discard,
    proceedAfterFeedback,
    newRound,
  }
}
