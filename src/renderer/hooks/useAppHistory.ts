import { useState, useCallback, useRef } from 'react'
import type { Graph } from '../model/graph'
import type { ThreatList } from '../model/threats'
import type { AttackThreatList } from '../model/attackThreats'

const MAX_HISTORY = 10
const DEBOUNCE_MS = 500

type Snapshot = { graph: Graph; threats: ThreatList | null; attackThreats: AttackThreatList | null }

export const useAppHistory = (initialGraph: Graph) => {
  const [graph, setGraphRaw] = useState<Graph>(initialGraph)
  const [threats, setThreatsRaw] = useState<ThreatList | null>(null)
  const [attackThreats, setAttackThreatsRaw] = useState<AttackThreatList | null>(null)
  const [undoStack, setUndoStack] = useState<Snapshot[]>([])
  const [redoStack, setRedoStack] = useState<Snapshot[]>([])

  const graphRef = useRef(graph)
  graphRef.current = graph
  const threatsRef = useRef(threats)
  threatsRef.current = threats
  const attackThreatsRef = useRef(attackThreats)
  attackThreatsRef.current = attackThreats

  const pendingSnapshot = useRef<Snapshot | null>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const snap = (): Snapshot => ({
    graph: graphRef.current,
    threats: threatsRef.current,
    attackThreats: attackThreatsRef.current,
  })

  const commitPending = useCallback(() => {
    if (debounceTimer.current !== null) {
      clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }
    if (pendingSnapshot.current !== null) {
      const s = pendingSnapshot.current
      pendingSnapshot.current = null
      setUndoStack(prev => {
        const next = [...prev, s]
        return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next
      })
    }
  }, [])

  const captureAndSchedule = useCallback(() => {
    if (pendingSnapshot.current === null) {
      pendingSnapshot.current = snap()
    }
    setRedoStack([])
    if (debounceTimer.current !== null) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(commitPending, DEBOUNCE_MS)
  }, [commitPending])

  const setGraph = useCallback((next: Graph) => {
    captureAndSchedule()
    setGraphRaw(next)
  }, [captureAndSchedule])

  const setThreats = useCallback((next: ThreatList | null) => {
    captureAndSchedule()
    setThreatsRaw(next)
  }, [captureAndSchedule])

  const setThreatsNoHistory = useCallback((next: ThreatList | null | ((prev: ThreatList | null) => ThreatList | null)) => {
    if (typeof next === 'function') {
      setThreatsRaw(next)
    } else {
      setThreatsRaw(next)
    }
  }, [])

  const setAttackThreats = useCallback((next: AttackThreatList | null) => {
    captureAndSchedule()
    setAttackThreatsRaw(next)
  }, [captureAndSchedule])

  const setAttackThreatsNoHistory = useCallback((next: AttackThreatList | null | ((prev: AttackThreatList | null) => AttackThreatList | null)) => {
    if (typeof next === 'function') {
      setAttackThreatsRaw(next)
    } else {
      setAttackThreatsRaw(next)
    }
  }, [])

  const undo = useCallback(() => {
    commitPending()
    setUndoStack(prev => {
      if (prev.length === 0) return prev
      const s = prev[prev.length - 1]!
      setRedoStack(redo => [snap(), ...redo])
      setGraphRaw(s.graph)
      setThreatsRaw(s.threats)
      setAttackThreatsRaw(s.attackThreats)
      return prev.slice(0, -1)
    })
  }, [commitPending])

  const redo = useCallback(() => {
    commitPending()
    setRedoStack(prev => {
      if (prev.length === 0) return prev
      const s = prev[0]!
      setUndoStack(u => [...u, snap()])
      setGraphRaw(s.graph)
      setThreatsRaw(s.threats)
      setAttackThreatsRaw(s.attackThreats)
      return prev.slice(1)
    })
  }, [commitPending])

  const updatePosition = useCallback((id: string, position: { x: number; y: number }) => {
    captureAndSchedule()
    setGraphRaw(g => ({
      ...g,
      zones: g.zones.map(z => z.id === id ? { ...z, position } : z),
      components: g.components.map(c => c.id === id ? { ...c, position } : c)
    }))
  }, [captureAndSchedule])

  return {
    graph,
    graphRef,
    threats,
    threatsRef,
    attackThreats,
    attackThreatsRef,
    setGraph,
    setThreats,
    setThreatsNoHistory,
    setAttackThreats,
    setAttackThreatsNoHistory,
    undo,
    redo,
    canUndo: undoStack.length > 0 || pendingSnapshot.current !== null,
    canRedo: redoStack.length > 0,
    updatePosition,
  }
}
