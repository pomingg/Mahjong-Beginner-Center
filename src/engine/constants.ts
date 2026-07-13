/** 花色數量邊界：0-8 萬, 9-17 筒, 18-26 條, 27-33 字牌（東南西北中發白） */
export const SUIT_SIZE = 9
export const NUM_SUITS = 3
export const HONOR_START = 27
export const HONOR_COUNT = 7
export const TOTAL_KINDS = HONOR_START + HONOR_COUNT

/** 每種牌最多 4 張 */
export const MAX_COPIES_PER_KIND = 4

/** 台灣麻將：完整胡牌 = 5 組面子 + 1 對子 = 17 張（16 張手牌 + 1 張摸牌） */
export const NEEDED_MELDS = 5
export const CONCEALED_HAND_SIZE = 16
export const DRAWN_HAND_SIZE = CONCEALED_HAND_SIZE + 1

/** 牌牆：34 種 x 4 張 = 136 張（花牌已排除，視為已被替換） */
export const WALL_TOTAL_TILES = TOTAL_KINDS * MAX_COPIES_PER_KIND

/**
 * 單局最多摸牌次數。真實 4 人台灣麻將中單一玩家實際摸牌次數約落在 15-18 次，
 * 用這個常數讓一輪練習的節奏貼近真實牌局手感；到達上限仍未自摸則流局。
 */
export const ROUND_MAX_DRAWS = 17
