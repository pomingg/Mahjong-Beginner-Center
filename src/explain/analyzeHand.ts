import { analyzeHandBranches, type TileClusterAnalysis } from '../engine/handBranches'
import { computeShanten } from '../engine/shanten'
import { getTileLabel } from '../engine/tileLabels'
import type { DiscardEvaluation, HandCounts, TileKind } from '../engine/types'

const MAX_NAMED_TILES = 4

function formatTileLabels(kinds: TileKind[]): string {
  if (kinds.length <= MAX_NAMED_TILES) return kinds.map(getTileLabel).join('、')
  return `${kinds.slice(0, MAX_NAMED_TILES).map(getTileLabel).join('、')}等 ${kinds.length} 張`
}

export interface ClusterSummary {
  label: string
  status: 'complete' | 'developing' | 'isolated'
  branches: string[]
}

export interface HandAnalysis {
  progress: string
  clusters: ClusterSummary[]
  tensions: string[]
  suggestion: string
  recommendedDiscards: TileKind[]
}

function clusterToSummary(cluster: TileClusterAnalysis): ClusterSummary {
  return {
    label: cluster.label,
    status: cluster.status,
    branches: cluster.branches.map((b) => b.description),
  }
}

/**
 * 找出「丟了之後，聽牌進度跟能用的牌都不會變差」的出牌選項——這些牌留著沒有幫助，
 * 是最適合優先丟的孤張。回傳牌種供分析文字點名，也供 UI 在手牌上高亮。
 */
export function suggestedDiscardKinds(evaluations: DiscardEvaluation[]): TileKind[] {
  if (evaluations.length === 0) return []
  const best = evaluations[0]
  return evaluations
    .filter(
      (e) =>
        e.ukeire.shanten === best.ukeire.shanten &&
        e.ukeire.totalRemaining === best.ukeire.totalRemaining,
    )
    .map((e) => e.discard)
}

/**
 * 在玩家出牌之前分析目前手牌，產生結構化的教學分析：
 * - progress：目前的聽牌進度
 * - clusters：每一群牌的發展可能性
 * - tensions：跨牌群之間的衝突（例如對子太多搶將）
 * - suggestion：最終的出牌建議
 *
 * 全程用「聽牌」當唯一的具體目標，不使用「向聽數」「進張」這類分析用語。
 * evaluations 必須是 evaluateAllDiscards 排序過的結果（最佳解在最前面）。
 */
export function analyzeHandBeforeDiscard(
  hand: HandCounts,
  evaluations: DiscardEvaluation[],
): HandAnalysis {
  const currentShanten = computeShanten(hand)
  if (currentShanten === -1) {
    return {
      progress: '這副牌已經是可以胡的牌型了，不需要再煩惱怎麼取捨。',
      clusters: [],
      tensions: [],
      suggestion: '',
      recommendedDiscards: [],
    }
  }
  if (evaluations.length === 0) {
    return { progress: '', clusters: [], tensions: [], suggestion: '', recommendedDiscards: [] }
  }

  const best = evaluations[0]
  const bestShanten = best.ukeire.shanten
  const bestTotal = best.ukeire.totalRemaining
  const bestLabel = getTileLabel(best.discard)

  let progress: string
  if (currentShanten === 0) {
    const waitNames = best.ukeire.tiles.map((t) => getTileLabel(t.kind)).join('、')
    const waitTotal = best.ukeire.tiles.reduce((s, t) => s + t.remaining, 0)
    progress = `已經聽牌了！等 ${waitNames}，還有 ${waitTotal} 張機會，摸到就能胡。`
  } else {
    progress = `大概還要換 ${currentShanten} 張牌才會聽牌。`
  }

  const branchAnalysis = analyzeHandBranches(hand)
  const clusters = branchAnalysis.clusters.map(clusterToSummary)
  const tensions = branchAnalysis.tensions.map((t) => t.description)

  const tiedByShanten = evaluations.filter((e) => e.ukeire.shanten === bestShanten)
  const equivalentByNumbers = suggestedDiscardKinds(evaluations)

  const trulyIsolated = equivalentByNumbers.filter((kind) => {
    const cluster = branchAnalysis.clusters.find((c) => c.tiles.includes(kind))
    return cluster && cluster.status === 'isolated'
  })

  const recommendedDiscards = trulyIsolated.length > 0 ? trulyIsolated : equivalentByNumbers
  let suggestion: string

  if (tiedByShanten.length === 1) {
    if (evaluations.length > 1) {
      suggestion = `只有丟「${bestLabel}」能保住現在的進度，丟別張都會離聽牌更遠。`
    } else {
      suggestion = `只有「${bestLabel}」這張可以丟。`
    }
  } else if (equivalentByNumbers.length <= 1) {
    suggestion = `建議先丟「${bestLabel}」，丟了不影響聽牌進度和機會。`
  } else {
    const runnerUp = tiedByShanten[1]
    if (best.ukeire.totalRemaining > runnerUp.ukeire.totalRemaining) {
      suggestion = `丟「${bestLabel}」或「${getTileLabel(runnerUp.discard)}」都可以，但丟「${bestLabel}」留下的機會比較寬（${bestTotal} 張 vs ${runnerUp.ukeire.totalRemaining} 張）。`
    } else if (trulyIsolated.length > 0 && trulyIsolated.length < equivalentByNumbers.length) {
      suggestion = `「${formatTileLabels(trulyIsolated)}」跟周圍的牌完全沒有關聯，是真正的孤張，優先丟掉不會犧牲任何發展機會。`
    } else {
      suggestion = `「${formatTileLabels(recommendedDiscards)}」丟哪張都一樣，不影響進度，看安全或台數需求決定。`
    }
  }

  return { progress, clusters, tensions, suggestion, recommendedDiscards }
}
