import { describe, expect, it } from 'vitest'
import { assessDiscardSafety } from '../discardSafety'
import { C, E, m, p, s } from './testHelpers'

describe('assessDiscardSafety', () => {
  it('老頭牌（1、9）判定為安全', () => {
    for (const kind of [m(1), m(9), p(1), p(9), s(1), s(9)]) {
      expect(assessDiscardSafety(kind)).toEqual({ level: 'safe', score: 2 })
    }
  })

  it('字牌判定為安全', () => {
    for (const kind of [E, C]) {
      expect(assessDiscardSafety(kind)).toEqual({ level: 'safe', score: 2 })
    }
  })

  it('中張（4、5、6）判定為危險', () => {
    for (const kind of [m(4), m(5), m(6), p(4), p(5), p(6), s(4), s(5), s(6)]) {
      expect(assessDiscardSafety(kind)).toEqual({ level: 'dangerous', score: 0 })
    }
  })

  it('2、3、7、8 判定為風險中等', () => {
    for (const kind of [m(2), m(3), m(7), m(8), p(2), p(3), p(7), p(8), s(2), s(3), s(7), s(8)]) {
      expect(assessDiscardSafety(kind)).toEqual({ level: 'medium', score: 1 })
    }
  })
})
