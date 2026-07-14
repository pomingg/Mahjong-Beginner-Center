import { describe, expect, it } from 'vitest'
import { evaluateAllDiscards } from '../../engine/discardEvaluator'
import { computeShanten } from '../../engine/shanten'
import { C, E, S, makeCounts, m, p, s } from '../../engine/__tests__/testHelpers'
import { analyzeHandBeforeDiscard, suggestedDiscardKinds } from '../analyzeHand'

describe('analyzeHandBeforeDiscard', () => {
  it('聽牌 + 唯一孤張候選：文字涵蓋進度、取捨理由、孤張三段', () => {
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

  it('還差 1 張才聽牌、三張字牌並列孤張候選：三張牌名都要出現，並提示彼此等價', () => {
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

    expect(text).toContain('還要換 1 張牌才會聽牌')
    expect(text).toContain('東')
    expect(text).toContain('南')
    expect(text).toContain('中')
  })

  it('兩個聽牌選項機會寬窄不同：優先建議丟掉能保留較寬機會的那張', () => {
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
    expect(text).toContain('比較寬')
    // 最終的孤張捨棄建議應該點名七條，而不是機會較窄的四條
    const sentences = text.split('。').filter(Boolean)
    const isolatedSentence = sentences[sentences.length - 1]
    expect(isolatedSentence).toContain('七條')
    expect(isolatedSentence).not.toContain('四條')
  })

  it('會點名已成形的面子（讀出好牌型，而不只是要丟什麼）', () => {
    const hand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2), p(3),
      s(1), s(1),
      E, S, C,
    ])
    const text = analyzeHandBeforeDiscard(hand, evaluateAllDiscards(hand))
    // 三組萬子順子與筒子順子應該被具體點名出來
    expect(text).toContain('123萬')
    expect(text).toContain('123筒')
    expect(text).toContain('湊好了')
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

  it('不變量：目前手牌實際計算的向聽數，等於「最佳出牌後」的向聽數', () => {
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

  it('suggestedDiscardKinds 只回傳「丟了不影響進度與機會」的孤張候選', () => {
    const hand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2), p(3),
      s(1), s(1),
      E, S, C,
    ])
    const evaluations = evaluateAllDiscards(hand)
    const kinds = suggestedDiscardKinds(evaluations).sort((a, b) => a - b)
    expect(kinds).toEqual([E, S, C].sort((a, b) => a - b))
  })

  it('文字不使用「向聽」「進張」「兩面/嵌張/邊張」這類分析用語', () => {
    const scattered = makeCounts([
      m(1), m(2), m(5), m(6), m(7), m(9),
      p(3), p(6), p(9), p(9),
      s(1), s(8), s(9),
      E, S, C, p(8),
    ])
    const tenpai = makeCounts([
      m(1), m(2), m(3), m(4), m(5), m(6), m(7), m(8), m(9),
      p(1), p(2), p(3),
      s(1), s(1), s(4), s(5), E,
    ])
    for (const hand of [scattered, tenpai]) {
      const text = analyzeHandBeforeDiscard(hand, evaluateAllDiscards(hand))
      expect(text).not.toContain('向聽')
      expect(text).not.toContain('進張')
      expect(text).not.toContain('兩面')
      expect(text).not.toContain('嵌張')
      expect(text).not.toContain('邊張')
    }
  })
})
