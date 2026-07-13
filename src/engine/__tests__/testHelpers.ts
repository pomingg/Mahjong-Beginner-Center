import { TOTAL_KINDS } from '../constants'
import type { TileKind } from '../types'

export const m = (n: number): TileKind => n - 1
export const p = (n: number): TileKind => 9 + n - 1
export const s = (n: number): TileKind => 18 + n - 1
export const E = 27
export const S = 28
export const W = 29
export const N = 30
export const C = 31 // 中
export const F = 32 // 發
export const Wh = 33 // 白

export function makeCounts(kinds: TileKind[]): number[] {
  const counts = new Array(TOTAL_KINDS).fill(0)
  for (const k of kinds) counts[k] += 1
  return counts
}

export function randomInt(max: number): number {
  return Math.floor(Math.random() * max)
}

/** 產生隨機合法手牌（每種牌最多 4 張），用於 property-based 交叉驗證 */
export function randomHand(size: number): number[] {
  const counts = new Array(TOTAL_KINDS).fill(0)
  let placed = 0
  let guard = 0
  while (placed < size && guard < size * 100) {
    guard += 1
    const kind = randomInt(TOTAL_KINDS)
    if (counts[kind] < 4) {
      counts[kind] += 1
      placed += 1
    }
  }
  return counts
}
