export type Point = { x: number; y: number }

export const bezierControlFor = (start: Point, mid: Point, end: Point): Point => ({
  x: 2 * mid.x - (start.x + end.x) / 2,
  y: 2 * mid.y - (start.y + end.y) / 2,
})

export const geometricMidpoint = (start: Point, end: Point): Point => ({
  x: (start.x + end.x) / 2,
  y: (start.y + end.y) / 2,
})

export const graphToRendered = (point: Point, pan: Point, zoom: number): Point => ({
  x: point.x * zoom + pan.x,
  y: point.y * zoom + pan.y,
})

export const renderedToGraph = (point: Point, pan: Point, zoom: number): Point => ({
  x: (point.x - pan.x) / zoom,
  y: (point.y - pan.y) / zoom,
})
