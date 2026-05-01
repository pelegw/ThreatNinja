import { describe, it, expect } from 'vitest'
import { bezierControlFor, geometricMidpoint, graphToRendered, renderedToGraph } from './boundary'

describe('bezierControlFor', () => {
  it('returns the geometric midpoint when mid lies on the straight line (no curve)', () => {
    const start = { x: 0, y: 0 }
    const end = { x: 100, y: 0 }
    const mid = geometricMidpoint(start, end)
    expect(bezierControlFor(start, mid, end)).toEqual({ x: 50, y: 0 })
  })

  it('places the control such that the quadratic curve passes through the user-visible midpoint', () => {
    const start = { x: 0, y: 0 }
    const end = { x: 100, y: 0 }
    const mid = { x: 50, y: 40 }
    const ctrl = bezierControlFor(start, mid, end)
    const curveAtHalf = {
      x: 0.25 * start.x + 0.5 * ctrl.x + 0.25 * end.x,
      y: 0.25 * start.y + 0.5 * ctrl.y + 0.25 * end.y,
    }
    expect(curveAtHalf).toEqual(mid)
  })

  it('handles arbitrary start/end positions', () => {
    const start = { x: 10, y: 20 }
    const end = { x: 110, y: 220 }
    const mid = { x: 80, y: 100 }
    const ctrl = bezierControlFor(start, mid, end)
    const curveAtHalf = {
      x: 0.25 * start.x + 0.5 * ctrl.x + 0.25 * end.x,
      y: 0.25 * start.y + 0.5 * ctrl.y + 0.25 * end.y,
    }
    expect(curveAtHalf).toEqual(mid)
  })
})

describe('graphToRendered / renderedToGraph', () => {
  it('round-trips a point through both conversions', () => {
    const pan = { x: 30, y: 40 }
    const zoom = 2
    const original = { x: 100, y: 200 }
    const rendered = graphToRendered(original, pan, zoom)
    expect(renderedToGraph(rendered, pan, zoom)).toEqual(original)
  })

  it('graphToRendered applies zoom then pan', () => {
    expect(graphToRendered({ x: 10, y: 20 }, { x: 5, y: 7 }, 2)).toEqual({ x: 25, y: 47 })
  })
})
