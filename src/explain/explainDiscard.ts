import { getTileLabel } from '../engine/tileLabels'
import type { DiscardEvaluation, UkeireTile } from '../engine/types'

export interface DiscardExplanation {
  isOptimal: boolean
  headline: string
  detail: string
}

export function shantenToText(shanten: number): string {
  if (shanten === -1) return '已經胡牌'
  if (shanten === 0) return '已經聽牌'
  return `還差 ${shanten} 向聽`
}

/**
 * 把進張牌種列成文字。種類太多時（早期分散的手牌動輒十幾種）只列前 maxKinds 種，
 * 其餘用「…等 N 種」收尾，避免一長串念不完、也讓真正關鍵的少數進張凸顯出來。
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
      detail: `${chosenShantenText}，進張：${formatUkeireList(chosen.ukeire.tiles)}（共 ${chosen.ukeire.totalRemaining} 張）。`,
    }
  }

  const bestLabel = getTileLabel(best.discard)
  const bestShantenText = shantenToText(best.ukeire.shanten)
  const shantenDiff = chosen.ukeire.shanten - best.ukeire.shanten

  if (shantenDiff > 0) {
    return {
      isOptimal: false,
      headline: `打出「${chosenLabel}」會讓向聽數變差。`,
      detail: `打這張之後${chosenShantenText}；改打「${bestLabel}」可以維持在${bestShantenText}，進張：${formatUkeireList(best.ukeire.tiles)}（共 ${best.ukeire.totalRemaining} 張）。`,
    }
  }

  const remainingDiff = best.ukeire.totalRemaining - chosen.ukeire.totalRemaining
  return {
    isOptimal: false,
    headline: `打出「${chosenLabel}」不是最寬的選擇。`,
    detail: `${chosenShantenText}，進張：${formatUkeireList(chosen.ukeire.tiles)}（共 ${chosen.ukeire.totalRemaining} 張）；改打「${bestLabel}」向聽數相同，但進張多 ${remainingDiff} 張（共 ${best.ukeire.totalRemaining} 張），聽的範圍更廣。`,
  }
}
