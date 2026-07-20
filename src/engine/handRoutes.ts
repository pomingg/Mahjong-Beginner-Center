import { MAX_COPIES_PER_KIND, HONOR_START, SUIT_SIZE } from './constants'
import { groupConnectedIndices } from './handBranches'
import { getTileGroupLabel, getTileLabel } from './tileLabels'
import { getSuitSlice } from './tiles'
import type { HandCounts, TileKind } from './types'

const MAX_ROUTES_PER_CLUSTER = 3

export interface WaitingTile {
  kind: TileKind
  remaining: number
}

export interface RouteGroup {
  kind: 'meld' | 'partial' | 'pair' | 'floater'
  tiles: TileKind[]
  waiting: WaitingTile[]
  label: string
}

export interface ClusterRoute {
  groups: RouteGroup[]
  melds: number
  partials: number
  hasPair: boolean
  totalWaiting: number
}

export interface ClusterRouteAnalysis {
  clusterTiles: TileKind[]
  clusterLabel: string
  routes: ClusterRoute[]
}

export interface HandRouteAnalysis {
  clusters: ClusterRouteAnalysis[]
  pairClusters: string[]
}

function remaining(hand: HandCounts, kind: TileKind): number {
  return MAX_COPIES_PER_KIND - hand[kind]
}

function computePartialWaiting(tiles: TileKind[], base: TileKind, hand: HandCounts): WaitingTile[] {
  const waits: WaitingTile[] = []
  if (tiles.length === 2) {
    const r0 = tiles[0] - base
    const r1 = tiles[1] - base
    const gap = r1 - r0
    if (gap === 1) {
      if (r0 > 0) {
        const wk = tiles[0] - 1
        const rem = remaining(hand, wk)
        if (rem > 0) waits.push({ kind: wk, remaining: rem })
      }
      if (r1 < 8) {
        const wk = tiles[1] + 1
        const rem = remaining(hand, wk)
        if (rem > 0) waits.push({ kind: wk, remaining: rem })
      }
    } else if (gap === 2) {
      const mid = tiles[0] + 1
      const rem = remaining(hand, mid)
      if (rem > 0) waits.push({ kind: mid, remaining: rem })
    }
  }
  return waits
}

function computePairWaiting(kind: TileKind, hand: HandCounts): WaitingTile[] {
  const rem = remaining(hand, kind)
  if (rem > 0) return [{ kind, remaining: rem }]
  return []
}

function makeGroupLabel(group: RouteGroup): string {
  const tileLabel = getTileGroupLabel(group.tiles)
  switch (group.kind) {
    case 'meld':
      if (group.tiles.length === 3 && group.tiles[0] === group.tiles[1]) {
        return `${tileLabel} 刻子`
      }
      return `${tileLabel} 順子`
    case 'partial': {
      if (group.waiting.length === 0) return `${tileLabel} 搭子`
      const waitNames = group.waiting.map((w) => getTileLabel(w.kind)).join(' 或 ')
      const total = group.waiting.reduce((s, w) => s + w.remaining, 0)
      return `${tileLabel} 等 ${waitNames}（${total} 張）`
    }
    case 'pair':
      return `${tileLabel} 當將`
    case 'floater':
      return `${tileLabel} 浮牌`
  }
}

interface RawRoute {
  groups: Omit<RouteGroup, 'label'>[]
  melds: number
  partials: number
  hasPair: boolean
}

function routeDominates(a: RawRoute, b: RawRoute): boolean {
  const aScore = a.melds * 2 + a.partials
  const bScore = b.melds * 2 + b.partials
  const aFloaters = a.groups.filter((g) => g.kind === 'floater').length
  const bFloaters = b.groups.filter((g) => g.kind === 'floater').length
  const aPair = a.hasPair ? 1 : 0
  const bPair = b.hasPair ? 1 : 0
  const ge = aScore >= bScore && a.melds >= b.melds && aFloaters <= bFloaters && aPair >= bPair
  const strict = aScore > bScore || a.melds > b.melds || aFloaters < bFloaters || aPair > bPair
  return ge && strict
}

function routeSignature(route: RawRoute): string {
  return route.groups
    .map((g) => `${g.kind}:${g.tiles.slice().sort((a, b) => a - b).join(',')}`)
    .sort()
    .join('|')
}

function enumerateRoutes(
  counts: number[],
  base: TileKind,
  hand: HandCounts,
  index: number = 0,
): RawRoute[] {
  if (index >= counts.length) return [{ groups: [], melds: 0, partials: 0, hasPair: false }]
  if (counts[index] === 0) return enumerateRoutes(counts, base, hand, index + 1)

  const kind = base + index
  const candidates: RawRoute[] = []

  if (counts[index] >= 3) {
    const next = counts.slice()
    next[index] -= 3
    const subs = enumerateRoutes(next, base, hand, index)
    for (const sub of subs) {
      candidates.push({
        groups: [{ kind: 'meld', tiles: [kind, kind, kind], waiting: [] }, ...sub.groups],
        melds: sub.melds + 1,
        partials: sub.partials,
        hasPair: sub.hasPair,
      })
    }
  }

  if (index + 2 < counts.length && counts[index] >= 1 && counts[index + 1] >= 1 && counts[index + 2] >= 1) {
    const next = counts.slice()
    next[index] -= 1
    next[index + 1] -= 1
    next[index + 2] -= 1
    const subs = enumerateRoutes(next, base, hand, index)
    for (const sub of subs) {
      candidates.push({
        groups: [{ kind: 'meld', tiles: [kind, kind + 1, kind + 2], waiting: [] }, ...sub.groups],
        melds: sub.melds + 1,
        partials: sub.partials,
        hasPair: sub.hasPair,
      })
    }
  }

  if (counts[index] >= 2) {
    const next = counts.slice()
    next[index] -= 2

    const subsPartial = enumerateRoutes(next, base, hand, index)
    for (const sub of subsPartial) {
      const waiting = computePairWaiting(kind, hand)
      candidates.push({
        groups: [{ kind: 'partial', tiles: [kind, kind], waiting }, ...sub.groups],
        melds: sub.melds,
        partials: sub.partials + 1,
        hasPair: sub.hasPair,
      })
    }

    const subsPair = enumerateRoutes(next, base, hand, index)
    for (const sub of subsPair) {
      if (!sub.hasPair) {
        candidates.push({
          groups: [{ kind: 'pair', tiles: [kind, kind], waiting: [] }, ...sub.groups],
          melds: sub.melds,
          partials: sub.partials,
          hasPair: true,
        })
      }
    }
  }

  if (index + 1 < counts.length && counts[index] >= 1 && counts[index + 1] >= 1) {
    const next = counts.slice()
    next[index] -= 1
    next[index + 1] -= 1
    const subs = enumerateRoutes(next, base, hand, index)
    for (const sub of subs) {
      const tiles: TileKind[] = [kind, kind + 1]
      const waiting = computePartialWaiting(tiles, base, hand)
      candidates.push({
        groups: [{ kind: 'partial', tiles, waiting }, ...sub.groups],
        melds: sub.melds,
        partials: sub.partials + 1,
        hasPair: sub.hasPair,
      })
    }
  }

  if (index + 2 < counts.length && counts[index] >= 1 && counts[index + 2] >= 1) {
    const next = counts.slice()
    next[index] -= 1
    next[index + 2] -= 1
    const subs = enumerateRoutes(next, base, hand, index)
    for (const sub of subs) {
      const tiles: TileKind[] = [kind, kind + 2]
      const waiting = computePartialWaiting(tiles, base, hand)
      candidates.push({
        groups: [{ kind: 'partial', tiles, waiting }, ...sub.groups],
        melds: sub.melds,
        partials: sub.partials + 1,
        hasPair: sub.hasPair,
      })
    }
  }

  {
    const next = counts.slice()
    next[index] -= 1
    const subs = enumerateRoutes(next, base, hand, index)
    for (const sub of subs) {
      candidates.push({
        groups: [{ kind: 'floater', tiles: [kind], waiting: [] }, ...sub.groups],
        melds: sub.melds,
        partials: sub.partials,
        hasPair: sub.hasPair,
      })
    }
  }

  const seen = new Set<string>()
  const unique: RawRoute[] = []
  for (const c of candidates) {
    const sig = routeSignature(c)
    if (!seen.has(sig)) {
      seen.add(sig)
      unique.push(c)
    }
  }

  return unique.filter((a) => !unique.some((b) => b !== a && routeDominates(b, a)))
}

function rawToClusterRoute(raw: RawRoute): ClusterRoute {
  const groups: RouteGroup[] = raw.groups.map((g) => {
    const full: RouteGroup = { ...g, label: '' }
    full.label = makeGroupLabel(full)
    return full
  })
  const totalWaiting = groups.reduce(
    (sum, g) => sum + g.waiting.reduce((s, w) => s + w.remaining, 0),
    0,
  )
  return { groups, melds: raw.melds, partials: raw.partials, hasPair: raw.hasPair, totalWaiting }
}

function analyzeNumberClusterRoutes(
  indices: number[],
  counts: number[],
  base: TileKind,
  hand: HandCounts,
): ClusterRouteAnalysis {
  const clusterTiles: TileKind[] = []
  for (const idx of indices) {
    for (let c = 0; c < counts[idx]; c++) clusterTiles.push(base + idx)
  }
  const clusterLabel = getTileGroupLabel(clusterTiles)

  const clusterCounts = new Array(9).fill(0) as number[]
  for (const idx of indices) clusterCounts[idx] = counts[idx]

  const rawRoutes = enumerateRoutes(clusterCounts, base, hand)
  const routes = rawRoutes
    .map(rawToClusterRoute)
    .sort((a, b) => {
      if (a.melds !== b.melds) return b.melds - a.melds
      if (a.totalWaiting !== b.totalWaiting) return b.totalWaiting - a.totalWaiting
      return b.partials - a.partials
    })
    .slice(0, MAX_ROUTES_PER_CLUSTER)

  return { clusterTiles, clusterLabel, routes }
}

function analyzeHonorClusterRoutes(kind: TileKind, count: number, hand: HandCounts): ClusterRouteAnalysis {
  const clusterTiles = Array.from({ length: count }, () => kind)
  const clusterLabel = getTileGroupLabel(clusterTiles)
  const routes: ClusterRoute[] = []

  if (count >= 3) {
    const meldGroup: RouteGroup = {
      kind: 'meld',
      tiles: [kind, kind, kind],
      waiting: [],
      label: '',
    }
    meldGroup.label = makeGroupLabel(meldGroup)
    const groups: RouteGroup[] = [meldGroup]
    if (count === 4) {
      const floaterGroup: RouteGroup = {
        kind: 'floater',
        tiles: [kind],
        waiting: [],
        label: '',
      }
      floaterGroup.label = makeGroupLabel(floaterGroup)
      groups.push(floaterGroup)
    }
    routes.push({ groups, melds: 1, partials: 0, hasPair: false, totalWaiting: 0 })
  } else if (count === 2) {
    const pairGroup: RouteGroup = {
      kind: 'pair',
      tiles: [kind, kind],
      waiting: [],
      label: '',
    }
    pairGroup.label = makeGroupLabel(pairGroup)
    routes.push({ groups: [pairGroup], melds: 0, partials: 0, hasPair: true, totalWaiting: 0 })

    const partialWaiting = computePairWaiting(kind, hand)
    const partialGroup: RouteGroup = {
      kind: 'partial',
      tiles: [kind, kind],
      waiting: partialWaiting,
      label: '',
    }
    partialGroup.label = makeGroupLabel(partialGroup)
    const totalW = partialWaiting.reduce((s, w) => s + w.remaining, 0)
    routes.push({ groups: [partialGroup], melds: 0, partials: 1, hasPair: false, totalWaiting: totalW })
  } else if (count === 1) {
    const floaterGroup: RouteGroup = {
      kind: 'floater',
      tiles: [kind],
      waiting: [],
      label: '',
    }
    floaterGroup.label = makeGroupLabel(floaterGroup)
    routes.push({ groups: [floaterGroup], melds: 0, partials: 0, hasPair: false, totalWaiting: 0 })
  }

  return { clusterTiles, clusterLabel, routes }
}

export function analyzeHandRoutes(hand: HandCounts): HandRouteAnalysis {
  const clusters: ClusterRouteAnalysis[] = []

  const suitBases: Array<{ base: TileKind; suit: 'man' | 'pin' | 'tiao' }> = [
    { base: 0, suit: 'man' },
    { base: SUIT_SIZE, suit: 'pin' },
    { base: SUIT_SIZE * 2, suit: 'tiao' },
  ]

  for (const { base, suit } of suitBases) {
    const slice = getSuitSlice(hand, suit).slice(0, SUIT_SIZE) as number[]
    const groups = groupConnectedIndices(slice)
    for (const group of groups) {
      clusters.push(analyzeNumberClusterRoutes(group, slice, base, hand))
    }
  }

  for (let i = 0; i < 7; i++) {
    const kind = HONOR_START + i
    const count = hand[kind]
    if (count === 0) continue
    clusters.push(analyzeHonorClusterRoutes(kind, count, hand))
  }

  const pairClusters = clusters
    .filter((c) => c.routes.some((r) => r.hasPair))
    .map((c) => c.clusterLabel)

  return { clusters, pairClusters }
}
