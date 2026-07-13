import { readHandStructure, type HandShape, type Taatsu } from '../engine/handStructure'
import { computeShanten } from '../engine/shanten'
import { getTileGroupLabel, getTileLabel } from '../engine/tileLabels'
import type { DiscardEvaluation, HandCounts, TileKind } from '../engine/types'
import { formatUkeireList, shantenToText } from './explainDiscard'

const MAX_NAMED_TILES = 4

function formatTileLabels(kinds: TileKind[]): string {
  if (kinds.length <= MAX_NAMED_TILES) return kinds.map(getTileLabel).join('、')
  return `${kinds.slice(0, MAX_NAMED_TILES).map(getTileLabel).join('、')}等 ${kinds.length} 張`
}

function taatsuTypeName(kind: Taatsu['kind']): string {
  switch (kind) {
    case 'ryanmen':
      return '兩面'
    case 'kanchan':
      return '嵌張'
    case 'penchan':
      return '邊張'
    case 'pair':
      return '對子'
  }
}

function joinGroups(labels: string[]): string {
  if (labels.length <= MAX_NAMED_TILES) return labels.join('、')
  return `${labels.slice(0, MAX_NAMED_TILES).join('、')}等 ${labels.length} 組`
}

/** 描述手牌已成形的面子與搭子，讓玩家看到「已經組好的好牌型」而不只是要丟什麼 */
function describeStructure(shape: HandShape): string {
  const meldLabels = shape.melds.map((mld) => getTileGroupLabel(mld.tiles))
  // 將眼另外講，非將眼的搭子才列進「搭子」
  const nonEyeTaatsu = shape.taatsu.filter((t) => t !== shape.eye)
  const taatsuLabels = nonEyeTaatsu.map(
    (t) => `${getTileGroupLabel(t.tiles)}(${taatsuTypeName(t.kind)})`,
  )

  const parts: string[] = []
  if (meldLabels.length > 0) {
    parts.push(`已經組好 ${meldLabels.length} 組面子（${joinGroups(meldLabels)}）`)
  }
  if (taatsuLabels.length > 0) {
    const lead = meldLabels.length > 0 ? '另外還有' : '目前有'
    parts.push(`${lead} ${taatsuLabels.length} 組搭子在等牌（${joinGroups(taatsuLabels)}）`)
  }
  if (shape.eye) {
    parts.push(`其中 ${getTileGroupLabel(shape.eye.tiles)} 可以留著當將眼`)
  }

  if (parts.length === 0) {
    return '目前還沒有成形的面子或搭子，整手偏零散，先從留下相鄰、同花色的牌開始慢慢搭架子'
  }
  return parts.join('，')
}

/**
 * 找出「打了之後向聽數與進張都不會變差」的出牌選項——這些牌對牌型沒有貢獻，
 * 是最適合優先捨棄的孤張。回傳牌種供分析文字點名，也供 UI 在手牌上高亮。
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
 * 在玩家出牌之前，用向聽數/進張數據 + 牌型結構分析目前手牌，產生一段連貫的教學文字，
 * 依序涵蓋牌型效率與已成形結構、取捨優先順序、孤張取捨原則三層心法。
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
  // 用「最佳出牌後」的 16 張手牌來讀結構，等於在展示理想取捨後要往哪個方向組
  const shape = readHandStructure(best.resultingHand)

  // Layer 1：效率判斷 + 已成形結構
  let layer1: string
  if (currentShanten === 0) {
    layer1 = `這手牌已經聽牌了！只等 ${formatUkeireList(best.ukeire.tiles)}（共 ${bestTotal} 張）就能胡，現有的面子和搭子都已經到位。`
  } else {
    const progress =
      currentShanten === 1
        ? '再一步就能聽牌'
        : currentShanten === 2
          ? '再兩步左右就能聽牌'
          : '距離聽牌還有一段路'
    layer1 = `這手牌目前${shantenToText(currentShanten)}，${progress}。${describeStructure(shape)}。`
  }

  // Layer 2：取捨優先順序
  const tiedByShanten = evaluations.filter((e) => e.ukeire.shanten === bestShanten)
  let layer2: string
  if (tiedByShanten.length === 1) {
    if (evaluations.length > 1) {
      const runnerUp = evaluations[1]
      layer2 = `在能打的牌裡，只有打「${bestLabel}」能維持在${shantenToText(bestShanten)}；換打別張，向聽數就會退到${shantenToText(runnerUp.ukeire.shanten)}，所以這步很明確。`
    } else {
      layer2 = `這手牌目前只有「${bestLabel}」這張可以打，沒有其他取捨需要考慮。`
    }
  } else {
    const runnerUp = tiedByShanten[1]
    if (best.ukeire.totalRemaining > runnerUp.ukeire.totalRemaining) {
      layer2 = `能維持${shantenToText(bestShanten)}的打法不只一種，但打「${bestLabel}」的進張最寬（共 ${bestTotal} 張），比打「${getTileLabel(runnerUp.discard)}」（共 ${runnerUp.ukeire.totalRemaining} 張）更好——向聽相同時，進張越寬越有利。`
    } else {
      layer2 = `有好幾種打法都能維持${shantenToText(bestShanten)}、進張也一樣寬，這幾張是等價的選擇，看的是它們是不是真正沒效率的孤張。`
    }
  }

  // Layer 3：孤張取捨原則
  const isolated = suggestedDiscardKinds(evaluations)
  let layer3: string
  if (isolated.length <= 1) {
    layer3 = `現在最適合先捨的是「${bestLabel}」，它留著不會讓向聽或進張變好，是貢獻最小的孤張。`
  } else {
    layer3 = `「${formatTileLabels(isolated)}」都是可以先捨的孤張——打哪張牌型都不會變差，實際上打哪張再看安全或役種需求。`
  }

  return layer1 + layer2 + layer3
}
