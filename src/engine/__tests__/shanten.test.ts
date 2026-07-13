import { describe, expect, it } from 'vitest'
import { computeShanten } from '../shanten'
import { bruteForceShanten } from './bruteForceShanten'
import { C, E, F, N, S, W, Wh, makeCounts, m, p, randomHand, s } from './testHelpers'

describe('computeShanten — N=4（對照標準日麻 13 張已知範例，驗證遞迴/組合邏輯本身）', () => {
  it('聽牌範例：123456789m 11p 22s（等 2s 對子成刻子）→ 0 向聽', () => {
    const hand = makeCounts([
      m(1), m(2), m(3), m(4), m(5), m(6), m(7), m(8), m(9),
      p(1), p(1),
      s(2), s(2),
    ])
    expect(computeShanten(hand, 4)).toBe(0)
  })

  it('單騎聽牌（tanki）：4 組面子 + 1 張孤張等對 → 0 向聽', () => {
    const hand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      p(1), p(2), p(3),
      s(7), s(8), s(9),
      E,
    ])
    expect(computeShanten(hand, 4)).toBe(0)
  })

  it('完全孤立、無搭子無對子的 13 張手牌 → 8 向聽（標準型最大向聽數）', () => {
    const hand = makeCounts([m(1), m(4), m(7), p(1), p(4), p(7), s(1), s(4), s(7), E, S, W, N])
    expect(computeShanten(hand, 4)).toBe(8)
  })

  it('1 向聽：3 組面子 + 1 對子 + 2 張不相鄰孤張 → 1 向聽', () => {
    const hand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(1),
      s(2), s(5),
    ])
    expect(computeShanten(hand, 4)).toBe(1)
  })

  it('3 組面子 + 2 個搭子（無對子）→ 1 向聽', () => {
    const hand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2),
      s(4), s(6),
    ])
    expect(computeShanten(hand, 4)).toBe(1)
  })
})

describe('computeShanten — N=5（台灣麻將 16/17 張，人工驗算案例）', () => {
  it('完整胡牌（17 張：5 組面子 + 1 對子）→ -1', () => {
    const hand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2), p(3),
      p(4), p(5), p(6),
      s(5), s(5),
    ])
    expect(hand.reduce((a, b) => a + b, 0)).toBe(17)
    expect(computeShanten(hand, 5)).toBe(-1)
  })

  it('16 張聽牌（拿掉一張 5s，單騎聽 5s）→ 0 向聽', () => {
    const hand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2), p(3),
      p(4), p(5), p(6),
      s(5),
    ])
    expect(hand.reduce((a, b) => a + b, 0)).toBe(16)
    expect(computeShanten(hand, 5)).toBe(0)
  })

  it('16 張聽牌（兩面聽）：4 組面子 + 1 對子 + 1 個兩面搭子 → 0 向聽', () => {
    const hand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2), p(3),
      s(1), s(1),
      s(4), s(5),
    ])
    expect(computeShanten(hand, 5)).toBe(0)
  })

  it('16 張手牌：4 組面子 + 1 對子 + 2 張不相鄰孤張 → 1 向聽', () => {
    const hand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2), p(3),
      s(1), s(1),
      s(4), C,
    ])
    expect(computeShanten(hand, 5)).toBe(1)
  })

  it('字牌組成的對子當將眼一樣有效', () => {
    const hand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2), p(3),
      p(4), p(5), p(6),
      F, F,
    ])
    expect(computeShanten(hand, 5)).toBe(-1)
  })

  it('16 張完全孤立無搭子無對子 → 10 向聽（5 組面子需求下的最大向聽數，與 N=4/13張的 8 同構）', () => {
    const hand = makeCounts([
      m(1), m(4), m(7), p(1), p(4), p(7), s(1), s(4), s(7), E, S, W, N, C, F, Wh,
    ])
    expect(computeShanten(hand, 5)).toBe(10)
  })
})

describe('computeShanten vs 暴力法 oracle 交叉驗證', () => {
  it('N=5：隨機 16 張手牌批次交叉驗證（拆花色合併 vs 全域搜尋應完全一致）', () => {
    for (let i = 0; i < 200; i += 1) {
      const hand = randomHand(16)
      expect(computeShanten(hand, 5)).toBe(bruteForceShanten(hand, 5))
    }
  })

  it('N=5：隨機 17 張手牌批次交叉驗證', () => {
    for (let i = 0; i < 200; i += 1) {
      const hand = randomHand(17)
      expect(computeShanten(hand, 5)).toBe(bruteForceShanten(hand, 5))
    }
  })

  it('N=4：隨機 13 張手牌批次交叉驗證（額外驗證一般化邏輯不受 N 影響）', () => {
    for (let i = 0; i < 100; i += 1) {
      const hand = randomHand(13)
      expect(computeShanten(hand, 4)).toBe(bruteForceShanten(hand, 4))
    }
  })
})
