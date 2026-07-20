import type { ClusterRouteAnalysis, ClusterRoute, HandRouteAnalysis } from '../engine/handRoutes'

export interface RouteDescription {
  title: string
  steps: string[]
  summary: string
}

export interface ClusterRouteDescription {
  clusterLabel: string
  routes: RouteDescription[]
  comparison: string | null
}

export interface HandRouteDescription {
  clusters: ClusterRouteDescription[]
  pairTension: string | null
}

function describeRoute(route: ClusterRoute, index: number, total: number): RouteDescription {
  const letter = String.fromCharCode(65 + index)
  const title = total > 1 ? `路線 ${letter}` : '拆法'

  const steps: string[] = []
  for (const group of route.groups) {
    steps.push(group.label)
  }

  const waitingGroups = route.groups.filter((g) => g.waiting.length > 0)
  const totalKinds = new Set(waitingGroups.flatMap((g) => g.waiting.map((w) => w.kind))).size
  const totalRemaining = waitingGroups.reduce(
    (sum, g) => sum + g.waiting.reduce((s, w) => s + w.remaining, 0),
    0,
  )

  let summary: string
  if (totalKinds === 0) {
    summary = '已經全部湊好，不需要再等牌。'
  } else {
    summary = `共等 ${totalKinds} 種 ${totalRemaining} 張`
  }

  return { title, steps, summary }
}

function compareRoutes(routes: ClusterRoute[]): string | null {
  if (routes.length < 2) return null

  const a = routes[0]
  const b = routes[1]
  const aWaiting = a.totalWaiting
  const bWaiting = b.totalWaiting

  if (aWaiting === bWaiting) {
    return '這幾條路線的等牌數差不多，可以根據場上已經打出的牌來決定走哪條。'
  }
  if (aWaiting > bWaiting) {
    return `路線 A 等牌比較寬（${aWaiting} 張 vs ${bWaiting} 張），但路線 B 可能有不同的發展方向。`
  }
  return `路線 B 等牌比較寬（${bWaiting} 張 vs ${aWaiting} 張），但路線 A 可能有不同的發展方向。`
}

function describeCluster(cluster: ClusterRouteAnalysis): ClusterRouteDescription {
  const routes = cluster.routes.map((r, i) => describeRoute(r, i, cluster.routes.length))
  const comparison = compareRoutes(cluster.routes)
  return { clusterLabel: cluster.clusterLabel, routes, comparison }
}

export function describeHandRoutes(analysis: HandRouteAnalysis): HandRouteDescription {
  const clusters = analysis.clusters
    .filter((c) => c.clusterTiles.length > 0)
    .map(describeCluster)

  let pairTension: string | null = null
  if (analysis.pairClusters.length >= 2) {
    pairTension = `${analysis.pairClusters.join('、')} 都有機會當將——最後只能留一組，其他要想辦法做成面子或拆掉。`
  }

  return { clusters, pairTension }
}
