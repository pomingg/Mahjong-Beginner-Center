import { MAX_COPIES_PER_KIND, HONOR_START, SUIT_SIZE } from './constants'
import { getTileGroupLabel, getTileLabel } from './tileLabels'
import { getSuitSlice } from './tiles'
import type { HandCounts, TileKind } from './types'

export interface WaitingTile {
  kind: TileKind
  remaining: number
}

export interface TileGroup {
  tiles: TileKind[]
  label: string
}

export interface BranchOption {
  description: string
  waitingFor: WaitingTile[]
}

export interface TileClusterAnalysis {
  tiles: TileKind[]
  label: string
  status: 'complete' | 'developing' | 'isolated'
  branches: BranchOption[]
}

export interface HandTension {
  description: string
}

export interface HandBranchAnalysis {
  clusters: TileClusterAnalysis[]
  tensions: HandTension[]
}

function tileLabel(kind: TileKind): string {
  return getTileLabel(kind)
}

function remaining(hand: HandCounts, kind: TileKind): number {
  return MAX_COPIES_PER_KIND - hand[kind]
}

export function groupConnectedIndices(counts: number[]): number[][] {
  const groups: number[][] = []
  let i = 0
  while (i < counts.length) {
    if (counts[i] === 0) { i++; continue }
    const group: number[] = [i]
    let j = i + 1
    while (j < counts.length && counts[j] > 0) {
      group.push(j)
      j++
    }
    if (j < counts.length && counts[j] === 0 && j + 1 < counts.length && counts[j + 1] > 0) {
      const left = group.slice()
      const leftTotal = left.reduce((s, idx) => s + counts[idx], 0)
      if (leftTotal < 3 || counts[j + 1] < 3) {
        group.push(j + 1)
        j += 2
        while (j < counts.length && counts[j] > 0) {
          group.push(j)
          j++
        }
      }
    }
    groups.push(group)
    i = j
  }
  return groups
}

function analyzeNumberCluster(
  indices: number[],
  counts: number[],
  base: TileKind,
  hand: HandCounts,
): TileClusterAnalysis {
  const tiles: TileKind[] = []
  for (const idx of indices) {
    for (let c = 0; c < counts[idx]; c++) tiles.push(base + idx)
  }
  const label = getTileGroupLabel(tiles)

  if (tiles.length === 1) {
    const kind = tiles[0]
    const branches: BranchOption[] = []
    const waits: WaitingTile[] = []
    for (let d = -2; d <= 2; d++) {
      if (d === 0) continue
      const ni = indices[0] + d
      if (ni < 0 || ni >= 9) continue
      const nk = base + ni
      if (remaining(hand, nk) > 0) waits.push({ kind: nk, remaining: remaining(hand, nk) })
    }
    if (waits.length > 0) {
      branches.push({
        description: `${tileLabel(kind)} 目前落單，需要摸到旁邊的牌才能湊出搭子`,
        waitingFor: waits,
      })
    }
    return { tiles, label, status: 'isolated', branches }
  }

  if (indices.length === 1 && counts[indices[0]] >= 3) {
    const kind = base + indices[0]
    const branches: BranchOption[] = [{
      description: `${getTileGroupLabel([kind, kind, kind])} 已經是一組刻子`,
      waitingFor: [],
    }]
    if (counts[indices[0]] === 4) {
      branches[0].description = `有 4 張 ${tileLabel(kind)}，其中 3 張是刻子，多 1 張可以丟`
    }
    return { tiles, label, status: 'complete', branches }
  }

  if (indices.length === 1 && counts[indices[0]] === 2) {
    const kind = base + indices[0]
    const branches: BranchOption[] = []
    branches.push({
      description: `留著當將（最後那一對）`,
      waitingFor: [],
    })
    const rem = remaining(hand, kind)
    if (rem > 0) {
      branches.push({
        description: `等再一張 ${tileLabel(kind)} 做刻子`,
        waitingFor: [{ kind, remaining: rem }],
      })
    }
    return { tiles, label, status: 'developing', branches }
  }

  const branches: BranchOption[] = []
  analyzeClusterBranches(indices, counts, base, hand, branches)

  const allComplete = tiles.length >= 3 && branches.length > 0 &&
    branches.every(b => b.waitingFor.length === 0)
  const status = allComplete ? 'complete' as const : 'developing' as const

  return { tiles, label, status, branches }
}

function analyzeClusterBranches(
  indices: number[],
  counts: number[],
  base: TileKind,
  hand: HandCounts,
  branches: BranchOption[],
): void {
  const seen = new Set<string>()

  function addBranch(desc: string, waits: WaitingTile[]) {
    if (seen.has(desc)) return
    seen.add(desc)
    branches.push({ description: desc, waitingFor: waits })
  }

  for (let i = 0; i < indices.length; i++) {
    const idx = indices[i]
    const kind = base + idx

    if (counts[idx] >= 3) {
      const tripletLabel = getTileGroupLabel([kind, kind, kind])
      const leftover: TileKind[] = []
      const tempCounts = counts.slice()
      tempCounts[idx] -= 3
      for (const j of indices) {
        for (let c = 0; c < (j === idx ? tempCounts[j] : counts[j]); c++) {
          leftover.push(base + j)
        }
      }
      if (leftover.length > 0) {
        const leftLabel = getTileGroupLabel(leftover)
        const waits = computeWaitsForLeftover(leftover, base, hand)
        addBranch(`${tripletLabel} 做刻子，剩下 ${leftLabel} 再找搭`, waits)
      } else {
        addBranch(`${tripletLabel} 做刻子`, [])
      }
    }

    for (let j = i + 1; j < indices.length; j++) {
      if (indices[j] - indices[i] > 2) continue

      if (indices[j] === indices[i] + 1 && counts[indices[i]] >= 1 && counts[indices[j]] >= 1) {
        const k1 = base + indices[i], k2 = base + indices[j]
        const seqLabel = getTileGroupLabel([k1, k2])
        const waits: WaitingTile[] = []
        const r1 = indices[i], r2 = indices[j]
        if (r1 > 0) {
          const wk = base + r1 - 1
          if (remaining(hand, wk) > 0) waits.push({ kind: wk, remaining: remaining(hand, wk) })
        }
        if (r2 < 8) {
          const wk = base + r2 + 1
          if (remaining(hand, wk) > 0) waits.push({ kind: wk, remaining: remaining(hand, wk) })
        }
        const waitDesc = waits.map(w => tileLabel(w.kind)).join(' 或 ')
        const totalRem = waits.reduce((s, w) => s + w.remaining, 0)

        const leftover: TileKind[] = []
        const tempCounts = counts.slice()
        tempCounts[indices[i]] -= 1
        tempCounts[indices[j]] -= 1
        for (const k of indices) {
          for (let c = 0; c < tempCounts[k]; c++) leftover.push(base + k)
        }

        let desc: string
        if (r1 === 0) {
          desc = `${seqLabel} 靠邊，只能等 ${waitDesc}（${totalRem} 張）`
        } else if (r2 === 8) {
          desc = `${seqLabel} 靠邊，只能等 ${waitDesc}（${totalRem} 張）`
        } else {
          desc = `${seqLabel} 等 ${waitDesc}（共 ${totalRem} 張）`
        }
        if (leftover.length > 0) {
          desc += `，多出來的 ${getTileGroupLabel(leftover)} 可以另外找搭或丟掉`
        }
        addBranch(desc, waits)
      }

      if (indices[j] === indices[i] + 2 && counts[indices[i]] >= 1 && counts[indices[j]] >= 1) {
        const k1 = base + indices[i], k2 = base + indices[j]
        const seqLabel = getTileGroupLabel([k1, k2])
        const midKind = base + indices[i] + 1
        const waits: WaitingTile[] = []
        const rem = remaining(hand, midKind)
        if (rem > 0) waits.push({ kind: midKind, remaining: rem })
        const waitDesc = tileLabel(midKind)

        const leftover: TileKind[] = []
        const tempCounts = counts.slice()
        tempCounts[indices[i]] -= 1
        tempCounts[indices[j]] -= 1
        for (const k of indices) {
          for (let c = 0; c < tempCounts[k]; c++) leftover.push(base + k)
        }

        let desc = `${seqLabel} 中間等 ${waitDesc}（${rem} 張）`
        if (leftover.length > 0) {
          desc += `，多出來的 ${getTileGroupLabel(leftover)} 可以另外找搭或丟掉`
        }
        addBranch(desc, waits)
      }
    }

    if (counts[idx] >= 2) {
      const pairLabel = getTileGroupLabel([kind, kind])
      const rem = remaining(hand, kind)

      const leftover: TileKind[] = []
      const tempCounts = counts.slice()
      tempCounts[idx] -= 2
      for (const j of indices) {
        for (let c = 0; c < tempCounts[j]; c++) leftover.push(base + j)
      }

      const descs: string[] = [`${pairLabel} 留著當將`]
      if (rem > 0) {
        descs.push(`或等 ${tileLabel(kind)} 做刻（剩 ${rem} 張）`)
      }
      let desc = descs.join('，')
      if (leftover.length > 0) {
        desc += `；剩下 ${getTileGroupLabel(leftover)} 再找搭`
      }
      addBranch(desc, rem > 0 ? [{ kind, remaining: rem }] : [])
    }

    if (idx + 2 < 9 && counts[idx] >= 1 && counts[idx + 1] >= 1 && counts[idx + 2] >= 1) {
      const k1 = kind, k2 = kind + 1, k3 = kind + 2
      const runLabel = getTileGroupLabel([k1, k2, k3])
      const leftover: TileKind[] = []
      const tempCounts = counts.slice()
      tempCounts[idx] -= 1
      tempCounts[idx + 1] -= 1
      tempCounts[idx + 2] -= 1
      for (const j of indices) {
        for (let c = 0; c < tempCounts[j]; c++) leftover.push(base + j)
      }

      let desc = `${runLabel} 已經是一組順子`
      if (leftover.length > 0) {
        desc += `，剩下 ${getTileGroupLabel(leftover)} 再找搭`
      }
      addBranch(desc, [])
    }
  }
}

function computeWaitsForLeftover(leftover: TileKind[], base: TileKind, hand: HandCounts): WaitingTile[] {
  const waits: WaitingTile[] = []
  const seen = new Set<TileKind>()
  for (const k of leftover) {
    for (let d = -2; d <= 2; d++) {
      if (d === 0) continue
      const nk = k + d
      if (nk < base || nk >= base + 9) continue
      if (seen.has(nk)) continue
      if (remaining(hand, nk) > 0 && !leftover.includes(nk)) {
        seen.add(nk)
        waits.push({ kind: nk, remaining: remaining(hand, nk) })
      }
    }
  }
  return waits
}

function analyzeHonors(hand: HandCounts): TileClusterAnalysis[] {
  const clusters: TileClusterAnalysis[] = []
  for (let i = 0; i < 7; i++) {
    const kind = HONOR_START + i
    const count = hand[kind]
    if (count === 0) continue

    const tiles = Array.from({ length: count }, () => kind)
    const label = getTileGroupLabel(tiles)

    if (count >= 3) {
      clusters.push({
        tiles, label,
        status: 'complete',
        branches: [{ description: `${label} 已經是一組刻子`, waitingFor: [] }],
      })
    } else if (count === 2) {
      const rem = remaining(hand, kind)
      const branches: BranchOption[] = [
        { description: `留著當將（最後那一對）`, waitingFor: [] },
      ]
      if (rem > 0) {
        branches.push({
          description: `等再一張 ${tileLabel(kind)} 做刻子（剩 ${rem} 張）`,
          waitingFor: [{ kind, remaining: rem }],
        })
      }
      clusters.push({ tiles, label, status: 'developing', branches })
    } else {
      const rem = remaining(hand, kind)
      clusters.push({
        tiles, label,
        status: 'isolated',
        branches: [{
          description: `${tileLabel(kind)} 落單，字牌沒辦法湊順子，只能等碰成刻或當孤張丟掉`,
          waitingFor: rem > 0 ? [{ kind, remaining: rem }] : [],
        }],
      })
    }
  }
  return clusters
}

function detectTensions(clusters: TileClusterAnalysis[]): HandTension[] {
  const tensions: HandTension[] = []

  const pairClusters = clusters.filter(c =>
    c.branches.some(b => b.description.includes('當將'))
  )
  if (pairClusters.length >= 2) {
    const names = pairClusters.map(c => c.label).join('、')
    tensions.push({
      description: `有 ${pairClusters.length} 組對子（${names}）在搶將的位置——最後只能留一組當將，其他要想辦法碰成刻子或拆掉。`,
    })
  }

  const isolatedClusters = clusters.filter(c => c.status === 'isolated')
  if (isolatedClusters.length >= 2) {
    const names = isolatedClusters.map(c => c.label).join('、')
    tensions.push({
      description: `${names} 都是落單的孤張，優先丟掉對牌型進度不會有影響。`,
    })
  }

  return tensions
}

export function analyzeHandBranches(hand: HandCounts): HandBranchAnalysis {
  const clusters: TileClusterAnalysis[] = []

  const suitBases: Array<{ base: TileKind; suit: 'man' | 'pin' | 'tiao' }> = [
    { base: 0, suit: 'man' },
    { base: SUIT_SIZE, suit: 'pin' },
    { base: SUIT_SIZE * 2, suit: 'tiao' },
  ]

  for (const { base, suit } of suitBases) {
    const slice = getSuitSlice(hand, suit).slice(0, SUIT_SIZE) as number[]
    const groups = groupConnectedIndices(slice)
    for (const group of groups) {
      clusters.push(analyzeNumberCluster(group, slice, base, hand))
    }
  }

  clusters.push(...analyzeHonors(hand))

  const tensions = detectTensions(clusters)

  return { clusters, tensions }
}
