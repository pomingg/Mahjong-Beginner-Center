import { NEEDED_MELDS, SUIT_SIZE } from './constants'
import { getSuitSlice } from './tiles'
import type { HandCounts } from './types'

/**
 * 一種花色（或字牌整體）內某種取捨方式下達成的區塊組合：
 * melds = 完整面子數，partials = 搭子數（含未定位的對子），hasPair = 是否已指定其中一個搭子作將眼
 */
interface BlockOption {
  melds: number
  partials: number
  hasPair: boolean
}

function dominates(b: BlockOption, a: BlockOption): boolean {
  const geMelds = b.melds >= a.melds
  const gePartials = b.partials >= a.partials
  const gePair = (b.hasPair ? 1 : 0) >= (a.hasPair ? 1 : 0)
  const strictlyGreater = b.melds > a.melds || b.partials > a.partials || (b.hasPair && !a.hasPair)
  return geMelds && gePartials && gePair && strictlyGreater
}

/** 只保留柏拉圖最優解（沒有任何其他選項在三個維度上都不劣且至少一項更優） */
function pruneDominated(options: BlockOption[]): BlockOption[] {
  const seen = new Map<string, BlockOption>()
  for (const o of options) {
    const key = `${o.melds}|${o.partials}|${o.hasPair}`
    if (!seen.has(key)) seen.set(key, o)
  }
  const list = [...seen.values()]
  return list.filter((a) => !list.some((b) => b !== a && dominates(b, a)))
}

function foldGroups(groups: BlockOption[][]): BlockOption[] {
  let states: BlockOption[] = [{ melds: 0, partials: 0, hasPair: false }]
  for (const group of groups) {
    const next: BlockOption[] = []
    for (const s of states) {
      for (const o of group) {
        next.push({
          melds: s.melds + o.melds,
          partials: s.partials + o.partials,
          hasPair: s.hasPair || o.hasPair,
        })
      }
    }
    states = pruneDominated(next)
  }
  return states
}

const suitMemo = new Map<string, BlockOption[]>()

/**
 * 對單一花色（萬/筒/條，9 個數字）做遞迴分解，窮舉所有柏拉圖最優的
 * (面子數, 搭子數, 是否含將眼) 組合。花色之間結構相同，記憶化可跨花色/跨手牌共用。
 */
function decomposeSuit(counts: number[], index = 0): BlockOption[] {
  if (index === counts.length) return [{ melds: 0, partials: 0, hasPair: false }]

  const key = `${index}|${counts.slice(index).join(',')}`
  const cached = suitMemo.get(key)
  if (cached) return cached

  let results: BlockOption[]
  if (counts[index] === 0) {
    results = decomposeSuit(counts, index + 1)
  } else {
    const branches: BlockOption[][] = []
    const c = counts[index]

    if (c >= 3) {
      const next = counts.slice()
      next[index] -= 3
      const sub = decomposeSuit(next, index)
      branches.push(sub.map((o) => ({ ...o, melds: o.melds + 1 })))
    }
    if (c >= 2) {
      const next = counts.slice()
      next[index] -= 2
      const sub = decomposeSuit(next, index)
      // 這對牌可以留著湊刻子（算搭子），也可以直接當將眼——兩者互斥，
      // 當將眼時這 2 張牌整個被將眼消耗掉，不能同時再算進 partials
      branches.push(sub.map((o) => ({ ...o, partials: o.partials + 1 })))
      branches.push(sub.map((o) => ({ ...o, hasPair: true })))
    }
    if (index + 2 < counts.length && c >= 1 && counts[index + 1] >= 1 && counts[index + 2] >= 1) {
      const next = counts.slice()
      next[index] -= 1
      next[index + 1] -= 1
      next[index + 2] -= 1
      const sub = decomposeSuit(next, index)
      branches.push(sub.map((o) => ({ ...o, melds: o.melds + 1 })))
    }
    if (index + 1 < counts.length && c >= 1 && counts[index + 1] >= 1) {
      const next = counts.slice()
      next[index] -= 1
      next[index + 1] -= 1
      const sub = decomposeSuit(next, index)
      branches.push(sub.map((o) => ({ ...o, partials: o.partials + 1 })))
    }
    if (index + 2 < counts.length && c >= 1 && counts[index + 2] >= 1) {
      const next = counts.slice()
      next[index] -= 1
      next[index + 2] -= 1
      const sub = decomposeSuit(next, index)
      branches.push(sub.map((o) => ({ ...o, partials: o.partials + 1 })))
    }
    // 放棄這個位置剩下的牌（當作孤張），直接往下一個位置看
    branches.push(decomposeSuit(counts, index + 1))

    results = pruneDominated(branches.flat())
  }

  suitMemo.set(key, results)
  return results
}

function decomposeHonorKind(count: number): BlockOption[] {
  if (count <= 1) return [{ melds: 0, partials: 0, hasPair: false }]
  if (count === 2) {
    return [
      { melds: 0, partials: 1, hasPair: false },
      { melds: 0, partials: 0, hasPair: true },
    ]
  }
  // 3 或 4 張：湊刻子最好，或留一對當將眼（將眼與搭子互斥，不重複計算）
  return [
    { melds: 1, partials: 0, hasPair: false },
    { melds: 0, partials: 0, hasPair: true },
  ]
}

function decomposeHonors(counts: number[]): BlockOption[] {
  return foldGroups(counts.map(decomposeHonorKind))
}

/**
 * 計算向聽數，NEEDED_MELDS 可調整（預設台灣麻將 5 組面子）。
 * -1 表示已經是完整胡牌（NEEDED_MELDS 組面子 + 1 對子）。
 */
export function computeShanten(counts: HandCounts, neededMelds: number = NEEDED_MELDS): number {
  const man = decomposeSuit(getSuitSlice(counts, 'man').slice(0, SUIT_SIZE))
  const pin = decomposeSuit(getSuitSlice(counts, 'pin').slice(0, SUIT_SIZE))
  const tiao = decomposeSuit(getSuitSlice(counts, 'tiao').slice(0, SUIT_SIZE))
  const honor = decomposeHonors(getSuitSlice(counts, 'honor'))

  const finalStates = foldGroups([man, pin, tiao, honor])
  const totalHandTiles = counts.reduce((sum, c) => sum + c, 0)

  let best = Infinity
  for (const s of finalStates) {
    const cappedMelds = Math.min(s.melds, neededMelds)
    const meldDeficit = neededMelds - cappedMelds
    const cappedPartials = Math.max(0, Math.min(s.partials, meldDeficit))
    const meldPortionCost = 2 * meldDeficit - cappedPartials

    // 將眼（對子）不是面子槽位之一，是額外需要的一塊：已經有將眼成本 0；
    // 沒有將眼但手上還有多的牌（孤張或用不到面子槽位的搭子）可以當作將眼種子，成本 1（單騎聽）；
    // 完全沒有多餘的牌才會是成本 2（16/17 張的台灣麻將手牌實際上不會發生這種情況）。
    const usedTiles = 3 * cappedMelds + 2 * cappedPartials
    const hasLeftoverTile = totalHandTiles - usedTiles > 0
    const pairCost = s.hasPair ? 0 : hasLeftoverTile ? 1 : 2

    const shanten = Math.max(-1, meldPortionCost + pairCost - 1)
    if (shanten < best) best = shanten
  }
  return best
}
