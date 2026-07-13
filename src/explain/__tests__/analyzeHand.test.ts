import { describe, expect, it } from 'vitest'
import { evaluateAllDiscards } from '../../engine/discardEvaluator'
import { computeShanten } from '../../engine/shanten'
import { C, E, S, makeCounts, m, p, s } from '../../engine/__tests__/testHelpers'
import { analyzeHandBeforeDiscard } from '../analyzeHand'

describe('analyzeHandBeforeDiscard', () => {
  it('聽牌 + 唯一孤張候選：文字涵蓋效率、優先順序、孤張三層心法', () => {
    const hand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2), p(3),
      s(1), s(1),
      s(4), s(5),
      E,
    ])
    expect(computeShanten(hand)).toBe(0)

    const evaluations = evaluateAllDiscards(hand)
    const text = analyzeHandBeforeDiscard(hand, evaluations)

    expect(text).toContain('已經聽牌')
    expect(text).toContain('三條')
    expect(text).toContain('六條')
    expect(text).toContain('東')
    expect(text).toContain('孤張')
  })

  it('向聽 1、三張字牌並列孤張候選：三張牌名都要出現，並提示彼此等價', () => {
    const hand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2), p(3),
      s(1), s(1),
      E, S, C,
    ])
    expect(computeShanten(hand)).toBe(1)

    const evaluations = evaluateAllDiscards(hand)
    const text = analyzeHandBeforeDiscard(hand, evaluations)

    expect(text).toContain('還差 1 向聽')
    expect(text).toContain('東')
    expect(text).toContain('南')
    expect(text).toContain('中')
    expect(text).toContain('等價')
  })

  it('兩個聽牌選項向聽相同但進張寬窄不同：優先建議捨棄較寬的那張所對應的孤張', () => {
    const hand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2), p(3),
      s(1), s(1),
      s(4), s(5), s(7),
    ])
    expect(computeShanten(hand)).toBe(0)

    const evaluations = evaluateAllDiscards(hand)
    const best = evaluations[0]
    expect(best.discard).toBe(s(7))
    expect(best.ukeire.totalRemaining).toBe(8)

    const text = analyzeHandBeforeDiscard(hand, evaluations)

    expect(text).toContain('七條')
    expect(text).toContain('四條')
    expect(text).toContain('更寬')
    // 最終的孤張捨棄建議應該點名七條，而不是進張較窄的四條
    const sentences = text.split('。').filter(Boolean)
    const isolatedSentence = sentences[sentences.length - 1]
    expect(isolatedSentence).toContain('七條')
    expect(isolatedSentence).not.toContain('四條')
  })

  it('已完整胡牌時直接短路回傳，不會噴錯', () => {
    const winningHand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2), p(3),
      s(1), s(1), s(1),
      s(2), s(2),
    ])
    expect(computeShanten(winningHand)).toBe(-1)

    const text = analyzeHandBeforeDiscard(winningHand, [])
    expect(text).toContain('已經')
    expect(text).toContain('胡')
  })

  it('不變量：目前手牌的向聽數，等於「最佳出牌後」的向聽數', () => {
    const hand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2), p(3),
      s(1), s(1),
      s(4), s(5),
      E,
    ])
    const evaluations = evaluateAllDiscards(hand)
    expect(computeShanten(hand)).toBe(evaluations[0].ukeire.shanten)
  })
})
