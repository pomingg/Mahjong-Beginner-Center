import { assessDiscardSafety } from './discardSafety'
import { removeTile } from './tiles'
import { computeUkeire } from './ukeire'
import type { DiscardEvaluation, HandCounts } from './types'

/**
 * 評估手牌中每一種可以打出的牌，回傳打出後的向聽數/進張，
 * 依「向聽數低者優先，進張張數多者優先，安全性高者優先」排序（最佳選擇在最前面）。
 * 安全性只在向聽數與進張張數都相同時才會決定順序，不會犧牲效率換安全。
 */
export function evaluateAllDiscards(hand: HandCounts): DiscardEvaluation[] {
  const evaluations: DiscardEvaluation[] = []

  for (let kind = 0; kind < hand.length; kind += 1) {
    if (hand[kind] <= 0) continue
    const resultingHand = removeTile(hand, kind)
    const ukeire = computeUkeire(resultingHand)
    const safety = assessDiscardSafety(kind)
    evaluations.push({ discard: kind, resultingHand, ukeire, safety })
  }

  evaluations.sort((a, b) => {
    if (a.ukeire.shanten !== b.ukeire.shanten) return a.ukeire.shanten - b.ukeire.shanten
    if (a.ukeire.totalRemaining !== b.ukeire.totalRemaining) {
      return b.ukeire.totalRemaining - a.ukeire.totalRemaining
    }
    return b.safety.score - a.safety.score
  })

  return evaluations
}
