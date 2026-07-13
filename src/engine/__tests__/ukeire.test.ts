import { describe, expect, it } from 'vitest'
import { computeUkeire } from '../ukeire'
import { makeCounts, m, p, s } from './testHelpers'

describe('computeUkeire', () => {
  it('已完整胡牌時沒有进張', () => {
    const hand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2), p(3),
      p(4), p(5), p(6),
      s(5), s(5),
    ])
    const result = computeUkeire(hand)
    expect(result.shanten).toBe(-1)
    expect(result.tiles).toEqual([])
    expect(result.totalRemaining).toBe(0)
  })

  it('單騎聽牌只聽自己那張，剩餘 3 張', () => {
    const hand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2), p(3),
      p(4), p(5), p(6),
      s(5),
    ])
    const result = computeUkeire(hand)
    expect(result.shanten).toBe(0)
    expect(result.tiles).toEqual([{ kind: s(5), remaining: 3 }])
    expect(result.totalRemaining).toBe(3)
  })

  it('兩面搭子聽兩種牌，各剩 4 張', () => {
    const hand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2), p(3),
      s(1), s(1),
      s(4), s(5),
    ])
    const result = computeUkeire(hand)
    expect(result.shanten).toBe(0)
    const kinds = result.tiles.map((t) => t.kind).sort((a, b) => a - b)
    expect(kinds).toEqual([s(3), s(6)].sort((a, b) => a - b))
    expect(result.totalRemaining).toBe(8)
  })

  it('手牌中已有的張數會反映在剩餘張數上', () => {
    const hand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2), p(3),
      s(1), s(1),
      s(4), s(4),
    ])
    const result = computeUkeire(hand)
    expect(result.shanten).toBe(0)
    const s4Entry = result.tiles.find((t) => t.kind === s(4))
    expect(s4Entry?.remaining).toBe(2)
  })
})
