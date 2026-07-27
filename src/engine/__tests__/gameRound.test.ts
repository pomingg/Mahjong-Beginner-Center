import { describe, expect, it } from 'vitest'
import { ROUND_MAX_DRAWS } from '../constants'
import { createRound, declareWin, discardTile, drawTile, isRoundOver } from '../gameRound'
import { makeCounts, m, p, s } from './testHelpers'

describe('createRound', () => {
  it('起手 16 張、狀態為 playing、還沒摸牌', () => {
    const state = createRound()
    expect(state.hand.reduce((a, b) => a + b, 0)).toBe(16)
    expect(state.status).toBe('playing')
    expect(state.drawnTile).toBeNull()
    expect(state.turnIndex).toBe(0)
    expect(state.history).toEqual([])
    expect(isRoundOver(state)).toBe(false)
  })
})

describe('drawTile', () => {
  it('摸牌後手牌變 17 張、牌池少 1 張、turnIndex + 1', () => {
    const state = createRound()
    const wallSizeBefore = state.wall.length
    const next = drawTile(state)
    expect(next.hand.reduce((a, b) => a + b, 0)).toBe(17)
    expect(next.wall.length).toBe(wallSizeBefore - 1)
    expect(next.drawnTile).not.toBeNull()
    expect(next.turnIndex).toBe(1)
  })

  it('已經摸牌、還沒出牌時不能再摸牌', () => {
    const state = drawTile(createRound())
    expect(() => drawTile(state)).toThrow()
  })

  it('本局已結束時不能再摸牌', () => {
    const state = { ...createRound(), status: 'won' as const }
    expect(() => drawTile(state)).toThrow()
  })
})

describe('discardTile', () => {
  it('出牌後手牌回到 16 張、drawnTile 清空、記錄一筆歷史', () => {
    const drawn = drawTile(createRound())
    const discardKind = drawn.drawnTile!
    const next = discardTile(drawn, discardKind)
    expect(next.hand.reduce((a, b) => a + b, 0)).toBe(16)
    expect(next.drawnTile).toBeNull()
    expect(next.history).toHaveLength(1)
    expect(next.history[0].discard).toBe(discardKind)
    expect(next.status).toBe('playing')
  })

  it('還沒摸牌時不能出牌', () => {
    const state = createRound()
    expect(() => discardTile(state, 0)).toThrow()
  })

  it('打出手牌中沒有的牌會丟出錯誤', () => {
    const drawn = drawTile(createRound())
    const missingKind = drawn.hand.findIndex((c) => c === 0)
    expect(() => discardTile(drawn, missingKind)).toThrow()
  })

  it('達到單局摸牌上限後出牌會判定流局', () => {
    const drawn = drawTile(createRound())
    const nearLimit = { ...drawn, turnIndex: ROUND_MAX_DRAWS }
    const next = discardTile(nearLimit, nearLimit.drawnTile!)
    expect(next.status).toBe('drawn')
    expect(isRoundOver(next)).toBe(true)
  })

  it('未達上限時出牌後仍是 playing', () => {
    const drawn = drawTile(createRound())
    const next = discardTile(drawn, drawn.drawnTile!)
    expect(next.status).toBe('playing')
    expect(isRoundOver(next)).toBe(false)
  })

  it('向聽數與進張平手時，安全性較低的選項不算 wasOptimal', () => {
    // 同 discardEvaluator 測試的 1234567萬 情境：丟 1萬(安全) 或 4萬(危險)
    // 對聽牌進度與機會完全一樣，但只有丟安全的那張才算真正的最佳解。
    const hand17 = makeCounts([
      m(1), m(2), m(3), m(4), m(5), m(6), m(7),
      p(1), p(2), p(3), p(7), p(8), p(9),
      s(1), s(1), s(5), s(6),
    ])
    const state = {
      status: 'playing' as const,
      hand: hand17,
      wall: [],
      drawnTile: m(4),
      turnIndex: 0,
      history: [],
    }

    const afterDangerous = discardTile(state, m(4))
    expect(afterDangerous.history[0].wasOptimal).toBe(false)
    expect(afterDangerous.history[0].keptShanten).toBe(true)

    const afterSafe = discardTile(state, m(1))
    expect(afterSafe.history[0].wasOptimal).toBe(true)
  })
})

describe('declareWin', () => {
  it('手牌完整（5 組面子 + 1 對子）時可以宣告自摸', () => {
    const winningHand = makeCounts([
      m(1), m(2), m(3),
      m(4), m(5), m(6),
      m(7), m(8), m(9),
      p(1), p(2), p(3),
      p(4), p(5), p(6),
      s(5), s(5),
    ])
    const state = {
      status: 'playing' as const,
      hand: winningHand,
      wall: [],
      drawnTile: s(5),
      turnIndex: 5,
      history: [],
    }
    const result = declareWin(state)
    expect(result.status).toBe('won')
  })

  it('手牌還沒完整時宣告胡牌會丟出錯誤', () => {
    const drawn = drawTile(createRound())
    expect(() => declareWin(drawn)).toThrow()
  })

  it('還沒摸牌時不能宣告胡牌', () => {
    const state = createRound()
    expect(() => declareWin(state)).toThrow()
  })
})
