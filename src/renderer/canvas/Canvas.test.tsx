// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Canvas from './Canvas'
import { ComponentType, FlowDirection, GraphSchema } from '../model/graph'

const { mockCytoscape, mockCyInstance } = vi.hoisted(() => {
  const mockCyInstance = {
    add: vi.fn(),
    layout: vi.fn(() => ({ run: vi.fn() })),
    on: vi.fn(),
    off: vi.fn(),
    destroy: vi.fn(),
    resize: vi.fn(),
    fit: vi.fn(),
    panBy: vi.fn(),
    elements: vi.fn(() => ({ remove: vi.fn() })),
    style: vi.fn(() => ({ selector: vi.fn(() => ({ style: vi.fn() })) })),
    getElementById: vi.fn(() => ({ data: vi.fn(), remove: vi.fn(), classes: vi.fn() }))
  }
  const mockCytoscape = Object.assign(vi.fn(() => mockCyInstance), { use: vi.fn() })
  return { mockCytoscape, mockCyInstance }
})

vi.mock('cytoscape', () => ({ default: mockCytoscape }))

vi.mock('cytoscape-dagre', () => ({ default: vi.fn() }))
vi.mock('cytoscape-cose-bilkent', () => ({ default: vi.fn() }))

const makeGraph = () =>
  GraphSchema.parse({
    id: 'g1',
    name: 'Test',
    zones: [{ id: 'z1', name: 'DMZ' }],
    components: [{ id: 'c1', name: 'Web Server', type: ComponentType.Server, zoneId: 'z1' }],
    flows: [{ id: 'f1', name: 'HTTPS', originatorId: 'c1', targetId: 'c1', direction: FlowDirection.Unidirectional }]
  })

describe('Canvas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a container element', () => {
    render(<Canvas graph={makeGraph()} />)
    expect(screen.getByRole('region', { name: /diagram canvas/i })).toBeInTheDocument()
  })

  it('accepts a graph prop without throwing', () => {
    expect(() => render(<Canvas graph={makeGraph()} />)).not.toThrow()
  })

  it('accepts an onElementSelected prop without throwing', () => {
    expect(() => render(<Canvas graph={makeGraph()} onElementSelected={vi.fn()} />)).not.toThrow()
  })

  it('registers a tap event listener when onElementSelected is provided', () => {
    render(<Canvas graph={makeGraph()} onElementSelected={vi.fn()} />)
    expect(mockCyInstance.on).toHaveBeenCalledWith('tap', 'node, edge', expect.any(Function))
  })

  it('registers a background tap listener to deselect when onElementSelected is provided', () => {
    render(<Canvas graph={makeGraph()} onElementSelected={vi.fn()} />)
    expect(mockCyInstance.on).toHaveBeenCalledWith('tap', expect.any(Function))
  })

  it('registers a cxttap listener when onElementRightClicked is provided', () => {
    render(<Canvas graph={makeGraph()} onElementRightClicked={vi.fn()} />)
    expect(mockCyInstance.on).toHaveBeenCalledWith('cxttap', 'node', expect.any(Function))
  })

  it('does not register a cxttap listener when onElementRightClicked is not provided', () => {
    render(<Canvas graph={makeGraph()} />)
    expect(mockCyInstance.on).not.toHaveBeenCalledWith('cxttap', 'node', expect.any(Function))
  })

  it('calls onElementRightClicked with element id and client position on cxttap', () => {
    const onRightClicked = vi.fn()
    render(<Canvas graph={makeGraph()} onElementRightClicked={onRightClicked} />)
    const cxttapHandler = mockCyInstance.on.mock.calls.find(
      ([event, selector]: [string, unknown]) => event === 'cxttap' && selector === 'node'
    )?.[2] as ((evt: unknown) => void) | undefined
    cxttapHandler?.({
      target: { id: () => 'z1' },
      originalEvent: { clientX: 100, clientY: 200 }
    })
    expect(onRightClicked).toHaveBeenCalledWith('z1', { x: 100, y: 200 })
  })

  it('exposes a getCy method via ref that returns the Cytoscape instance', () => {
    const ref = { current: null } as React.MutableRefObject<{ getCy: () => unknown } | null>
    render(<Canvas graph={makeGraph()} ref={ref} />)
    expect(ref.current).not.toBeNull()
    expect(typeof ref.current?.getCy).toBe('function')
    expect(ref.current?.getCy()).toBe(mockCyInstance)
  })
})

describe('Canvas — incremental updates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates the cytoscape instance only once even when the graph prop changes', () => {
    const graph1 = makeGraph()
    const graph2 = GraphSchema.parse({ ...graph1, zones: [...graph1.zones, { id: 'z2', name: 'New Zone' }] })
    const { rerender } = render(<Canvas graph={graph1} />)
    rerender(<Canvas graph={graph2} />)
    expect(mockCytoscape).toHaveBeenCalledTimes(1)
  })

  it('does not destroy the cytoscape instance when the graph prop changes', () => {
    const graph1 = makeGraph()
    const graph2 = GraphSchema.parse({ ...graph1, zones: [...graph1.zones, { id: 'z2', name: 'New Zone' }] })
    const { rerender } = render(<Canvas graph={graph1} />)
    rerender(<Canvas graph={graph2} />)
    expect(mockCyInstance.destroy).not.toHaveBeenCalled()
  })

  it('syncs CSS classes on existing elements when encryption status changes', () => {
    const graph1 = makeGraph()
    const graph2 = GraphSchema.parse({
      ...graph1,
      flows: [{ id: 'f1', name: 'HTTPS', originatorId: 'c1', targetId: 'c1', direction: FlowDirection.Unidirectional, encrypted: true }]
    })
    const mockElement = { data: vi.fn(), remove: vi.fn(), classes: vi.fn() }
    mockCyInstance.getElementById.mockReturnValue(mockElement)
    const { rerender } = render(<Canvas graph={graph1} />)
    vi.clearAllMocks()
    mockCyInstance.getElementById.mockReturnValue(mockElement)
    rerender(<Canvas graph={graph2} />)
    expect(mockElement.classes).toHaveBeenCalledWith('encrypted')
  })

  it('calls cy.add with new element when a zone is added to the graph', () => {
    const graph1 = makeGraph()
    const graph2 = GraphSchema.parse({ ...graph1, zones: [...graph1.zones, { id: 'z2', name: 'New Zone' }] })
    const { rerender } = render(<Canvas graph={graph1} />)
    vi.clearAllMocks()
    rerender(<Canvas graph={graph2} />)
    expect(mockCyInstance.add).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ data: expect.objectContaining({ id: 'z2' }) })])
    )
  })

  it('calls cy.getElementById(id).remove() when an element is removed from the graph', () => {
    const graph1 = makeGraph()
    const graph2 = GraphSchema.parse({ id: 'g1', name: 'Test', zones: [], components: [], flows: [] })
    const mockElement = { data: vi.fn(), remove: vi.fn(), classes: vi.fn() }
    mockCyInstance.getElementById.mockReturnValue(mockElement)
    const { rerender } = render(<Canvas graph={graph1} />)
    rerender(<Canvas graph={graph2} />)
    expect(mockCyInstance.getElementById).toHaveBeenCalledWith('z1')
    expect(mockElement.remove).toHaveBeenCalled()
  })
})

describe('Canvas — right-click panning', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('calls cy.panBy when right mouse button is held and dragged', () => {
    render(<Canvas graph={makeGraph()} />)
    const container = screen.getByRole('region', { name: /diagram canvas/i })

    container.dispatchEvent(new MouseEvent('mousedown', { button: 2, clientX: 100, clientY: 100, bubbles: true }))
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 130, bubbles: true }))

    expect(mockCyInstance.panBy).toHaveBeenCalledWith({ x: 50, y: 30 })
  })

  it('does not call cy.panBy for left mouse button drag', () => {
    render(<Canvas graph={makeGraph()} />)
    const container = screen.getByRole('region', { name: /diagram canvas/i })

    container.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 100, clientY: 100, bubbles: true }))
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 130, bubbles: true }))

    expect(mockCyInstance.panBy).not.toHaveBeenCalled()
  })
})

describe('Canvas — position tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers a dragfree event listener when onPositionChanged is provided', () => {
    render(<Canvas graph={makeGraph()} onPositionChanged={vi.fn()} />)
    expect(mockCyInstance.on).toHaveBeenCalledWith('dragfree', 'node', expect.any(Function))
  })

  it('does not register a dragfree listener when onPositionChanged is not provided', () => {
    render(<Canvas graph={makeGraph()} />)
    expect(mockCyInstance.on).not.toHaveBeenCalledWith('dragfree', 'node', expect.any(Function))
  })

  it('calls onPositionChanged with element id and position on dragfree', () => {
    const onPositionChanged = vi.fn()
    render(<Canvas graph={makeGraph()} onPositionChanged={onPositionChanged} />)
    const dragfreeHandler = mockCyInstance.on.mock.calls.find(
      ([event, selector]: [string, unknown]) => event === 'dragfree' && selector === 'node'
    )?.[2] as ((evt: unknown) => void) | undefined
    dragfreeHandler?.({
      target: { id: () => 'z1', position: () => ({ x: 100, y: 200 }) }
    })
    expect(onPositionChanged).toHaveBeenCalledWith('z1', { x: 100, y: 200 })
  })
})
