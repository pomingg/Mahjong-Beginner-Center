import { TOTAL_KINDS } from './constants'
import { kindToRank, kindToSuit } from './tiles'
import type { TileKind } from './types'

const SUIT_CHAR: Record<'man' | 'pin' | 'tiao', string> = {
  man: '萬',
  pin: '筒',
  tiao: '條',
}

const HONOR_CHAR = ['東', '南', '西', '北', '中', '發', '白'] as const

const NUMERAL = ['一', '二', '三', '四', '五', '六', '七', '八', '九']

/** 完整中文標籤，例如「五萬」「東」「中」 */
export function getTileLabel(kind: TileKind): string {
  const suit = kindToSuit(kind)
  if (suit === 'honor') return HONOR_CHAR[kindToRank(kind)]
  const rank = kindToRank(kind)
  return `${NUMERAL[rank - 1]}${SUIT_CHAR[suit]}`
}

/**
 * 把一組同花色的牌渲染成精簡標籤：數字牌合併數字只留一個花色字（如 [4,5,6]→「456萬」、
 * [4,4]→「44筒」），字牌則重複字本身（如 [中,中]→「中中」）。
 */
export function getTileGroupLabel(tiles: TileKind[]): string {
  if (tiles.length === 0) return ''
  const suit = kindToSuit(tiles[0])
  if (suit === 'honor') return tiles.map((k) => HONOR_CHAR[kindToRank(k)]).join('')
  const digits = tiles.map((k) => String(kindToRank(k))).join('')
  return `${digits}${SUIT_CHAR[suit]}`
}

/** 牌面上要顯示的短字，例如數字牌顯示「5」+ 花色符號，字牌顯示自己 */
export function getTileGlyph(kind: TileKind): { main: string; suitMark: string | null } {
  const suit = kindToSuit(kind)
  if (suit === 'honor') return { main: HONOR_CHAR[kindToRank(kind)], suitMark: null }
  const rank = kindToRank(kind)
  return { main: String(rank), suitMark: SUIT_CHAR[suit] }
}

export const ALL_KINDS: TileKind[] = Array.from({ length: TOTAL_KINDS }, (_, i) => i)
