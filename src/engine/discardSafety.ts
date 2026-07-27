import { kindToRank, kindToSuit } from './tiles'
import type { DiscardSafety, TileKind } from './types'

/**
 * 純統計花色風險評估：不模擬對手、沒有棄牌河資訊，只用「牌位」的通用經驗法則——
 * 老頭牌(1,9)與字牌相對安全，中張(4,5,6)風險最高，2,3,7,8 介於中間。
 * 這是台灣桌上常見的口語判斷，不是需要牌局資訊的「現物/筋」等日麻概念。
 */
export function assessDiscardSafety(kind: TileKind): DiscardSafety {
  if (kindToSuit(kind) === 'honor') return { level: 'safe', score: 2 }

  const rank = kindToRank(kind)
  if (rank === 1 || rank === 9) return { level: 'safe', score: 2 }
  if (rank === 4 || rank === 5 || rank === 6) return { level: 'dangerous', score: 0 }
  return { level: 'medium', score: 1 }
}
