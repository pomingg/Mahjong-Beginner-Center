/** 牌種索引 0-33，參見 constants.ts 的花色邊界說明 */
export type TileKind = number

/** 手牌以「每種牌有幾張」表示，長度固定為 34 */
export type HandCounts = readonly number[]

export type Suit = 'man' | 'pin' | 'tiao' | 'honor'

export interface ShantenResult {
  /** -1 表示已經是完整胡牌 */
  shanten: number
}

export interface UkeireTile {
  kind: TileKind
  /** 這張牌在牌牆／其他地方還剩幾張（不含手牌中已有的） */
  remaining: number
}

export interface UkeireResult {
  shanten: number
  tiles: UkeireTile[]
  totalRemaining: number
}

export interface DiscardEvaluation {
  discard: TileKind
  resultingHand: HandCounts
  ukeire: UkeireResult
}

export type RoundStatus = 'playing' | 'won' | 'drawn'

export interface TurnRecord {
  turnIndex: number
  handBeforeDiscard: HandCounts
  drawnTile: TileKind
  discard: TileKind
  evaluations: DiscardEvaluation[]
  /** 向聽與進張都與最佳解一致（最理想的一手） */
  wasOptimal: boolean
  /** 至少維持住最佳向聽數（沒有讓牌型退步），即使進張略窄也算合格 */
  keptShanten: boolean
}

export interface RoundState {
  status: RoundStatus
  /** 目前手牌張數；平時 16 張，摸牌後 17 張等待出牌 */
  hand: HandCounts
  wall: readonly TileKind[]
  drawnTile: TileKind | null
  turnIndex: number
  history: TurnRecord[]
}
