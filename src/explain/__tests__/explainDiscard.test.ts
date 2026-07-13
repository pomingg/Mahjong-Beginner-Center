import { describe, expect, it } from 'vitest'
import { evaluateAllDiscards } from '../../engine/discardEvaluator'
import { getTileLabel } from '../../engine/tileLabels'
import { E, makeCounts, m, p, s } from '../../engine/__tests__/testHelpers'
import type { DiscardEvaluation } from '../../engine/types'
import { explainDiscard } from '../explainDiscard'

function sampleHand() {
  return makeCounts([
    m(1), m(2), m(3),
    m(4), m(5), m(6),
    m(7), m(8), m(9),
    p(1), p(2), p(3),
    s(1), s(1),
    s(4), s(5),
    E,
  ])
}

describe('explainDiscard', () => {
  it('選到最佳解時回報 isOptimal 且標題含有該張牌的標籤', () => {
    const results = evaluateAllDiscards(sampleHand())
    const best = results[0]
    const explanation = explainDiscard(best, results)
    expect(explanation.isOptimal).toBe(true)
    expect(explanation.headline).toContain(getTileLabel(best.discard))
    expect(explanation.headline).toContain('最佳選擇')
  })

  it('拆掉完整面子讓向聽數變差時，標題會提示變差，並提到最佳解的牌', () => {
    const results = evaluateAllDiscards(sampleHand())
    const best = results[0]
    const worst = results[results.length - 1]
    expect(worst.ukeire.shanten).toBeGreaterThan(best.ukeire.shanten)

    const explanation = explainDiscard(worst, results)
    expect(explanation.isOptimal).toBe(false)
    expect(explanation.headline).toContain('變差')
    expect(explanation.detail).toContain(getTileLabel(best.discard))
  })

  it('向聽數相同但進張較窄時，標題提示不是最寬的選擇', () => {
    const wide: DiscardEvaluation = {
      discard: E,
      resultingHand: sampleHand(),
      ukeire: { shanten: 0, tiles: [{ kind: s(3), remaining: 4 }, { kind: s(6), remaining: 4 }], totalRemaining: 8 },
    }
    const narrow: DiscardEvaluation = {
      discard: s(4),
      resultingHand: sampleHand(),
      ukeire: { shanten: 0, tiles: [{ kind: s(3), remaining: 4 }], totalRemaining: 4 },
    }
    const results = [wide, narrow]

    const explanation = explainDiscard(narrow, results)
    expect(explanation.isOptimal).toBe(false)
    expect(explanation.headline).toContain('不是最寬')
  })
})
