import { describe, expect, it } from 'vitest'
import { CONCEALED_HAND_SIZE, MAX_COPIES_PER_KIND, TOTAL_KINDS, WALL_TOTAL_TILES } from '../constants'
import { dealNewRound } from '../handGenerator'

describe('dealNewRound', () => {
  it('起手一定是 16 張', () => {
    const { hand } = dealNewRound()
    const total = hand.reduce((sum, c) => sum + c, 0)
    expect(total).toBe(CONCEALED_HAND_SIZE)
  })

  it('手牌長度為 34（每種牌一個 slot）', () => {
    const { hand } = dealNewRound()
    expect(hand.length).toBe(TOTAL_KINDS)
  })

  it('牌池張數等於 136 減去起手 16 張', () => {
    const { wall } = dealNewRound()
    expect(wall.length).toBe(WALL_TOTAL_TILES - CONCEALED_HAND_SIZE)
  })

  it('任何牌種（手牌+牌池加總）不超過 4 張', () => {
    const { hand, wall } = dealNewRound()
    const totals = [...hand]
    for (const kind of wall) totals[kind] += 1
    for (const count of totals) {
      expect(count).toBeLessThanOrEqual(MAX_COPIES_PER_KIND)
    }
    expect(totals.reduce((a, b) => a + b, 0)).toBe(WALL_TOTAL_TILES)
  })

  it('每次發牌都不同（隨機性基本檢查，極低機率誤判）', () => {
    const a = dealNewRound()
    const b = dealNewRound()
    expect(a.wall).not.toEqual(b.wall)
  })
})
