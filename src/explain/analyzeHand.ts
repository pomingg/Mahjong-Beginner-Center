import { readHandStructure, type HandShape } from '../engine/handStructure'
import { computeShanten } from '../engine/shanten'
import { getTileGroupLabel, getTileLabel } from '../engine/tileLabels'
import type { DiscardEvaluation, HandCounts, TileKind, UkeireTile } from '../engine/types'

const MAX_NAMED_TILES = 4

function formatTileLabels(kinds: TileKind[]): string {
  if (kinds.length <= MAX_NAMED_TILES) return kinds.map(getTileLabel).join('、')
  return `${kinds.slice(0, MAX_NAMED_TILES).map(getTileLabel).join('、')}等 ${kinds.length} 張`
}

function joinGroups(labels: string[]): string {
  if (labels.length <= MAX_NAMED_TILES) return labels.join('、')
  return `${labels.slice(0, MAX_NAMED_TILES).join('、')}等 ${labels.length} 組`
}

/** 把一組進張牌種講成口語的「摸到哪些牌」，種類太多時只列前幾種 */
function speakTiles(tiles: UkeireTile[]): string {
  if (tiles.length === 0) return '沒有'
  const kinds = tiles.map((t) => t.kind)
  const names = formatTileLabels(kinds)
  const totalRemaining = tiles.reduce((sum, t) => sum + t.remaining, 0)
  return `${names}，一共還有 ${totalRemaining} 張`
}

/**
 * 描述手牌已經湊起來的部分，讓玩家先看到「哪些牌已經留得住」，
 * 不用日麻式的兩面/嵌張/邊張分類，只講具體的牌組成，貼近台灣桌上的講法。
 */
function describeStructure(shape: HandShape): string {
  const meldLabels = shape.melds.map((mld) => getTileGroupLabel(mld.tiles))
  const nonEyeTaatsu = shape.taatsu.filter((t) => t !== shape.eye)
  const taatsuLabels = nonEyeTaatsu.map((t) => getTileGroupLabel(t.tiles))

  const parts: string[] = []
  if (meldLabels.length > 0) {
    parts.push(`${joinGroups(meldLabels)} 已經湊好了`)
  }
  if (taatsuLabels.length > 0) {
    parts.push(`${joinGroups(taatsuLabels)} 也快湊成一組`)
  }
  if (shape.eye) {
    parts.push(`${getTileGroupLabel(shape.eye.tiles)} 這對可以留著當最後那一對`)
  }

  if (parts.length === 0) {
    return '手上的牌大多還兜不起來，先留住相鄰、同花色的牌，比較容易慢慢湊出一組。'
  }
  return `${parts.join('，')}。`
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
 * 在玩家出牌之前分析目前手牌，產生一段連貫、口語的教學文字：先講手上已經湊起來
 * 的牌，再講留哪張、丟哪張才能讓你更接近聽牌／胡牌，全程用「聽牌」當唯一的具體
 * 目標，不使用「向聽數」「進張」這類分析用語，也不使用兩面/嵌張/邊張等日麻式分類。
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

  // 第一段：現在的進度 + 手上已經湊起來的牌
  let opening: string
  if (currentShanten === 0) {
    opening = `這手牌已經聽牌了！現在等 ${speakTiles(best.ukeire.tiles)}，摸到其中一張就能胡。`
  } else {
    opening = `這手牌大概還要換 ${currentShanten} 張牌才會聽牌。${describeStructure(shape)}`
  }

  // 第二段：留哪張、丟哪張比較好，以及為什麼
  const tiedByShanten = evaluations.filter((e) => e.ukeire.shanten === bestShanten)
  let advice: string
  if (tiedByShanten.length === 1) {
    if (evaluations.length > 1) {
      advice = `這一步選擇很明確：只有丟「${bestLabel}」還能保住現在的進度，換丟別張都會離聽牌更遠。`
    } else {
      advice = `這手牌現在只有「${bestLabel}」這張可以丟，沒有其他選擇需要考慮。`
    }
  } else {
    const runnerUp = tiedByShanten[1]
    if (best.ukeire.totalRemaining > runnerUp.ukeire.totalRemaining) {
      advice = `丟「${bestLabel}」或丟「${getTileLabel(runnerUp.discard)}」都能保住現在的進度，但丟「${bestLabel}」之後能用的牌比較多（${bestTotal} 張，另一個只有 ${runnerUp.ukeire.totalRemaining} 張）——選機會比較寬的那個，比較不會卡住。`
    } else {
      advice = `有好幾張牌丟了都一樣，不會讓進度變差、機會也不會變窄，差別只在於它們是不是真正沒用的孤張。`
    }
  }

  // 第三段：孤張取捨原則
  const isolated = suggestedDiscardKinds(evaluations)
  let cutAdvice: string
  if (isolated.length <= 1) {
    cutAdvice = `現在最適合先丟的是「${bestLabel}」，丟了它不會讓聽牌進度或機會變差，是這手牌裡最沒用的孤張。`
  } else {
    cutAdvice = `「${formatTileLabels(isolated)}」這幾張現在丟哪張都一樣，都是這手牌裡沒用的孤張，可以優先考慮丟掉，實際丟哪張再看安全或台數需求。`
  }

  return `${opening}${advice}${cutAdvice}`
}
