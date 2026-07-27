import { useCallback, useMemo, useState } from 'react'
import { dealHardQuestion } from '../../engine/handGenerator'
import { computeShanten } from '../../engine/shanten'
import { addTile } from '../../engine/tiles'
import type { DiscardEvaluation, HandCounts, TileKind } from '../../engine/types'
import { explainDiscard, type DiscardExplanation } from '../../explain/explainDiscard'

export type Phase = 'choosing' | 'feedback'

export type Difficulty = 'beginner' | 'intermediate' | 'hard' | 'challenge'

const DIFFICULTY_CONFIG: Record<Difficulty, { targetShanten: number; minScore: number }> = {
  beginner: { targetShanten: 3, minScore: 3 },
  intermediate: { targetShanten: 2, minScore: 5 },
  hard: { targetShanten: 2, minScore: 7 },
  challenge: { targetShanten: 1, minScore: 7 },
}

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
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate')
  const [question, setQuestion] = useState<Question | null>(null)
  const [explanation, setExplanation] = useState<DiscardExplanation | null>(null)
  const [discardedKind, setDiscardedKind] = useState<TileKind | null>(null)
  const [stats, setStats] = useState<Stats>({ total: 0, optimal: 0, kept: 0, streak: 0 })

  const deal = useCallback((diff: Difficulty) => {
    const config = DIFFICULTY_CONFIG[diff]
    const result = dealHardQuestion({
      targetShanten: config.targetShanten,
      minScore: config.minScore,
    })
    const drawnTile = result.wall[0]
    const hand = addTile(result.hand, drawnTile)
    const shanten = computeShanten(hand)
    setQuestion({ hand, drawnTile, shanten, evaluations: result.evaluations })
    setExplanation(null)
    setDiscardedKind(null)
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
      setDiscardedKind(kind)

      const isOptimal =
        chosen.ukeire.shanten === best.ukeire.shanten &&
        chosen.ukeire.totalRemaining === best.ukeire.totalRemaining &&
        chosen.safety.score === best.safety.score
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
    (newDifficulty: Difficulty) => {
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
    discardedKind,
    stats,
    difficulty,
    start,
    discard,
    next,
    changeDifficulty,
  }
}
