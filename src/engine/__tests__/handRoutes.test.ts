import { describe, expect, it } from 'vitest'
import { analyzeHandRoutes } from '../handRoutes'
import type { ClusterRouteAnalysis } from '../handRoutes'
import { E, S, makeCounts, m, p, s } from './testHelpers'

function findCluster(clusters: ClusterRouteAnalysis[], label: string): ClusterRouteAnalysis {
  const found = clusters.find((c) => c.clusterLabel === label)
  if (!found) throw new Error(`Cluster "${label}" not found in: ${clusters.map(c => c.clusterLabel).join(', ')}`)
  return found
}

describe('analyzeHandRoutes', () => {
  it('使用者範例：2355667888萬 應產生多條路線', () => {
    const hand = makeCounts([
      m(2), m(3), m(5), m(5), m(6), m(6), m(7), m(8), m(8), m(8),
      p(1), p(2), p(3),
      s(1), s(1),
      E, S,
    ])
    const result = analyzeHandRoutes(hand)
    const manCluster = result.clusters.find((c) =>
      c.clusterTiles.includes(m(2)) && c.clusterTiles.includes(m(8)),
    )
    expect(manCluster).toBeDefined()
    expect(manCluster!.routes.length).toBeGreaterThanOrEqual(2)

    const routeLabels = manCluster!.routes.map((r) =>
      r.groups.filter((g) => g.kind === 'meld').map((g) => g.label),
    )
    const has567 = routeLabels.some((labels) => labels.some((l) => l.includes('567')))
    const has678 = routeLabels.some((labels) => labels.some((l) => l.includes('678')))
    expect(has567 || has678).toBe(true)
  })

  it('簡單順子 123萬 只有 1 條路線', () => {
    const hand = makeCounts([
      m(1), m(2), m(3),
      p(1), p(2), p(3),
      p(4), p(5), p(6),
      p(7), p(8), p(9),
      s(1), s(1),
      E, S, S,
    ])
    const result = analyzeHandRoutes(hand)
    const cluster = findCluster(result.clusters, '123萬')
    expect(cluster.routes).toHaveLength(1)
    expect(cluster.routes[0].melds).toBe(1)
    expect(cluster.routes[0].groups[0].kind).toBe('meld')
  })

  it('對子 55萬 有「當將」選項', () => {
    const hand = makeCounts([
      m(5), m(5),
      p(1), p(2), p(3),
      p(4), p(5), p(6),
      p(7), p(8), p(9),
      s(1), s(2), s(3),
      s(7), s(8), s(9),
    ])
    const result = analyzeHandRoutes(hand)
    const cluster = findCluster(result.clusters, '55萬')
    const hasPairRoute = cluster.routes.some((r) =>
      r.groups.some((g) => g.kind === 'pair'),
    )
    expect(hasPairRoute).toBe(true)
  })

  it('孤張 9萬 只有 floater', () => {
    const hand = makeCounts([
      m(9),
      p(1), p(2), p(3),
      p(4), p(5), p(6),
      p(7), p(8), p(9),
      s(1), s(2), s(3),
      s(7), s(8), s(9),
      E, E,
    ])
    const result = analyzeHandRoutes(hand)
    const cluster = findCluster(result.clusters, '9萬')
    expect(cluster.routes).toHaveLength(1)
    expect(cluster.routes[0].groups[0].kind).toBe('floater')
  })

  it('字牌刻子 東東東 是 1 條 meld 路線', () => {
    const hand = makeCounts([
      m(1), m(2), m(3),
      p(1), p(2), p(3),
      p(4), p(5), p(6),
      p(7), p(8), p(9),
      s(1), s(1),
      E, E, E,
    ])
    const result = analyzeHandRoutes(hand)
    const cluster = findCluster(result.clusters, '東東東')
    expect(cluster.routes).toHaveLength(1)
    expect(cluster.routes[0].melds).toBe(1)
  })

  it('12345萬 產生多條路線（123+45 vs 345+12）', () => {
    const hand = makeCounts([
      m(1), m(2), m(3), m(4), m(5),
      p(1), p(2), p(3),
      p(7), p(8), p(9),
      s(1), s(1),
      E, S, S, S,
    ])
    const result = analyzeHandRoutes(hand)
    const cluster = result.clusters.find((c) =>
      c.clusterTiles.includes(m(1)) && c.clusterTiles.includes(m(5)),
    )
    expect(cluster).toBeDefined()
    expect(cluster!.routes.length).toBeGreaterThanOrEqual(2)
  })

  it('pairClusters 列出所有含對子路線的 cluster label', () => {
    const hand = makeCounts([
      m(5), m(5),
      p(5), p(5),
      s(1), s(2), s(3), s(4), s(5), s(6), s(7), s(8), s(9),
      E, E, E, S,
    ])
    const result = analyzeHandRoutes(hand)
    expect(result.pairClusters).toContain('55萬')
    expect(result.pairClusters).toContain('55筒')
  })

  it('路線的 totalWaiting 正確計算', () => {
    const hand = makeCounts([
      m(4), m(5),
      p(1), p(2), p(3),
      p(4), p(5), p(6),
      p(7), p(8), p(9),
      s(1), s(2), s(3),
      s(7), s(8), s(9),
    ])
    const result = analyzeHandRoutes(hand)
    const cluster = findCluster(result.clusters, '45萬')
    expect(cluster.routes.length).toBeGreaterThan(0)
    const route = cluster.routes[0]
    expect(route.partials).toBe(1)
    expect(route.totalWaiting).toBeGreaterThan(0)
    const partial = route.groups.find((g) => g.kind === 'partial')
    expect(partial).toBeDefined()
    expect(partial!.waiting.length).toBeGreaterThan(0)
  })

  it('最多保留 3 條路線', () => {
    const hand = makeCounts([
      m(1), m(2), m(3), m(4), m(5), m(6), m(7), m(8), m(9),
      p(1), p(2), p(3),
      s(1), s(1),
      E, S, S,
    ])
    const result = analyzeHandRoutes(hand)
    for (const cluster of result.clusters) {
      expect(cluster.routes.length).toBeLessThanOrEqual(3)
    }
  })
})
