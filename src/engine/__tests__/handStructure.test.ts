import { describe, expect, it } from 'vitest'
import { readHandStructure } from '../handStructure'
import { getTileGroupLabel } from '../tileLabels'
import { C, E, makeCounts, m, p, s } from './testHelpers'

function meldLabels(hand: number[]): string[] {
  return readHandStructure(hand).melds.map((mld) => getTileGroupLabel(mld.tiles))
}
function taatsuLabels(hand: number[]): string[] {
  return readHandStructure(hand).taatsu.map((t) => getTileGroupLabel(t.tiles))
}

describe('readHandStructure', () => {
  it('抽出完整順子與刻子', () => {
    // 123萬 + 555筒 + 789條
    const hand = makeCounts([m(1), m(2), m(3), p(5), p(5), p(5), s(7), s(8), s(9)])
    const shape = readHandStructure(hand)
    expect(shape.melds).toHaveLength(3)
    expect(meldLabels(hand).sort()).toEqual(['123萬', '555筒', '789條'].sort())
    expect(shape.taatsu).toHaveLength(0)
    expect(shape.floaters).toHaveLength(0)
  })

  it('抽出兩面搭子、對子（將眼）與孤張', () => {
    // 45萬(兩面) + 東東(對子) + 9條(孤張)
    const hand = makeCounts([m(4), m(5), E, E, s(9)])
    const shape = readHandStructure(hand)
    expect(shape.melds).toHaveLength(0)
    expect(taatsuLabels(hand).sort()).toEqual(['45萬', '東東'].sort())
    expect(shape.eye).not.toBeNull()
    expect(getTileGroupLabel(shape.eye!.tiles)).toBe('東東')
    expect(shape.floaters).toEqual([s(9)])
  })

  it('嵌張與邊張分類正確', () => {
    // 13萬(嵌張) + 12筒(邊張)
    const hand = makeCounts([m(1), m(3), p(1), p(2)])
    const shape = readHandStructure(hand)
    const kinds = shape.taatsu.map((t) => t.kind).sort()
    expect(kinds).toEqual(['kanchan', 'penchan'].sort())
  })

  it('面子優先於拆成搭子：面子數最大化', () => {
    // 234萬 應該讀成一組順子，而不是 23 搭子 + 4 孤張
    const hand = makeCounts([m(2), m(3), m(4)])
    const shape = readHandStructure(hand)
    expect(shape.melds).toHaveLength(1)
    expect(shape.floaters).toHaveLength(0)
  })

  it('16 張典型手牌讀得出合理的面子與搭子數', () => {
    // 123萬 456萬 789萬 123筒(3面子+順) + 55條(對子) + 7條(孤張)
    const hand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2), p(3),
      s(5), s(5),
      s(7), C,
    ])
    const shape = readHandStructure(hand)
    expect(shape.melds.length).toBe(4)
    // 55條 對子當將眼
    expect(shape.eye).not.toBeNull()
    expect(getTileGroupLabel(shape.eye!.tiles)).toBe('55條')
  })
})
