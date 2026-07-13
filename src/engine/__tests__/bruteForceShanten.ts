/**
 * 獨立於 shanten.ts 的暴力法向聽數計算，只用於測試交叉驗證。
 * 直接對完整 34 種牌的 counts 做遞迴搜尋（不像 shanten.ts 先拆成 4 個花色群組再合併），
 * 用來確認「拆花色分別計算再合併」這個最佳化手法沒有漏掉任何組合。
 */

interface Block {
  melds: number
  partials: number
  hasPair: boolean
}

const SUIT_SIZE = 9
const HONOR_START = 27

function isSuited(kind: number): boolean {
  return kind < HONOR_START
}

function rankInSuit(kind: number): number {
  return kind % SUIT_SIZE
}

function dominates(b: Block, a: Block): boolean {
  const ge = b.melds >= a.melds && b.partials >= a.partials && (b.hasPair ? 1 : 0) >= (a.hasPair ? 1 : 0)
  const gt = b.melds > a.melds || b.partials > a.partials || (b.hasPair && !a.hasPair)
  return ge && gt
}

function pruneDominated(options: Block[]): Block[] {
  const seen = new Map<string, Block>()
  for (const o of options) {
    seen.set(`${o.melds}|${o.partials}|${o.hasPair}`, o)
  }
  const list = [...seen.values()]
  return list.filter((a) => !list.some((b) => b !== a && dominates(b, a)))
}

const memo = new Map<string, Block[]>()

function search(counts: number[], index: number): Block[] {
  if (index === counts.length) return [{ melds: 0, partials: 0, hasPair: false }]

  const key = `${index}|${counts.slice(index).join(',')}`
  const cached = memo.get(key)
  if (cached) return cached

  let results: Block[]
  if (counts[index] === 0) {
    results = search(counts, index + 1)
  } else {
    const branches: Block[][] = []
    const c = counts[index]
    const suited = isSuited(index)
    const rank = rankInSuit(index)

    if (c >= 3) {
      const next = counts.slice()
      next[index] -= 3
      branches.push(search(next, index).map((o) => ({ ...o, melds: o.melds + 1 })))
    }
    if (c >= 2) {
      const next = counts.slice()
      next[index] -= 2
      const sub = search(next, index)
      branches.push(sub.map((o) => ({ ...o, partials: o.partials + 1 })))
      branches.push(sub.map((o) => ({ ...o, hasPair: true })))
    }
    if (suited && rank <= 6 && counts[index + 1] >= 1 && counts[index + 2] >= 1) {
      const next = counts.slice()
      next[index] -= 1
      next[index + 1] -= 1
      next[index + 2] -= 1
      branches.push(search(next, index).map((o) => ({ ...o, melds: o.melds + 1 })))
    }
    if (suited && rank <= 7 && counts[index + 1] >= 1) {
      const next = counts.slice()
      next[index] -= 1
      next[index + 1] -= 1
      branches.push(search(next, index).map((o) => ({ ...o, partials: o.partials + 1 })))
    }
    if (suited && rank <= 6 && counts[index + 2] >= 1) {
      const next = counts.slice()
      next[index] -= 1
      next[index + 2] -= 1
      branches.push(search(next, index).map((o) => ({ ...o, partials: o.partials + 1 })))
    }
    branches.push(search(counts, index + 1))

    results = pruneDominated(branches.flat())
  }

  memo.set(key, results)
  return results
}

export function bruteForceShanten(counts: number[], neededMelds: number): number {
  const states = search(counts, 0)
  const totalHandTiles = counts.reduce((sum, c) => sum + c, 0)

  let best = Infinity
  for (const st of states) {
    const cappedMelds = Math.min(st.melds, neededMelds)
    const meldDeficit = neededMelds - cappedMelds
    const cappedPartials = Math.max(0, Math.min(st.partials, meldDeficit))
    const meldPortionCost = 2 * meldDeficit - cappedPartials
    const usedTiles = 3 * cappedMelds + 2 * cappedPartials
    const hasLeftoverTile = totalHandTiles - usedTiles > 0
    const pairCost = st.hasPair ? 0 : hasLeftoverTile ? 1 : 2
    const shanten = Math.max(-1, meldPortionCost + pairCost - 1)
    if (shanten < best) best = shanten
  }
  return best
}
