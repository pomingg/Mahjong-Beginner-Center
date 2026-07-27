import { describe, expect, it } from 'vitest'
import { SUIT_SIZE } from '../constants'
import { evaluateAllDiscards } from '../discardEvaluator'
import { createEmptyCounts } from '../tiles'
import {
  assessQuestionQuality,
  countCompetitiveDiscards,
  countFloaters,
  isRelevantDraw,
  ukeireSpread,
} from '../questionFilter'

function m(rank: number) {
  return rank - 1
}
function p(rank: number) {
  return SUIT_SIZE + rank - 1
}
function t(rank: number) {
  return SUIT_SIZE * 2 + rank - 1
}
const EAST = 27

function buildHand(tiles: number[]): number[] {
  const hand = createEmptyCounts()
  for (const kind of tiles) hand[kind] += 1
  return hand
}

describe('countFloaters', () => {
  it('returns 0 for a hand where all tiles are in groups', () => {
    // 123m 456m 789m 123p 456p 77t (17 tiles, fully structured)
    const hand = buildHand([
      m(1), m(2), m(3), m(4), m(5), m(6), m(7), m(8), m(9),
      p(1), p(2), p(3), p(4), p(5), p(6),
      t(7), t(7),
    ])
    expect(countFloaters(hand)).toBe(0)
  })

  it('counts isolated tiles correctly', () => {
    // 12m 45p 東 — scattered hand with many floaters
    const hand = buildHand([
      m(1), m(2), m(5), m(9),
      p(1), p(4), p(5), p(9),
      t(1), t(3), t(5), t(7), t(9),
      EAST, EAST + 1, EAST + 2, EAST + 3,
    ])
    expect(countFloaters(hand)).toBeGreaterThanOrEqual(4)
  })
})

describe('countCompetitiveDiscards', () => {
  it('returns count of discards sharing best shanten', () => {
    // A structured hand at shanten 1 should have multiple same-shanten discards
    const hand = buildHand([
      m(1), m(2), m(3), m(4), m(5), m(6), m(7), m(8), m(9),
      p(1), p(2), p(3), p(5), p(6),
      t(7), t(7), t(7),
    ])
    const evals = evaluateAllDiscards(hand)
    const competitive = countCompetitiveDiscards(evals)
    expect(competitive).toBeGreaterThanOrEqual(2)
  })

  it('returns 0 for empty evaluations', () => {
    expect(countCompetitiveDiscards([])).toBe(0)
  })
})

describe('ukeireSpread', () => {
  it('returns difference between best and worst same-shanten ukeire', () => {
    const hand = buildHand([
      m(1), m(2), m(3), m(4), m(5), m(6), m(7), m(8), m(9),
      p(2), p(3), p(4), p(6), p(7),
      t(5), t(5), t(5),
    ])
    const evals = evaluateAllDiscards(hand)
    const spread = ukeireSpread(evals)
    expect(spread).toBeGreaterThanOrEqual(0)
  })

  it('returns 0 for single evaluation', () => {
    expect(ukeireSpread([])).toBe(0)
  })
})

describe('isRelevantDraw', () => {
  it('returns true when drawn tile improves shanten', () => {
    // Hand at shanten 1 missing one tile to complete
    const hand = buildHand([
      m(1), m(2), m(3), m(4), m(5), m(6), m(7), m(8), m(9),
      p(1), p(2), p(3), p(5), p(6),
      t(7), t(7),
    ])
    // Drawing p(4) completes the p(456) run, should improve shanten
    expect(isRelevantDraw(hand, p(4))).toBe(true)
  })

  it('returns false when drawn tile is completely unrelated', () => {
    // Dense hand in man+pin, drawing an isolated honor
    const hand = buildHand([
      m(1), m(2), m(3), m(4), m(5), m(6), m(7), m(8), m(9),
      p(1), p(2), p(3), p(5), p(6),
      t(7), t(7),
    ])
    // Drawing a lone honor that doesn't connect to anything
    const result = isRelevantDraw(hand, EAST)
    // This should be false since it adds a floater
    expect(result).toBe(false)
  })
})

describe('assessQuestionQuality', () => {
  it('scores a well-structured hand higher than a scattered one', () => {
    // Dense hand
    const denseHand = buildHand([
      m(1), m(2), m(3), m(4), m(5), m(6), m(7), m(8), m(9),
      p(1), p(2), p(3), p(5), p(6),
      t(7), t(7),
    ])
    const denseEvals = evaluateAllDiscards([...denseHand, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0].slice(0, 34))

    // Scattered hand
    const scatteredHand = buildHand([
      m(1), m(3), m(5), m(7), m(9),
      p(1), p(3), p(5), p(7), p(9),
      t(1), t(3), t(5), t(7), t(9),
      EAST,
    ])
    const scatteredEvals = evaluateAllDiscards([...scatteredHand, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0].slice(0, 34))

    // Use p(4) for dense (relevant) and EAST+1 for scattered (another isolated)
    const denseQuality = assessQuestionQuality(denseHand, p(4), denseEvals)
    const scatteredQuality = assessQuestionQuality(scatteredHand, EAST + 1, scatteredEvals)

    expect(denseQuality.score).toBeGreaterThan(scatteredQuality.score)
  })
})

describe('dealHardQuestion integration', () => {
  it('generates valid hands with quality scores', async () => {
    const { dealHardQuestion } = await import('../handGenerator')
    const { computeShanten } = await import('../shanten')
    const { addTile } = await import('../tiles')

    for (let i = 0; i < 5; i++) {
      const result = dealHardQuestion({ targetShanten: 2, minScore: 3 })
      expect(computeShanten(result.hand)).toBe(2)
      expect(result.quality.score).toBeGreaterThanOrEqual(0)
      expect(result.evaluations.length).toBeGreaterThan(0)

      const hand17 = addTile(result.hand, result.wall[0])
      const totalTiles = hand17.reduce((sum, c) => sum + c, 0)
      expect(totalTiles).toBe(17)
    }
  })

  it('returns a result even with impossibly high minScore', async () => {
    const { dealHardQuestion } = await import('../handGenerator')
    const result = dealHardQuestion({ targetShanten: 2, minScore: 100, maxAttempts: 50 })
    expect(result).toBeDefined()
    expect(result.hand).toBeDefined()
    expect(result.quality).toBeDefined()
  })
})
