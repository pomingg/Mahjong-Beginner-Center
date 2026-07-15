import { describe, expect, it } from 'vitest'
import { evaluateAllDiscards } from '../../engine/discardEvaluator'
import { computeShanten } from '../../engine/shanten'
import { C, E, S, makeCounts, m, p, s } from '../../engine/__tests__/testHelpers'
import { analyzeHandBeforeDiscard, suggestedDiscardKinds } from '../analyzeHand'
import type { HandAnalysis } from '../analyzeHand'

function allText(analysis: HandAnalysis): string {
  return [
    analysis.progress,
    ...analysis.clusters.flatMap((c) => [c.label, ...c.branches]),
    ...analysis.tensions,
    analysis.suggestion,
  ].join('\n')
}

describe('analyzeHandBeforeDiscard', () => {
  it('回傳結構化的 HandAnalysis 物件', () => {
    const hand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2), p(3),
      s(1), s(1),
      s(4), s(5),
      E,
    ])
    const result = analyzeHandBeforeDiscard(hand, evaluateAllDiscards(hand))

    expect(result).toHaveProperty('progress')
    expect(result).toHaveProperty('clusters')
    expect(result).toHaveProperty('tensions')
    expect(result).toHaveProperty('suggestion')
    expect(typeof result.progress).toBe('string')
    expect(Array.isArray(result.clusters)).toBe(true)
    expect(Array.isArray(result.tensions)).toBe(true)
    expect(typeof result.suggestion).toBe('string')
  })

  it('聽牌時 progress 包含「聽牌」', () => {
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
    const result = analyzeHandBeforeDiscard(hand, evaluateAllDiscards(hand))

    expect(result.progress).toContain('聽牌')
  })

  it('未聽牌時 progress 包含「換 N 張牌」', () => {
    const hand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2), p(3),
      s(1), s(1),
      E, S, C,
    ])
    expect(computeShanten(hand)).toBe(1)
    const result = analyzeHandBeforeDiscard(hand, evaluateAllDiscards(hand))

    expect(result.progress).toContain('換 1 張牌')
  })

  it('clusters 包含正確的 status 分類', () => {
    const hand = makeCounts([
      m(2), m(2), m(3), m(5), m(5), m(5), m(8), m(9),
      p(7), p(7), p(9), p(9),
      s(1), s(2), s(6), s(6), s(7),
    ])
    const result = analyzeHandBeforeDiscard(hand, evaluateAllDiscards(hand))

    const statuses = result.clusters.map((c) => c.status)
    expect(statuses).toContain('complete')
    expect(statuses).toContain('developing')
  })

  it('對子 cluster 的 branches 包含「當將」選項', () => {
    const hand = makeCounts([
      m(2), m(2), m(3), m(5), m(5), m(5), m(8), m(9),
      p(7), p(7), p(9), p(9),
      s(1), s(2), s(6), s(6), s(7),
    ])
    const result = analyzeHandBeforeDiscard(hand, evaluateAllDiscards(hand))

    const hasPairBranch = result.clusters.some((c) =>
      c.branches.some((b) => b.includes('當將'))
    )
    expect(hasPairBranch).toBe(true)
  })

  it('多組對子會產生搶將 tension', () => {
    const hand = makeCounts([
      m(2), m(2), m(3), m(5), m(5), m(5), m(8), m(9),
      p(7), p(7), p(9), p(9),
      s(1), s(2), s(6), s(6), s(7),
    ])
    const result = analyzeHandBeforeDiscard(hand, evaluateAllDiscards(hand))

    expect(result.tensions.length).toBeGreaterThan(0)
    expect(result.tensions.some((t) => t.includes('搶將'))).toBe(true)
  })

  it('已完整胡牌時直接短路回傳', () => {
    const winningHand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2), p(3),
      s(1), s(1), s(1),
      s(2), s(2),
    ])
    expect(computeShanten(winningHand)).toBe(-1)

    const result = analyzeHandBeforeDiscard(winningHand, [])
    expect(result.progress).toContain('胡')
    expect(result.clusters).toEqual([])
    expect(result.tensions).toEqual([])
  })

  it('不變量：目前手牌的向聽數等於最佳出牌後的向聽數', () => {
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

  it('suggestedDiscardKinds 只回傳不影響進度與機會的孤張候選', () => {
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

  it('文字不使用「向聽」「進張」「兩面/嵌張」這類分析用語', () => {
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
      const result = analyzeHandBeforeDiscard(hand, evaluateAllDiscards(hand))
      const text = allText(result)
      expect(text).not.toContain('向聽')
      expect(text).not.toContain('進張')
      expect(text).not.toContain('兩面')
      expect(text).not.toContain('嵌張')
    }
  })

  it('順子 cluster 的 branches 描述等牌方向', () => {
    const hand = makeCounts([
      m(2), m(2), m(3), m(5), m(5), m(5), m(8), m(9),
      p(7), p(7), p(9), p(9),
      s(1), s(2), s(6), s(6), s(7),
    ])
    const result = analyzeHandBeforeDiscard(hand, evaluateAllDiscards(hand))

    const text = allText(result)
    expect(text).toContain('一萬')
    expect(text).toContain('四萬')
  })

  it('recommendedDiscards 只包含真正孤張，不含有發展潛力的牌', () => {
    // 2,3,4,6,8,8,9,9萬 | 4,9,9筒 | 1,2,4,8,9條 | 南
    // 6萬 near 889萬 有潛力, 1條/4條 跟 2條 有關聯 → 不該被推薦丟
    // 只有 4筒 和 南 是真正孤張
    const hand = makeCounts([
      m(2), m(3), m(4), m(6), m(8), m(8), m(9), m(9),
      p(4), p(9), p(9),
      s(1), s(2), s(4), s(8), s(9),
      S,
    ])
    const result = analyzeHandBeforeDiscard(hand, evaluateAllDiscards(hand))

    expect(result.recommendedDiscards).not.toContain(m(6))
    expect(result.recommendedDiscards).not.toContain(s(1))
    expect(result.recommendedDiscards).not.toContain(s(4))
    expect(result.recommendedDiscards).toContain(p(4))
    expect(result.recommendedDiscards).toContain(S)
    expect(result.suggestion).toContain('孤張')
    expect(result.suggestion).not.toContain('六萬')
  })

  it('已完整胡牌時 recommendedDiscards 為空', () => {
    const winningHand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2), p(3),
      s(1), s(1), s(1),
      s(2), s(2),
    ])
    const result = analyzeHandBeforeDiscard(winningHand, [])
    expect(result.recommendedDiscards).toEqual([])
  })
})
