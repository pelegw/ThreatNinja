import { useState, useCallback, useRef } from 'react'
import type { Graph } from '../model/graph'

export const useGraphState = (initial: Graph) => {
  const [graph, setGraph] = useState<Graph>(initial)
  const [undoStack, setUndoStack] = useState<Graph[]>([])
  const [redoStack, setRedoStack] = useState<Graph[]>([])

  const graphRef = useRef(graph)
  graphRef.current = graph

  const setGraphWithHistory = useCallback((next: Graph) => {
    setUndoStack(prev => [...prev, graphRef.current])
    setRedoStack([])
    setGraph(next)
  }, [])

  const undo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev
      const previous = prev[prev.length - 1]!
      setRedoStack(redo => [graphRef.current, ...redo])
      setGraph(previous)
      return prev.slice(0, -1)
    })
  }, [])

  const redo = useCallback(() => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev
      const next = prev[0]!
      setUndoStack(u => [...u, graphRef.current])
      setGraph(next)
      return prev.slice(1)
    })
  }, [])

  const updatePosition = useCallback((id: string, position: { x: number; y: number }) => {
    setGraph(g => ({
      ...g,
      zones: g.zones.map(z => z.id === id ? { ...z, position } : z),
      components: g.components.map(c => c.id === id ? { ...c, position } : c)
    }))
  }, [])

  return {
    graph,
    graphRef,
    setGraphWithHistory,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    updatePosition,
  }
}
