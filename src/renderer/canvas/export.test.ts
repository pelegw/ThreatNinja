import { describe, it, expect, vi } from 'vitest'
import { exportToPng, exportToSvg, exportToJson } from './export'

const makeCy = (overrides = {}) => ({
  png: vi.fn().mockReturnValue('data:image/png;base64,abc'),
  svg: vi.fn().mockReturnValue('<svg></svg>'),
  ...overrides
})

describe('exportToPng', () => {
  it('calls cy.png with scale option', () => {
    const cy = makeCy()
    exportToPng(cy as never)
    expect(cy.png).toHaveBeenCalledWith(expect.objectContaining({ scale: expect.any(Number) }))
  })

  it('returns the data URL from cy.png', () => {
    const cy = makeCy()
    const result = exportToPng(cy as never)
    expect(result).toBe('data:image/png;base64,abc')
  })
})

describe('exportToSvg', () => {
  it('calls cy.svg', () => {
    const cy = makeCy()
    exportToSvg(cy as never)
    expect(cy.svg).toHaveBeenCalled()
  })

  it('returns the SVG string from cy.svg', () => {
    const cy = makeCy()
    const result = exportToSvg(cy as never)
    expect(result).toBe('<svg></svg>')
  })
})

describe('exportToJson', () => {
  it('returns a JSON string of the graph', () => {
    const graph = { id: 'g1', name: 'Test', zones: [], components: [], flows: [] }
    const json = exportToJson(graph as never)
    expect(JSON.parse(json)).toMatchObject({ id: 'g1', name: 'Test' })
  })
})
