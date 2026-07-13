import { computeShanten } from '../engine/shanten'
import { getTileLabel } from '../engine/tileLabels'
import type { DiscardEvaluation, HandCounts, TileKind } from '../engine/types'
import { formatUkeireList, shantenToText } from './explainDiscard'

const MAX_NAMED_TILES = 4

function formatTileLabels(kinds: TileKind[]): string {
  if (kinds.length <= MAX_NAMED_TILES) return kinds.map(getTileLabel).join('、')
  return `${kinds.slice(0, MAX_NAMED_TILES).map(getTileLabel).join('、')}等 ${kinds.length} 張`
}

function widthPhrase(total: number): string {
  if (total <= 0) return '幾乎沒有進張'
  if (total >= 8) return '選擇面相當寬'
  if (total >= 4) return '選擇面普通'
  return '選擇面偏窄'
}

/**
 * 在玩家出牌之前，用向聽數/進張數據分析目前手牌，產生一段連貫的教學文字，
 * 依序涵蓋牌型效率判斷、取捨優先順序、孤張取捨原則三層心法。
 * evaluations 必須是 evaluateAllDiscards 排序過的結果（最佳解在最前面）。
 */
export function analyzeHandBeforeDiscard(
  hand: HandCounts,
  evaluations: DiscardEvaluation[],
): string {
  const currentShanten = computeShanten(hand)
  if (currentShanten === -1) {
    return '這副牌已經是可以胡的牌型了，不需要再煩惱怎麼取捨。'
  }
  if (evaluations.length === 0) return ''

  const best = evaluations[0]
  const bestShanten = best.ukeire.shanten
  const bestTotal = best.ukeire.totalRemaining
  const bestLabel = getTileLabel(best.discard)
  const shantenPhrase = shantenToText(currentShanten)

  // Layer 1：牌型效率判斷
  let layer1: string
  if (currentShanten === 0) {
    layer1 = `這手牌目前${shantenPhrase}，等的是${formatUkeireList(best.ukeire.tiles)}（共 ${bestTotal} 張），${widthPhrase(bestTotal)}，代表現有的面子和搭子已經組得差不多了。`
  } else {
    const structureClause =
      currentShanten === 1
        ? '代表大部分的面子已經成型，只差最後一步就能聽牌'
        : currentShanten === 2
          ? '代表核心的面子架構已經有雛形，還需要兩步左右才能聽牌'
          : '代表手牌整體還比較分散，需要好幾步才能把架子搭起來'
    layer1 = `這手牌目前${shantenPhrase}，${structureClause}；照目前最好的方向前進，進張${widthPhrase(bestTotal)}（共 ${bestTotal} 張）。`
  }

  // Layer 2：取捨優先順序
  const tiedByShanten = evaluations.filter((e) => e.ukeire.shanten === bestShanten)
  let layer2: string
  if (tiedByShanten.length === 1) {
    if (evaluations.length > 1) {
      const runnerUp = evaluations[1]
      layer2 = `在能打的牌裡面，只有打出「${bestLabel}」能維持在${shantenToText(bestShanten)}；換打別張，向聽數就會退到${shantenToText(runnerUp.ukeire.shanten)}，所以這一步選擇很明確。`
    } else {
      layer2 = `這手牌目前只有「${bestLabel}」這張可以打，沒有其他取捨需要考慮。`
    }
  } else {
    const runnerUp = tiedByShanten[1]
    if (best.ukeire.totalRemaining > runnerUp.ukeire.totalRemaining) {
      const extraNote =
        tiedByShanten.length > 2
          ? `（另外還有 ${tiedByShanten.length - 2} 種打法向聽數相同，但進張都比「${bestLabel}」窄）`
          : ''
      layer2 = `能維持${shantenToText(bestShanten)}的打法不只一種：打出「${bestLabel}」可以進${formatUkeireList(best.ukeire.tiles)}（共 ${bestTotal} 張），打出「${getTileLabel(runnerUp.discard)}」則只能進${formatUkeireList(runnerUp.ukeire.tiles)}（共 ${runnerUp.ukeire.totalRemaining} 張）；兩者向聽數相同，但前者的進張面更寬，應該優先選前者。${extraNote}`
    } else {
      layer2 = `能維持${shantenToText(bestShanten)}又保有同樣寬進張（共 ${bestTotal} 張）的打法不只一種，這幾張彼此是等價的選擇，差別在於它們是不是手上真正沒有效率的孤張。`
    }
  }

  // Layer 3：孤張取捨原則
  const isolatedCandidates = evaluations.filter(
    (e) => e.ukeire.shanten === bestShanten && e.ukeire.totalRemaining === bestTotal,
  )
  let layer3: string
  if (isolatedCandidates.length === 1) {
    layer3 = `「${bestLabel}」現在留不留在手上，都不會讓向聽數或進張變得更好，是目前對牌型貢獻最小的一張，也就是最適合優先捨棄的孤張。`
  } else {
    const labels = formatTileLabels(isolatedCandidates.map((e) => e.discard))
    layer3 = `「${labels}」這幾張現在留著都對向聽數、進張沒有加分——不管打哪一張，牌型都不會變差，代表它們是目前手牌裡最沒有效率的孤張，可以優先考慮捨棄，實際打哪一張再依安全或役種需求決定。`
  }

  return layer1 + layer2 + layer3
}
