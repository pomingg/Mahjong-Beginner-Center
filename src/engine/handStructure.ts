import { HONOR_START, SUIT_SIZE } from './constants'
import { getSuitSlice } from './tiles'
import type { HandCounts, TileKind } from './types'

/** 搭子的細分類型，供教學文字用更精確的說法（兩面 / 嵌張 / 邊張 / 對子） */
export type TaatsuKind = 'ryanmen' | 'kanchan' | 'penchan' | 'pair'

export interface Meld {
  /** 'run' = 順子，'triplet' = 刻子 */
  kind: 'run' | 'triplet'
  tiles: TileKind[]
}

export interface Taatsu {
  kind: TaatsuKind
  tiles: TileKind[]
}

export interface HandShape {
  melds: Meld[]
  taatsu: Taatsu[]
  /** 從 taatsu 中挑出一組對子作為將眼（若有），方便文字直接點名 */
  eye: Taatsu | null
  floaters: TileKind[]
}

interface SuitResult {
  melds: Meld[]
  taatsu: Taatsu[]
  floaters: TileKind[]
}

const EMPTY: SuitResult = { melds: [], taatsu: [], floaters: [] }

/** 比較兩個分解：面子多者優先，其次搭子多者，其次孤張少者。回傳 true 表示 a 較佳。 */
function better(a: SuitResult, b: SuitResult): boolean {
  if (a.melds.length !== b.melds.length) return a.melds.length > b.melds.length
  if (a.taatsu.length !== b.taatsu.length) return a.taatsu.length > b.taatsu.length
  return a.floaters.length < b.floaters.length
}

function prepend(group: Meld | Taatsu, rest: SuitResult): SuitResult {
  if ('kind' in group && (group.kind === 'run' || group.kind === 'triplet')) {
    return { ...rest, melds: [group as Meld, ...rest.melds] }
  }
  return { ...rest, taatsu: [group as Taatsu, ...rest.taatsu] }
}

/**
 * 對單一數字花色（9 個計數）遞迴找出一組「面子最多、其次搭子最多」的可讀分解。
 * base 是這個花色第一張牌的全域 kind（萬=0、筒=9、條=18）。
 * 只用於教學展示，手牌只有 16 張，遞迴規模很小，不做記憶化。
 */
function decomposeNumberSuit(counts: number[], base: TileKind, index = 0): SuitResult {
  if (index >= counts.length) return EMPTY
  if (counts[index] === 0) return decomposeNumberSuit(counts, base, index + 1)

  const kind = base + index
  const candidates: SuitResult[] = []

  // 刻子
  if (counts[index] >= 3) {
    const next = counts.slice()
    next[index] -= 3
    candidates.push(
      prepend({ kind: 'triplet', tiles: [kind, kind, kind] }, decomposeNumberSuit(next, base, index)),
    )
  }
  // 順子
  if (index + 2 < counts.length && counts[index + 1] >= 1 && counts[index + 2] >= 1) {
    const next = counts.slice()
    next[index] -= 1
    next[index + 1] -= 1
    next[index + 2] -= 1
    candidates.push(
      prepend(
        { kind: 'run', tiles: [kind, kind + 1, kind + 2] },
        decomposeNumberSuit(next, base, index),
      ),
    )
  }
  // 對子
  if (counts[index] >= 2) {
    const next = counts.slice()
    next[index] -= 2
    candidates.push(
      prepend({ kind: 'pair', tiles: [kind, kind] }, decomposeNumberSuit(next, base, index)),
    )
  }
  // 兩面 / 邊張搭子（相鄰）
  if (index + 1 < counts.length && counts[index + 1] >= 1) {
    const next = counts.slice()
    next[index] -= 1
    next[index + 1] -= 1
    const rank = index + 1 // 1-9
    const taatsuKind: TaatsuKind = rank === 1 || rank === 8 ? 'penchan' : 'ryanmen'
    candidates.push(
      prepend({ kind: taatsuKind, tiles: [kind, kind + 1] }, decomposeNumberSuit(next, base, index)),
    )
  }
  // 嵌張搭子（隔一張）
  if (index + 2 < counts.length && counts[index + 2] >= 1) {
    const next = counts.slice()
    next[index] -= 1
    next[index + 2] -= 1
    candidates.push(
      prepend({ kind: 'kanchan', tiles: [kind, kind + 2] }, decomposeNumberSuit(next, base, index)),
    )
  }
  // 當作孤張
  {
    const next = counts.slice()
    next[index] -= 1
    const sub = decomposeNumberSuit(next, base, index)
    candidates.push({ ...sub, floaters: [kind, ...sub.floaters] })
  }

  return candidates.reduce((best, c) => (better(c, best) ? c : best))
}

function decomposeHonors(counts: number[]): SuitResult {
  const melds: Meld[] = []
  const taatsu: Taatsu[] = []
  const floaters: TileKind[] = []
  for (let i = 0; i < counts.length; i += 1) {
    const kind = HONOR_START + i
    const c = counts[i]
    if (c >= 3) melds.push({ kind: 'triplet', tiles: [kind, kind, kind] })
    else if (c === 2) taatsu.push({ kind: 'pair', tiles: [kind, kind] })
    else if (c === 1) floaters.push(kind)
  }
  return { melds, taatsu, floaters }
}

/**
 * 把手牌讀成人看得懂的結構：已成形的面子、還在等牌的搭子、可作將眼的對子、以及孤張。
 * 面子數與搭子數會盡量最大化，讓分析文字能點名「你已經組好的好牌型」。
 */
export function readHandStructure(hand: HandCounts): HandShape {
  const numberSuits: Array<{ suit: 'man' | 'pin' | 'tiao'; base: TileKind }> = [
    { suit: 'man', base: 0 },
    { suit: 'pin', base: SUIT_SIZE },
    { suit: 'tiao', base: SUIT_SIZE * 2 },
  ]

  const melds: Meld[] = []
  const taatsu: Taatsu[] = []
  const floaters: TileKind[] = []

  for (const { suit, base } of numberSuits) {
    const slice = getSuitSlice(hand, suit).slice(0, SUIT_SIZE)
    const res = decomposeNumberSuit(slice, base)
    melds.push(...res.melds)
    taatsu.push(...res.taatsu)
    floaters.push(...res.floaters)
  }

  const honors = decomposeHonors(getSuitSlice(hand, 'honor'))
  melds.push(...honors.melds)
  taatsu.push(...honors.taatsu)
  floaters.push(...honors.floaters)

  const eye = taatsu.find((t) => t.kind === 'pair') ?? null

  return { melds, taatsu, eye, floaters }
}
