import { removeTile } from './tiles'
import { computeUkeire } from './ukeire'
import type { DiscardEvaluation, HandCounts } from './types'

/**
 * 評估手牌中每一種可以打出的牌，回傳打出後的向聽數/进張，
 * 依「向聽數低者優先，進張張數多者優先」排序（最佳選擇在最前面）。
 */
export function evaluateAllDiscards(hand: HandCounts): DiscardEvaluation[] {
  const evaluations: DiscardEvaluation[] = []

  for (let kind = 0; kind < hand.length; kind += 1) {
    if (hand[kind] <= 0) continue
    const resultingHand = removeTile(hand, kind)
    const ukeire = computeUkeire(resultingHand)
    evaluations.push({ discard: kind, resultingHand, ukeire })
  }

  evaluations.sort((a, b) => {
    if (a.ukeire.shanten !== b.ukeire.shanten) return a.ukeire.shanten - b.ukeire.shanten
    return b.ukeire.totalRemaining - a.ukeire.totalRemaining
  })

  return evaluations
}
