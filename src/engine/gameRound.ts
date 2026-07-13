import { ROUND_MAX_DRAWS } from './constants'
import { evaluateAllDiscards } from './discardEvaluator'
import { dealNewRound } from './handGenerator'
import { computeShanten } from './shanten'
import { addTile, removeTile } from './tiles'
import type { RoundState, RoundStatus, TileKind, TurnRecord } from './types'

/**
 * 開新的一局：起手 16 張 + 洗混的牌池。因為 MVP 不模擬對手，
 * 只有自摸能胡牌，沒有放槍/接炮。
 */
export function createRound(): RoundState {
  const { hand, wall } = dealNewRound()
  return { status: 'playing', hand, wall, drawnTile: null, turnIndex: 0, history: [] }
}

/** 從牌池摸一張牌，手牌變成 17 張。若牌池已空則直接流局。 */
export function drawTile(state: RoundState): RoundState {
  if (state.status !== 'playing') {
    throw new Error('本局已經結束，無法再摸牌')
  }
  if (state.drawnTile !== null) {
    throw new Error('已經摸牌了，請先出牌或宣告胡牌')
  }
  if (state.wall.length === 0) {
    return { ...state, status: 'drawn' }
  }

  const [drawn, ...restWall] = state.wall
  const hand = addTile(state.hand, drawn)
  return { ...state, hand, wall: restWall, drawnTile: drawn, turnIndex: state.turnIndex + 1 }
}

/** 摸到的牌讓手牌完整（向聽 -1）時可以宣告自摸 */
export function declareWin(state: RoundState): RoundState {
  if (state.status !== 'playing' || state.drawnTile === null) {
    throw new Error('目前無法宣告胡牌')
  }
  if (computeShanten(state.hand) !== -1) {
    throw new Error('目前手牌尚未胡牌，不能宣告胡牌')
  }
  return { ...state, status: 'won' }
}

/** 打出一張牌，記錄這回合的評估結果，並判斷是否已達回合上限而流局 */
export function discardTile(state: RoundState, discard: TileKind): RoundState {
  if (state.status !== 'playing' || state.drawnTile === null) {
    throw new Error('目前無法出牌')
  }

  const evaluations = evaluateAllDiscards(state.hand)
  const best = evaluations[0]
  const chosen = evaluations.find((e) => e.discard === discard)
  if (!chosen) {
    throw new Error('打出的牌不在手牌中')
  }

  const record: TurnRecord = {
    turnIndex: state.turnIndex,
    handBeforeDiscard: state.hand,
    drawnTile: state.drawnTile,
    discard,
    evaluations,
    wasOptimal:
      chosen.ukeire.shanten === best.ukeire.shanten &&
      chosen.ukeire.totalRemaining === best.ukeire.totalRemaining,
    keptShanten: chosen.ukeire.shanten === best.ukeire.shanten,
  }

  const hand = removeTile(state.hand, discard)
  const history = [...state.history, record]
  const status: RoundStatus = state.turnIndex >= ROUND_MAX_DRAWS ? 'drawn' : 'playing'

  return { ...state, hand, drawnTile: null, history, status }
}

export function isRoundOver(state: RoundState): boolean {
  return state.status !== 'playing'
}
