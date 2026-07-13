import { MAX_COPIES_PER_KIND } from './constants'
import { computeShanten } from './shanten'
import { addTile } from './tiles'
import type { HandCounts, UkeireResult } from './types'

/**
 * 計算手牌的进張：向聽數為 S 時，找出所有「摸到後向聽數會降到 S-1」的牌種，
 * 並標註剩餘張數（MVP 沒有其他玩家的資訊，只能用 4 減去手牌中已有的張數）。
 */
export function computeUkeire(hand: HandCounts): UkeireResult {
  const shanten = computeShanten(hand)

  if (shanten === -1) {
    return { shanten, tiles: [], totalRemaining: 0 }
  }

  const tiles: UkeireResult['tiles'] = []
  for (let kind = 0; kind < hand.length; kind += 1) {
    if (hand[kind] >= MAX_COPIES_PER_KIND) continue
    const withDraw = addTile(hand, kind)
    if (computeShanten(withDraw) < shanten) {
      tiles.push({ kind, remaining: MAX_COPIES_PER_KIND - hand[kind] })
    }
  }

  const totalRemaining = tiles.reduce((sum, t) => sum + t.remaining, 0)
  return { shanten, tiles, totalRemaining }
}
