import { describe, it, expect } from 'vitest'
import { cytoscapeStyle } from './style'
import { lightTheme } from '../ui/tokens'

describe('cytoscapeStyle', () => {
  it('returns an array of style rules', () => {
    expect(Array.isArray(cytoscapeStyle(lightTheme))).toBe(true)
  })

  it('includes a base node rule', () => {
    const rules = cytoscapeStyle(lightTheme)
    expect(rules.some(r => r.selector === 'node')).toBe(true)
  })

  it('uses classic DFD dark stroke on nodes', () => {
    const rules = cytoscapeStyle(lightTheme)
    const rule = rules.find(r => r.selector === 'node')
    expect(rule?.style?.['border-color']).toBe(lightTheme.nodeStroke)
  })

  it('gives circle-cyShape nodes an ellipse Cytoscape shape', () => {
    const rules = cytoscapeStyle(lightTheme)
    const rule = rules.find(r => r.selector === 'node[cyShape = "circle"]')
    expect(rule?.style?.shape).toBe('ellipse')
  })

  it('gives rect-cyShape nodes a rectangle Cytoscape shape', () => {
    const rules = cytoscapeStyle(lightTheme)
    const rule = rules.find(r => r.selector === 'node[cyShape = "rect"]')
    expect(rule?.style?.shape).toBe('rectangle')
  })

  it('gives open-cyShape nodes a rectangle with no border', () => {
    const rules = cytoscapeStyle(lightTheme)
    const rule = rules.find(r => r.selector === 'node[cyShape = "open"]')
    expect(rule?.style?.shape).toBe('rectangle')
    expect(rule?.style?.['border-width']).toBe(0)
  })

  it('gives pipe-cyShape nodes a round-rectangle Cytoscape shape', () => {
    const rules = cytoscapeStyle(lightTheme)
    const rule = rules.find(r => r.selector === 'node[cyShape = "pipe"]')
    expect(rule?.style?.shape).toBe('round-rectangle')
  })

  it('includes a dashed border rule for parent (zone) nodes', () => {
    const rules = cytoscapeStyle(lightTheme)
    const rule = rules.find(r => r.selector === ':parent')
    expect(rule).toBeDefined()
    expect(rule?.style?.['border-style']).toBe('dashed')
  })

  it('styles parent nodes with uppercase mono labels', () => {
    const rules = cytoscapeStyle(lightTheme)
    const rule = rules.find(r => r.selector === ':parent')
    expect(rule?.style?.['text-transform']).toBe('uppercase')
  })

  it('includes a green color rule for encrypted edges', () => {
    const rules = cytoscapeStyle(lightTheme)
    const rule = rules.find(r => r.selector === 'edge.encrypted')
    expect(rule).toBeDefined()
    expect(rule?.style?.['line-color']).toBe(lightTheme.edgeTrusted)
  })

  it('includes a red solid rule for plaintext edges', () => {
    const rules = cytoscapeStyle(lightTheme)
    const rule = rules.find(r => r.selector === 'edge.plaintext')
    expect(rule).toBeDefined()
    expect(rule?.style?.['line-color']).toBe(lightTheme.edgeUntrusted)
    expect(rule?.style?.['line-style']).not.toBe('dashed')
  })

  it('renders zone boundaries with a dashed red border', () => {
    const rules = cytoscapeStyle(lightTheme)
    const rule = rules.find(r => r.selector === ':parent')
    expect(rule?.style?.['border-style']).toBe('dashed')
    expect(rule?.style?.['border-color']).toBe(lightTheme.edgeUntrusted)
  })

  it('enables text wrapping on nodes so multiline labels render', () => {
    const rules = cytoscapeStyle(lightTheme)
    const rule = rules.find(r => r.selector === 'node')
    expect(rule?.style?.['text-wrap']).toBe('wrap')
  })

  it('enables text wrapping on edges so multiline labels render', () => {
    const rules = cytoscapeStyle(lightTheme)
    const rule = rules.find(r => r.selector === 'edge')
    expect(rule?.style?.['text-wrap']).toBe('wrap')
  })

  it('includes a selected node rule with accent border', () => {
    const rules = cytoscapeStyle(lightTheme)
    const rule = rules.find(r => r.selector === 'node:selected')
    expect(rule?.style?.['border-color']).toBe(lightTheme.accent)
  })

  it('includes bidirectional edge rule with source arrow', () => {
    const rules = cytoscapeStyle(lightTheme)
    const rule = rules.find(r => r.selector === 'edge[direction = "bidirectional"]')
    expect(rule).toBeDefined()
    expect(rule?.style?.['source-arrow-shape']).toBe('triangle')
  })
})
