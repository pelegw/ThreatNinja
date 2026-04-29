import { describe, it, expect } from 'vitest'
import { cytoscapeStyle } from './style'
import { ComponentType } from '../model/graph'

describe('cytoscapeStyle', () => {
  it('returns an array of style rules', () => {
    expect(Array.isArray(cytoscapeStyle())).toBe(true)
  })

  it('includes a base node rule', () => {
    const rules = cytoscapeStyle()
    expect(rules.some(r => r.selector === 'node')).toBe(true)
  })

  it('includes a rule for component nodes with a parent', () => {
    const rules = cytoscapeStyle()
    expect(rules.some(r => r.selector === 'node[parent]')).toBe(true)
  })

  it('includes a dashed border rule for zone nodes', () => {
    const rules = cytoscapeStyle()
    const rule = rules.find(r => r.selector === 'node.zone')
    expect(rule).toBeDefined()
    expect(rule?.style?.['border-style']).toBe('dashed')
  })

  it('includes a green color rule for encrypted edges', () => {
    const rules = cytoscapeStyle()
    const rule = rules.find(r => r.selector === 'edge.encrypted')
    expect(rule).toBeDefined()
    expect(rule?.style?.['line-color']).toBeDefined()
  })

  it('includes a red color rule for plaintext edges', () => {
    const rules = cytoscapeStyle()
    const rule = rules.find(r => r.selector === 'edge.plaintext')
    expect(rule).toBeDefined()
    expect(rule?.style?.['line-color']).toBeDefined()
  })

  const shapeExpectations: Record<ComponentType, string> = {
    [ComponentType.Database]: 'barrel',
    [ComponentType.Service]: 'ellipse',
    [ComponentType.Server]: 'rectangle',
    [ComponentType.Desktop]: 'round-rectangle',
    [ComponentType.FileStore]: 'tag',
    [ComponentType.ObjectStorage]: 'hexagon',
    [ComponentType.ExternalEntity]: 'diamond',
  }

  for (const [type, expectedShape] of Object.entries(shapeExpectations)) {
    it(`gives ${type} nodes the shape "${expectedShape}"`, () => {
      const rules = cytoscapeStyle()
      const rule = rules.find(r => r.selector === `node[parent][type = "${type}"]`)
      expect(rule).toBeDefined()
      expect(rule?.style?.shape).toBe(expectedShape)
    })
  }
})
