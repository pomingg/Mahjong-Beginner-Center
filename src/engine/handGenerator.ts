import { CONCEALED_HAND_SIZE, MAX_COPIES_PER_KIND, TOTAL_KINDS } from './constants'
import {
  type HardDealOptions,
  type HardQuestionResult,
  type QuestionQualityResult,
  evaluateHardQuestion,
  pickRelevantDraw,
} from './questionFilter'
import { computeShanten } from './shanten'
import { createEmptyCounts } from './tiles'
import type { TileKind } from './types'

export interface DealResult {
  /** 起手 16 張手牌的計數 */
  hand: number[]
  /** 本局剩餘可摸的牌池（已洗混），依序摸牌 */
  wall: TileKind[]
}

function createFullWall(): TileKind[] {
  const wall: TileKind[] = []
  for (let kind = 0; kind < TOTAL_KINDS; kind += 1) {
    for (let copy = 0; copy < MAX_COPIES_PER_KIND; copy += 1) {
      wall.push(kind)
    }
  }
  return wall
}

function shuffle(tiles: TileKind[]): void {
  for (let i = tiles.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = tiles[i]
    tiles[i] = tiles[j]
    tiles[j] = tmp
  }
}

/** 隨機發一手合法起手牌：洗混整副 136 張牌，前 16 張當手牌，剩下的當牌池 */
export function dealNewRound(): DealResult {
  const wall = createFullWall()
  shuffle(wall)

  const handTiles = wall.splice(0, CONCEALED_HAND_SIZE)
  const hand = createEmptyCounts()
  for (const kind of handTiles) hand[kind] += 1

  return { hand, wall }
}

const MAX_GENERATION_ATTEMPTS = 500

/**
 * 產生一副向聽數恰好等於 targetShanten 的手牌。
 * 用 rejection sampling：隨機洗牌直到命中目標向聽數。
 * 隨機 16 張手牌的向聽數通常在 3~6，所以 target 2~5 都很快。
 */
export function dealAtShanten(targetShanten: number): DealResult {
  for (let i = 0; i < MAX_GENERATION_ATTEMPTS; i++) {
    const deal = dealNewRound()
    if (computeShanten(deal.hand) === targetShanten) return deal
  }
  return dealNewRound()
}

export interface HardDealResult extends DealResult {
  quality: QuestionQualityResult
  evaluations: HardQuestionResult['evaluations']
}

const HARD_MAX_ATTEMPTS = 1000

export function dealHardQuestion(options: HardDealOptions): HardDealResult {
  const { targetShanten, minScore = 6, maxAttempts = HARD_MAX_ATTEMPTS } = options

  let bestSoFar: HardDealResult | null = null

  for (let i = 0; i < maxAttempts; i++) {
    const deal = dealNewRound()
    if (computeShanten(deal.hand) !== targetShanten) continue

    const pick = pickRelevantDraw(deal.hand, deal.wall)
    if (pick && pick.wallIndex > 0) {
      const tmp = deal.wall[0]
      deal.wall[0] = deal.wall[pick.wallIndex]
      deal.wall[pick.wallIndex] = tmp
    }

    const drawnTile = deal.wall[0]
    const { evaluations, quality } = evaluateHardQuestion(deal.hand, drawnTile)

    if (quality.score >= minScore) {
      return { ...deal, quality, evaluations }
    }

    if (!bestSoFar || quality.score > bestSoFar.quality.score) {
      bestSoFar = { ...deal, quality, evaluations }
    }
  }

  if (bestSoFar) return bestSoFar

  const fallback = dealAtShanten(targetShanten)
  const drawnTile = fallback.wall[0]
  const { evaluations, quality } = evaluateHardQuestion(fallback.hand, drawnTile)
  return { ...fallback, quality, evaluations }
}
