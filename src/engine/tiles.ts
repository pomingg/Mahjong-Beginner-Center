import { HONOR_COUNT, HONOR_START, SUIT_SIZE, TOTAL_KINDS } from './constants'
import type { HandCounts, Suit, TileKind } from './types'

export function isValidKind(kind: TileKind): boolean {
  return Number.isInteger(kind) && kind >= 0 && kind < TOTAL_KINDS
}

export function kindToSuit(kind: TileKind): Suit {
  if (kind < SUIT_SIZE) return 'man'
  if (kind < SUIT_SIZE * 2) return 'pin'
  if (kind < SUIT_SIZE * 3) return 'tiao'
  return 'honor'
}

/** 數字牌回傳 1-9，字牌回傳 0-6（東南西北中發白對應的字牌內部序位） */
export function kindToRank(kind: TileKind): number {
  const suit = kindToSuit(kind)
  if (suit === 'honor') return kind - HONOR_START
  return (kind % SUIT_SIZE) + 1
}

export function createEmptyCounts(): number[] {
  return new Array(TOTAL_KINDS).fill(0)
}

export function cloneCounts(counts: HandCounts): number[] {
  return [...counts]
}

export function addTile(counts: HandCounts, kind: TileKind): number[] {
  const next = cloneCounts(counts)
  next[kind] += 1
  return next
}

export function removeTile(counts: HandCounts, kind: TileKind): number[] {
  if (counts[kind] <= 0) {
    throw new Error(`無法打出手牌中沒有的牌：kind=${kind}`)
  }
  const next = cloneCounts(counts)
  next[kind] -= 1
  return next
}

export function totalTiles(counts: HandCounts): number {
  return counts.reduce((sum, c) => sum + c, 0)
}

/** 把 counts 展開成排序過的牌種陣列，方便 UI 逐張渲染手牌 */
export function countsToSortedKinds(counts: HandCounts): TileKind[] {
  const kinds: TileKind[] = []
  for (let kind = 0; kind < counts.length; kind += 1) {
    for (let i = 0; i < counts[kind]; i += 1) {
      kinds.push(kind)
    }
  }
  return kinds
}

/** 取出某花色群組在 counts 中對應的區段（man/pin/tiao 長度 9，honor 長度 7） */
export function getSuitSlice(counts: HandCounts, suit: Suit): number[] {
  if (suit === 'man') return counts.slice(0, SUIT_SIZE) as number[]
  if (suit === 'pin') return counts.slice(SUIT_SIZE, SUIT_SIZE * 2) as number[]
  if (suit === 'tiao') return counts.slice(SUIT_SIZE * 2, SUIT_SIZE * 3) as number[]
  return counts.slice(HONOR_START, HONOR_START + HONOR_COUNT) as number[]
}
