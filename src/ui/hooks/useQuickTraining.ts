import { useCallback, useMemo, useState } from 'react'
import { evaluateAllDiscards } from '../../engine/discardEvaluator'
import { dealAtShanten } from '../../engine/handGenerator'
import { computeShanten } from '../../engine/shanten'
import { addTile } from '../../engine/tiles'
import type { DiscardEvaluation, HandCounts, TileKind } from '../../engine/types'
import { explainDiscard, type DiscardExplanation } from '../../explain/explainDiscard'

export type Phase = 'choosing' | 'feedback'

interface Question {
  hand: HandCounts
  drawnTile: TileKind
  shanten: number
  evaluations: DiscardEvaluation[]
}

interface Stats {
  total: number
  optimal: number
  kept: number
  streak: number
}

export function useQuickTraining() {
  const [difficulty, setDifficulty] = useState(3)
  const [question, setQuestion] = useState<Question | null>(null)
  const [explanation, setExplanation] = useState<DiscardExplanation | null>(null)
  const [stats, setStats] = useState<Stats>({ total: 0, optimal: 0, kept: 0, streak: 0 })

  const deal = useCallback((targetShanten: number) => {
    const { hand: baseHand, wall } = dealAtShanten(targetShanten)
    const drawnTile = wall[0]
    const hand = addTile(baseHand, drawnTile)
    const shanten = computeShanten(hand)
    const evaluations = evaluateAllDiscards(hand)
    setQuestion({ hand, drawnTile, shanten, evaluations })
    setExplanation(null)
  }, [])

  const start = useCallback(() => {
    setStats({ total: 0, optimal: 0, kept: 0, streak: 0 })
    deal(difficulty)
  }, [difficulty, deal])

  const discard = useCallback(
    (kind: TileKind) => {
      if (!question) return
      const chosen = question.evaluations.find((e) => e.discard === kind)
      if (!chosen) return

      const best = question.evaluations[0]
      const exp = explainDiscard(chosen, question.evaluations)
      setExplanation(exp)

      const isOptimal =
        chosen.ukeire.shanten === best.ukeire.shanten &&
        chosen.ukeire.totalRemaining === best.ukeire.totalRemaining
      const keptShanten = chosen.ukeire.shanten <= best.ukeire.shanten

      setStats((prev) => ({
        total: prev.total + 1,
        optimal: prev.optimal + (isOptimal ? 1 : 0),
        kept: prev.kept + (keptShanten ? 1 : 0),
        streak: isOptimal ? prev.streak + 1 : 0,
      }))
    },
    [question],
  )

  const next = useCallback(() => {
    deal(difficulty)
  }, [difficulty, deal])

  const changeDifficulty = useCallback(
    (newDifficulty: number) => {
      setDifficulty(newDifficulty)
      if (question) {
        setStats({ total: 0, optimal: 0, kept: 0, streak: 0 })
        deal(newDifficulty)
      }
    },
    [question, deal],
  )

  const phase: Phase = useMemo(() => {
    if (explanation) return 'feedback'
    return 'choosing'
  }, [explanation])

  return {
    question,
    phase,
    explanation,
    stats,
    difficulty,
    start,
    discard,
    next,
    changeDifficulty,
  }
}
