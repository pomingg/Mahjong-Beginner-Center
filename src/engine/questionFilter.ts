import { evaluateAllDiscards } from './discardEvaluator'
import { readHandStructure } from './handStructure'
import { computeShanten } from './shanten'
import { addTile } from './tiles'
import type { DiscardEvaluation, HandCounts, TileKind } from './types'

export interface QuestionQualityResult {
  score: number
  floaterCount: number
  competitiveDiscards: number
  ukeireSpread: number
  drawnTileRelevant: boolean
}

export function countFloaters(hand: HandCounts): number {
  return readHandStructure(hand).floaters.length
}

export function countCompetitiveDiscards(evaluations: DiscardEvaluation[]): number {
  if (evaluations.length === 0) return 0
  const best = evaluations[0]
  return evaluations.filter((e) => e.ukeire.shanten === best.ukeire.shanten).length
}

export function ukeireSpread(evaluations: DiscardEvaluation[]): number {
  if (evaluations.length < 2) return 0
  const best = evaluations[0]
  const tied = evaluations.filter((e) => e.ukeire.shanten === best.ukeire.shanten)
  if (tied.length < 2) return 0
  return tied[0].ukeire.totalRemaining - tied[tied.length - 1].ukeire.totalRemaining
}

export function isRelevantDraw(baseHand: HandCounts, drawnTile: TileKind): boolean {
  const withDraw = addTile(baseHand, drawnTile)
  const baseSh = computeShanten(baseHand)
  const drawnSh = computeShanten(withDraw)
  if (drawnSh < baseSh) return true
  const baseFloaters = readHandStructure(baseHand).floaters.length
  const drawnFloaters = readHandStructure(withDraw).floaters.length
  return drawnFloaters <= baseFloaters
}

export function assessQuestionQuality(
  baseHand: HandCounts,
  drawnTile: TileKind,
  evaluations: DiscardEvaluation[],
): QuestionQualityResult {
  const hand17 = addTile(baseHand, drawnTile)
  const floaterCount = countFloaters(hand17)
  const competitive = countCompetitiveDiscards(evaluations)
  const spread = ukeireSpread(evaluations)
  const relevant = isRelevantDraw(baseHand, drawnTile)

  let score = 0
  score += Math.max(0, 4 - floaterCount)
  score += Math.min(3, Math.max(0, competitive - 1))
  score += spread >= 8 ? 2 : spread >= 4 ? 1 : 0
  score += relevant ? 1 : 0

  return {
    score,
    floaterCount,
    competitiveDiscards: competitive,
    ukeireSpread: spread,
    drawnTileRelevant: relevant,
  }
}

export function pickRelevantDraw(
  baseHand: HandCounts,
  wall: TileKind[],
): { drawnTile: TileKind; wallIndex: number } | null {
  const limit = Math.min(wall.length, 20)
  for (let i = 0; i < limit; i++) {
    if (isRelevantDraw(baseHand, wall[i])) {
      return { drawnTile: wall[i], wallIndex: i }
    }
  }
  return null
}

export interface HardDealOptions {
  targetShanten: number
  minScore?: number
  maxAttempts?: number
}

export interface HardQuestionResult {
  evaluations: DiscardEvaluation[]
  quality: QuestionQualityResult
}

export function evaluateHardQuestion(
  baseHand: HandCounts,
  drawnTile: TileKind,
): HardQuestionResult {
  const hand17 = addTile(baseHand, drawnTile)
  const evaluations = evaluateAllDiscards(hand17)
  const quality = assessQuestionQuality(baseHand, drawnTile, evaluations)
  return { evaluations, quality }
}
