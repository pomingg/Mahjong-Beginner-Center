import { describe, expect, it } from 'vitest'
import { evaluateAllDiscards } from '../discardEvaluator'
import { E, makeCounts, m, p, s } from './testHelpers'

describe('evaluateAllDiscards', () => {
  it('排名第一的選擇是打出孤立無用的字牌，而不是拆掉搭子或面子', () => {
    const hand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2), p(3),
      s(1), s(1),
      s(4), s(5),
      E,
    ])
    expect(hand.reduce((a, b) => a + b, 0)).toBe(17)

    const results = evaluateAllDiscards(hand)
    // 17 張手牌中有一組對子（重複牌種），所以是 16 種可打出的牌，不是 17 個結果
    expect(results).toHaveLength(16)

    const best = results[0]
    expect(best.discard).toBe(E)
    expect(best.ukeire.shanten).toBe(0)
    expect(best.ukeire.totalRemaining).toBe(8)

    // 拆掉完整面子（例如打出 9m）明顯比打孤張差
    const breakingMeld = results.find((r) => r.discard === m(9))
    expect(breakingMeld).toBeDefined()
    expect(breakingMeld!.ukeire.shanten).toBeGreaterThan(best.ukeire.shanten)
  })

  it('結果按向聽數升冪、進張張數降冪排序', () => {
    const hand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2), p(3),
      s(1), s(1),
      s(4), s(5),
      E,
    ])
    const results = evaluateAllDiscards(hand)
    for (let i = 1; i < results.length; i += 1) {
      const prev = results[i - 1]
      const curr = results[i]
      const worseOrEqual =
        prev.ukeire.shanten < curr.ukeire.shanten ||
        (prev.ukeire.shanten === curr.ukeire.shanten &&
          prev.ukeire.totalRemaining >= curr.ukeire.totalRemaining)
      expect(worseOrEqual).toBe(true)
    }
  })

  it('向聽數與進張完全平手時，安全性較高（老頭/字牌）的選項排在前面', () => {
    // 1234567萬 + 123789筒 + 11條(對) + 56條(搭子聽4/7條)：
    // 丟 1萬、4萬、7萬 都能讓萬子部分湊成兩組面子，向聽數與進張完全相同，
    // 但 1萬是老頭（安全）、7萬是普通、4萬是中張（危險），安全性應該影響排序。
    const hand = makeCounts([
      m(1), m(2), m(3), m(4), m(5), m(6), m(7),
      p(1), p(2), p(3), p(7), p(8), p(9),
      s(1), s(1), s(5), s(6),
    ])
    expect(hand.reduce((a, b) => a + b, 0)).toBe(17)

    const results = evaluateAllDiscards(hand)
    const best = results[0]
    expect(best.discard).toBe(m(1))
    expect(best.safety.level).toBe('safe')

    const discard4m = results.find((r) => r.discard === m(4))!
    const discard7m = results.find((r) => r.discard === m(7))!

    // 三者向聽數與進張張數完全一致，證明效率上是真正的平手
    for (const r of [best, discard4m, discard7m]) {
      expect(r.ukeire.shanten).toBe(0)
      expect(r.ukeire.totalRemaining).toBe(8)
    }
    expect(discard4m.safety.level).toBe('dangerous')
    expect(discard7m.safety.level).toBe('medium')

    // 效率平手時，安全性排序：安全 > 普通 > 危險
    expect(results.indexOf(best)).toBeLessThan(results.indexOf(discard7m))
    expect(results.indexOf(discard7m)).toBeLessThan(results.indexOf(discard4m))
  })

  it('每個評估結果打出後手牌都會少一張', () => {
    const hand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2), p(3),
      s(1), s(1),
      s(4), s(5),
      E,
    ])
    const results = evaluateAllDiscards(hand)
    for (const r of results) {
      const total = r.resultingHand.reduce((a, b) => a + b, 0)
      expect(total).toBe(16)
    }
  })
})
