// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAppHistory } from './useAppHistory'
import { ComponentType, FlowDirection } from '../model/graph'
import type { Graph } from '../model/graph'
import { StrideCategory } from '../model/threats'
import type { ThreatList } from '../model/threats'

const makeGraph = (name: string): Graph => ({
  id: 'g1',
  name,
  zones: [{ id: 'z1', name: 'Zone' }],
  components: [{ id: 'c1', name: 'API', type: ComponentType.Process, zoneId: 'z1' }],
  flows: [{ id: 'f1', name: 'Call', originatorId: 'c1', targetId: 'c1', direction: FlowDirection.Unidirectional }]
})

const makeThreat = (id: string, title: string) => ({
  id, title, category: StrideCategory.Spoofing, description: 'desc', affectedId: 'c1', severity: 'high' as const
})

const initialGraph = makeGraph('Initial')

describe('useAppHistory', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('returns the initial graph and null threats', () => {
    const { result } = renderHook(() => useAppHistory(initialGraph))
    expect(result.current.graph.name).toBe('Initial')
    expect(result.current.threats).toBeNull()
  })

  it('cannot undo or redo initially', () => {
    const { result } = renderHook(() => useAppHistory(initialGraph))
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('updates the graph via setGraph', () => {
    const { result } = renderHook(() => useAppHistory(initialGraph))
    act(() => result.current.setGraph(makeGraph('Updated')))
    expect(result.current.graph.name).toBe('Updated')
  })

  it('can undo a graph change after debounce', () => {
    const { result } = renderHook(() => useAppHistory(initialGraph))
    act(() => result.current.setGraph(makeGraph('Updated')))
    act(() => { vi.advanceTimersByTime(600) })
    expect(result.current.canUndo).toBe(true)
    act(() => result.current.undo())
    expect(result.current.graph.name).toBe('Initial')
  })

  it('can undo immediately without waiting for debounce', () => {
    const { result } = renderHook(() => useAppHistory(initialGraph))
    act(() => result.current.setGraph(makeGraph('Updated')))
    act(() => result.current.undo())
    expect(result.current.graph.name).toBe('Initial')
  })

  it('can redo after undoing', () => {
    const { result } = renderHook(() => useAppHistory(initialGraph))
    act(() => result.current.setGraph(makeGraph('Updated')))
    act(() => result.current.undo())
    expect(result.current.canRedo).toBe(true)
    act(() => result.current.redo())
    expect(result.current.graph.name).toBe('Updated')
  })

  it('clears redo stack on new change', () => {
    const { result } = renderHook(() => useAppHistory(initialGraph))
    act(() => result.current.setGraph(makeGraph('V1')))
    act(() => result.current.undo())
    act(() => result.current.setGraph(makeGraph('V2')))
    expect(result.current.canRedo).toBe(false)
  })

  it('batches rapid graph changes into a single undo entry', () => {
    const { result } = renderHook(() => useAppHistory(initialGraph))
    act(() => {
      result.current.setGraph(makeGraph('V1'))
      result.current.setGraph(makeGraph('V2'))
      result.current.setGraph(makeGraph('V3'))
    })
    act(() => { vi.advanceTimersByTime(600) })
    expect(result.current.graph.name).toBe('V3')
    act(() => result.current.undo())
    expect(result.current.graph.name).toBe('Initial')
    expect(result.current.canUndo).toBe(false)
  })

  it('batches rapid threat changes into a single undo entry', () => {
    const { result } = renderHook(() => useAppHistory(initialGraph))
    act(() => result.current.setThreats([makeThreat('t1', 'A')]))
    act(() => result.current.setThreats([makeThreat('t1', 'AB')]))
    act(() => result.current.setThreats([makeThreat('t1', 'ABC')]))
    act(() => { vi.advanceTimersByTime(600) })
    expect(result.current.threats![0]!.title).toBe('ABC')
    act(() => result.current.undo())
    expect(result.current.threats).toBeNull()
  })

  it('creates separate undo entries for changes separated by debounce window', () => {
    const { result } = renderHook(() => useAppHistory(initialGraph))
    act(() => result.current.setGraph(makeGraph('V1')))
    act(() => { vi.advanceTimersByTime(600) })
    act(() => result.current.setGraph(makeGraph('V2')))
    act(() => { vi.advanceTimersByTime(600) })
    act(() => result.current.undo())
    expect(result.current.graph.name).toBe('V1')
    act(() => result.current.undo())
    expect(result.current.graph.name).toBe('Initial')
  })

  it('updates threats via setThreats', () => {
    const { result } = renderHook(() => useAppHistory(initialGraph))
    const threats: ThreatList = [makeThreat('t1', 'XSS')]
    act(() => result.current.setThreats(threats))
    expect(result.current.threats).toEqual(threats)
  })

  it('can undo a threats change', () => {
    const { result } = renderHook(() => useAppHistory(initialGraph))
    act(() => result.current.setThreats([makeThreat('t1', 'XSS')]))
    act(() => result.current.undo())
    expect(result.current.threats).toBeNull()
  })

  it('undoes graph and threats together as a unified snapshot', () => {
    const { result } = renderHook(() => useAppHistory(initialGraph))
    act(() => result.current.setGraph(makeGraph('V1')))
    act(() => { vi.advanceTimersByTime(600) })
    act(() => result.current.setThreats([makeThreat('t1', 'XSS')]))
    act(() => result.current.undo())
    expect(result.current.threats).toBeNull()
    expect(result.current.graph.name).toBe('V1')
    act(() => result.current.undo())
    expect(result.current.graph.name).toBe('Initial')
  })

  it('limits history to 10 states', () => {
    const { result } = renderHook(() => useAppHistory(initialGraph))
    for (let i = 1; i <= 12; i++) {
      act(() => result.current.setGraph(makeGraph(`V${i}`)))
      act(() => { vi.advanceTimersByTime(600) })
    }
    expect(result.current.graph.name).toBe('V12')
    let undoCount = 0
    while (result.current.canUndo) {
      act(() => result.current.undo())
      undoCount++
    }
    expect(undoCount).toBe(10)
  })

  it('does nothing when undoing with empty history', () => {
    const { result } = renderHook(() => useAppHistory(initialGraph))
    act(() => result.current.undo())
    expect(result.current.graph.name).toBe('Initial')
  })

  it('does nothing when redoing with empty future', () => {
    const { result } = renderHook(() => useAppHistory(initialGraph))
    act(() => result.current.redo())
    expect(result.current.graph.name).toBe('Initial')
  })

  it('can undo position changes after debounce', () => {
    const { result } = renderHook(() => useAppHistory(initialGraph))
    act(() => result.current.updatePosition('c1', { x: 100, y: 200 }))
    act(() => { vi.advanceTimersByTime(600) })
    expect(result.current.canUndo).toBe(true)
    act(() => result.current.undo())
    expect(result.current.graph.components[0]!.position).toBeUndefined()
  })

  it('batches rapid position updates into a single undo entry', () => {
    const { result } = renderHook(() => useAppHistory(initialGraph))
    act(() => {
      result.current.updatePosition('c1', { x: 10, y: 10 })
      result.current.updatePosition('c1', { x: 50, y: 50 })
      result.current.updatePosition('c1', { x: 100, y: 200 })
    })
    act(() => { vi.advanceTimersByTime(600) })
    expect(result.current.graph.components[0]!.position).toEqual({ x: 100, y: 200 })
    act(() => result.current.undo())
    expect(result.current.graph.components[0]!.position).toBeUndefined()
    expect(result.current.canUndo).toBe(false)
  })

  it('applies position updates to the current graph', () => {
    const { result } = renderHook(() => useAppHistory(initialGraph))
    act(() => result.current.updatePosition('c1', { x: 100, y: 200 }))
    expect(result.current.graph.components[0]!.position).toEqual({ x: 100, y: 200 })
  })

  it('provides a stable graphRef that tracks the current graph', () => {
    const { result } = renderHook(() => useAppHistory(initialGraph))
    act(() => result.current.setGraph(makeGraph('Updated')))
    expect(result.current.graphRef.current.name).toBe('Updated')
  })

  it('provides a stable threatsRef that tracks the current threats', () => {
    const { result } = renderHook(() => useAppHistory(initialGraph))
    const threats: ThreatList = [makeThreat('t1', 'XSS')]
    act(() => result.current.setThreats(threats))
    expect(result.current.threatsRef.current).toEqual(threats)
  })

  it('supports setThreatsNoHistory with an updater function', () => {
    const { result } = renderHook(() => useAppHistory(initialGraph))
    act(() => result.current.setThreats([makeThreat('t1', 'XSS')]))
    act(() => result.current.setThreatsNoHistory(prev => [...(prev ?? []), makeThreat('t2', 'SQLI')]))
    expect(result.current.threats).toHaveLength(2)
  })

  it('setThreatsNoHistory does not push to undo stack', () => {
    const { result } = renderHook(() => useAppHistory(initialGraph))
    act(() => result.current.setThreatsNoHistory([makeThreat('t1', 'XSS')]))
    act(() => { vi.advanceTimersByTime(600) })
    expect(result.current.canUndo).toBe(false)
  })
})
