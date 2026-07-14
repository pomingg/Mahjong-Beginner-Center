import { getTileLabel } from '../engine/tileLabels'
import type { DiscardEvaluation, UkeireTile } from '../engine/types'

export interface DiscardExplanation {
  isOptimal: boolean
  headline: string
  detail: string
}

/** 用「聽牌」當唯一的具體目標描述進度，不使用「向聽數」這類分析用語 */
export function shantenToText(shanten: number): string {
  if (shanten === -1) return '已經胡牌'
  if (shanten === 0) return '已經聽牌'
  return `還要換 ${shanten} 張牌才會聽牌`
}

/**
 * 把牌種列成文字。種類太多時（早期分散的手牌動輒十幾種）只列前 maxKinds 種，
 * 其餘用「…等 N 種」收尾，避免一長串念不完、也讓真正關鍵的少數牌凸顯出來。
 */
export function formatUkeireList(tiles: UkeireTile[], maxKinds = 6): string {
  if (tiles.length === 0) return '無'
  if (tiles.length <= maxKinds) {
    return tiles.map((t) => `${getTileLabel(t.kind)}(${t.remaining}張)`).join('、')
  }
  const shown = tiles
    .slice(0, maxKinds)
    .map((t) => `${getTileLabel(t.kind)}(${t.remaining}張)`)
    .join('、')
  return `${shown}…等 ${tiles.length} 種`
}

/** 用口語講「摸到這些牌會怎樣」，聽牌時是能胡的牌，還沒聽牌時是有幫助的牌 */
function usefulTilesSentence(tiles: UkeireTile[], shanten: number): string {
  const lead = shanten === 0 ? '能胡的牌是' : '接下來有幫助的牌是'
  return `${lead} ${formatUkeireList(tiles)}`
}

/**
 * 比較玩家的出牌選擇與系統算出的最佳解，產生中文回饋文字。
 * allEvaluations 必須是 evaluateAllDiscards 排序過的結果（最佳解在最前面）。
 */
export function explainDiscard(
  chosen: DiscardEvaluation,
  allEvaluations: DiscardEvaluation[],
): DiscardExplanation {
  const best = allEvaluations[0]
  const chosenLabel = getTileLabel(chosen.discard)
  const chosenShantenText = shantenToText(chosen.ukeire.shanten)

  const isOptimal =
    chosen.ukeire.shanten === best.ukeire.shanten &&
    chosen.ukeire.totalRemaining === best.ukeire.totalRemaining

  if (isOptimal) {
    return {
      isOptimal: true,
      headline: `打出「${chosenLabel}」就是最佳選擇！`,
      detail: `${chosenShantenText}。${usefulTilesSentence(chosen.ukeire.tiles, chosen.ukeire.shanten)}，一共 ${chosen.ukeire.totalRemaining} 張。`,
    }
  }

  const bestLabel = getTileLabel(best.discard)
  const bestShantenText = shantenToText(best.ukeire.shanten)
  const shantenDiff = chosen.ukeire.shanten - best.ukeire.shanten

  if (shantenDiff > 0) {
    return {
      isOptimal: false,
      headline: `打出「${chosenLabel}」會讓進度變差。`,
      detail: `打這張之後${chosenShantenText}；如果改打「${bestLabel}」，可以維持在${bestShantenText}，${usefulTilesSentence(best.ukeire.tiles, best.ukeire.shanten)}，一共 ${best.ukeire.totalRemaining} 張。`,
    }
  }

  const remainingDiff = best.ukeire.totalRemaining - chosen.ukeire.totalRemaining
  return {
    isOptimal: false,
    headline: `打出「${chosenLabel}」不是機會最寬的選擇。`,
    detail: `${chosenShantenText}，${usefulTilesSentence(chosen.ukeire.tiles, chosen.ukeire.shanten)}，共 ${chosen.ukeire.totalRemaining} 張；如果改打「${bestLabel}」，進度一樣，但能用的牌多 ${remainingDiff} 張（共 ${best.ukeire.totalRemaining} 張），機會比較寬。`,
  }
}
