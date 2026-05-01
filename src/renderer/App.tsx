import { useState, useCallback, useRef, useEffect } from 'react'
import Canvas from './canvas/Canvas'
import type { CanvasHandle } from './canvas/Canvas'
import { GraphSchema, ComponentType, FlowDirection } from './model/graph'
import type { Graph, Flow } from './model/graph'
import { buildFilePayload, parseFilePayload } from './storage/file'
import SettingsPanel from './ui/SettingsPanel'
import ChatPanel from './ui/ChatPanel'
import ThreatsPanel from './ui/ThreatsPanel'
import AttackPanel from './ui/AttackPanel'
import { generateAttackThreatsStreaming } from './llm/attackAnalysis'
import type { AttackThreat } from './model/attackThreats'
import PropertiesPanel from './ui/PropertiesPanel'
import PalettePanel from './ui/PalettePanel'
import type { FlowDraft } from './ui/PalettePanel'
import ContextMenu from './ui/ContextMenu'
import ToolbarDropdown from './ui/ToolbarDropdown'
import { createLLMClient } from './llm/llm'
import { generateGraphFromDescription } from './llm/nlToGraph'
import { generateThreatsStreaming } from './llm/strideAnalysis'
import InterviewPanel from './ui/InterviewPanel'
import { exportToPng, exportToSvg, exportToJson, exportThreatsToCsv } from './canvas/export'
import { useAppHistory } from './hooks/useAppHistory'
import { nextId } from './model/ids'
import { useInterview } from './hooks/useInterview'
import { useLLMSettings } from './hooks/useLLMSettings'
import { ThemeContext, lightTheme, darkTheme, fonts } from './ui/tokens'
import type { Theme } from './ui/tokens'

const defaultGraph: Graph = GraphSchema.parse({
  id: 'g1',
  name: 'Demo System',
  zones: [
    { id: 'z1', name: 'Internet' },
    { id: 'z2', name: 'DMZ', description: 'Demilitarized zone' },
    { id: 'z3', name: 'Internal Network' }
  ],
  components: [
    { id: 'c1', name: 'Browser', type: ComponentType.External, zoneId: 'z1', icon: 'browser' },
    { id: 'c2', name: 'Load Balancer', type: ComponentType.Process, zoneId: 'z2', icon: 'server' },
    { id: 'c3', name: 'API Server', type: ComponentType.Process, zoneId: 'z3', icon: 'server' },
    { id: 'c4', name: 'Database', type: ComponentType.DataStore, zoneId: 'z3', icon: 'database' }
  ],
  flows: [
    { id: 'f1', name: 'User Traffic', originatorId: 'c1', targetId: 'c2', direction: FlowDirection.Unidirectional, protocol: 'HTTPS', encrypted: true, encryption: 'TLS' },
    { id: 'f2', name: 'Backend Traffic', originatorId: 'c2', targetId: 'c3', direction: FlowDirection.Bidirectional, protocol: 'HTTP', encrypted: false },
    { id: 'f3', name: 'Database Query', originatorId: 'c3', targetId: 'c4', direction: FlowDirection.Bidirectional, protocol: 'SQL', encrypted: true, encryption: 'TLS' }
  ]
})

export default function App(): JSX.Element {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try { return localStorage.getItem('tn-theme') === 'dark' } catch { return false }
  })
  const theme = isDark ? darkTheme : lightTheme

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev
      try { localStorage.setItem('tn-theme', next ? 'dark' : 'light') } catch { /* noop */ }
      return next
    })
  }, [])

  const canvasRef = useRef<CanvasHandle>(null)
  const { graph, graphRef, threats, threatsRef, attackThreats, attackThreatsRef, setGraph: setGraphWithHistory, setThreats, setThreatsNoHistory, setAttackThreats, setAttackThreatsNoHistory, undo, redo, canUndo, canRedo, updatePosition } = useAppHistory(defaultGraph)
  const { settings, showSettings, save: saveSettings, openSettings, closeSettings } = useLLMSettings()

  const [showChat, setShowChat] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isAnalyzingAttack, setIsAnalyzingAttack] = useState(false)
  const [bottomTab, setBottomTab] = useState<'stride' | 'attack'>('stride')
  const [flowDraft, setFlowDraft] = useState<FlowDraft>(null)
  const [isPickingZone, setIsPickingZone] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ elementId: string | null; x: number; y: number } | null>(null)
  const [showThreats, setShowThreats] = useState(true)
  const [canvasHeightFraction, setCanvasHeightFraction] = useState(0.667)
  const [sidebarWidth, setSidebarWidth] = useState(340)
  const sidebarWidthRef = useRef(sidebarWidth)
  sidebarWidthRef.current = sidebarWidth
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const currentFilePathRef = useRef(currentFilePath)
  currentFilePathRef.current = currentFilePath

  const handleError = useCallback((msg: string) => { setError(msg) }, [])
  const interview = useInterview({ settings, graphRef, onError: handleError })

  const flowDraftRef = useRef(flowDraft)
  flowDraftRef.current = flowDraft
  const isPickingZoneRef = useRef(isPickingZone)
  isPickingZoneRef.current = isPickingZone

  const buildPayload = useCallback(() => {
    const t = threatsRef.current
    const a = attackThreatsRef.current
    const iv = interview.messagesRef.current
    return JSON.stringify(buildFilePayload(graphRef.current, t ?? undefined, iv.length > 0 ? iv : undefined, a ?? undefined))
  }, [graphRef, interview.messagesRef, threatsRef, attackThreatsRef])

  const handleSave = useCallback(async () => {
    const result = await window.electronAPI.saveGraph(buildPayload(), currentFilePathRef.current ?? undefined)
    if (!result.cancelled && result.filePath !== undefined) {
      setCurrentFilePath(result.filePath)
      setIsDirty(false)
      setLastSavedAt(new Date())
    }
  }, [buildPayload])

  const handleSaveAs = useCallback(async () => {
    const result = await window.electronAPI.saveGraph(buildPayload())
    if (!result.cancelled && result.filePath !== undefined) {
      setCurrentFilePath(result.filePath)
      setIsDirty(false)
      setLastSavedAt(new Date())
    }
  }, [buildPayload])

  const handleLoad = useCallback(async () => {
    const result = await window.electronAPI.loadGraph()
    if (result.cancelled || result.content === undefined) return
    try {
      const payload = parseFilePayload(result.content)
      setGraphWithHistory(payload.graph)
      setThreats(payload.threats ?? null)
      setAttackThreats(payload.attackThreats ?? null)
      interview.setMessages(payload.interviewTranscript ?? [])
      setCurrentFilePath(result.filePath ?? null)
      setIsDirty(false)
      setLastSavedAt(new Date())
    } catch {
      alert('Failed to load diagram: file is corrupt or incompatible.')
    }
  }, [setGraphWithHistory, interview])

  const handleGenerateDiagram = useCallback(async (description: string) => {
    setIsGenerating(true)
    try {
      const client = createLLMClient(settings)
      const generated = await generateGraphFromDescription(client, description, settings.nlToGraphPrompt)
      setGraphWithHistory(generated)
      setShowChat(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }, [settings, setGraphWithHistory])

  const handleExportPng = useCallback(() => {
    const cy = canvasRef.current?.getCy()
    if (cy === null || cy === undefined) return
    triggerDownload(exportToPng(cy), 'diagram.png')
  }, [])

  const handleExportSvg = useCallback(() => {
    const cy = canvasRef.current?.getCy()
    if (cy === null || cy === undefined) return
    const blob = new Blob([exportToSvg(cy)], { type: 'image/svg+xml' })
    triggerDownload(URL.createObjectURL(blob), 'diagram.svg')
  }, [])

  const handleExportJson = useCallback(() => {
    const blob = new Blob([exportToJson(graphRef.current)], { type: 'application/json' })
    triggerDownload(URL.createObjectURL(blob), 'diagram.json')
  }, [graphRef])

  const handleExportCsv = useCallback(() => {
    const blob = new Blob([exportThreatsToCsv(threats ?? [])], { type: 'text/csv' })
    triggerDownload(URL.createObjectURL(blob), 'threats.csv')
  }, [threats])

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true)
    setBottomTab('stride')
    const existing = threatsRef.current ?? []
    setThreats(existing.length > 0 ? existing : [])
    try {
      const client = createLLMClient(settings)
      const iv = interview.messagesRef.current
      await generateThreatsStreaming(
        client,
        graphRef.current,
        (threat) => { setThreatsNoHistory(prev => [...(prev ?? []), threat]) },
        iv.length > 0 ? iv : undefined,
        existing.length > 0 ? existing : undefined,
        settings.stridePrompt
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }, [settings, graphRef, interview.messagesRef, setThreats, setThreatsNoHistory])

  const handleAnalyzeAttack = useCallback(async () => {
    const t = threatsRef.current
    if (t === null || t.length === 0) return
    setIsAnalyzingAttack(true)
    setBottomTab('attack')
    const existing = attackThreatsRef.current ?? []
    setAttackThreats(existing.length > 0 ? existing : [])
    try {
      const client = createLLMClient(settings)
      const iv = interview.messagesRef.current
      await generateAttackThreatsStreaming(
        client,
        graphRef.current,
        t,
        (a: AttackThreat) => { setAttackThreatsNoHistory(prev => [...(prev ?? []), a]) },
        iv.length > 0 ? iv : undefined,
        existing.length > 0 ? existing : undefined,
        settings.mitrePrompt
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ATT&CK analysis failed')
    } finally {
      setIsAnalyzingAttack(false)
    }
  }, [settings, graphRef, interview.messagesRef, threatsRef, attackThreatsRef, setAttackThreats, setAttackThreatsNoHistory])

  const handleInterviewOpen = useCallback(async () => {
    setShowChat(false)
    setSelectedElementId(null)
    await interview.open()
  }, [interview])

  const handleElementSelected = useCallback((id: string | null) => {
    const draft = flowDraftRef.current
    const picking = isPickingZoneRef.current
    const g = graphRef.current

    if (id !== null && picking) {
      const zone = g.zones.find(z => z.id === id)
      if (zone !== undefined) {
        const allIds = [...g.zones.map(z => z.id), ...g.components.map(c => c.id), ...g.flows.map(f => f.id)]
        const newId = nextId('c', allIds)
        setGraphWithHistory(
          { ...g, components: [...g.components, { id: newId, name: 'New Component', type: ComponentType.Process, zoneId: zone.id }] }
        )
        setIsPickingZone(false)
        setSelectedElementId(newId)
      }
      return
    }

    if (id !== null && draft !== null) {
      const component = g.components.find(c => c.id === id)
      if (component === undefined) return
      if (draft.stage === 'source') {
        setFlowDraft({ stage: 'target', sourceId: id, sourceName: component.name })
        return
      }
      if (draft.stage === 'target') {
        const newFlow: Flow = {
          id: nextId('f', g.flows.map(f => f.id)),
          name: 'New Flow',
          originatorId: draft.sourceId,
          targetId: id,
          direction: FlowDirection.Unidirectional
        }
        setGraphWithHistory({ ...g, flows: [...g.flows, newFlow] })
        setFlowDraft(null)
        setSelectedElementId(newFlow.id)
        return
      }
    }

    setSelectedElementId(id)
    if (id !== null) setShowChat(false)
  }, [setGraphWithHistory, graphRef])

  const handleElementRightClicked = useCallback((elementId: string | null, position: { x: number; y: number }) => {
    const g = graphRef.current
    if (elementId === null) {
      setContextMenu({ elementId: null, x: position.x, y: position.y })
      return
    }
    const zone = g.zones.find(z => z.id === elementId)
    const component = g.components.find(c => c.id === elementId)
    const flow = g.flows.find(f => f.id === elementId)
    if (zone !== undefined || component !== undefined || flow !== undefined) {
      setContextMenu({ elementId, x: position.x, y: position.y })
    }
  }, [graphRef])

  const handleAddZone = useCallback(() => {
    const g = graphRef.current
    const id = nextId('z', g.zones.map(z => z.id))
    setGraphWithHistory({ ...g, zones: [...g.zones, { id, name: 'New Zone' }] })
    setSelectedElementId(id)
  }, [setGraphWithHistory, graphRef])

  const handleAddBoundary = useCallback((clientX?: number, clientY?: number) => {
    const g = graphRef.current
    const id = nextId('z', g.zones.map(z => z.id))
    const cy = canvasRef.current?.getCy()
    let start = { x: 0, y: 0 }
    if (cy !== null && cy !== undefined && typeof clientX === 'number' && typeof clientY === 'number') {
      const containerRect = cy.container()?.getBoundingClientRect()
      if (containerRect !== undefined) {
        const pan = cy.pan()
        const z = cy.zoom()
        start = { x: (clientX - containerRect.left - pan.x) / z, y: (clientY - containerRect.top - pan.y) / z }
      }
    }
    const endPosition = { x: start.x + 200, y: start.y }
    setGraphWithHistory({
      ...g,
      zones: [...g.zones, { id, name: 'New Boundary', shape: 'line', position: start, endPosition }]
    })
    setSelectedElementId(id)
  }, [setGraphWithHistory, graphRef])

  const handleBoundaryHandleMoved = useCallback((zoneId: string, which: 'start' | 'mid' | 'end', position: { x: number; y: number }) => {
    const g = graphRef.current
    setGraphWithHistory({
      ...g,
      zones: g.zones.map(z => {
        if (z.id !== zoneId) return z
        if (which === 'start') return { ...z, position }
        if (which === 'end') return { ...z, endPosition: position }
        return { ...z, midPosition: position }
      })
    })
  }, [setGraphWithHistory, graphRef])

  const handleBoundaryStraighten = useCallback((zoneId: string) => {
    const g = graphRef.current
    setGraphWithHistory({
      ...g,
      zones: g.zones.map(z => {
        if (z.id !== zoneId) return z
        const { midPosition: _drop, ...rest } = z
        return rest
      })
    })
  }, [setGraphWithHistory, graphRef])

  const handleAddComponent = useCallback((zoneId?: string) => {
    if (typeof zoneId === 'string') {
      const g = graphRef.current
      const allIds = [...g.zones.map(z => z.id), ...g.components.map(c => c.id), ...g.flows.map(f => f.id)]
      const id = nextId('c', allIds)
      setGraphWithHistory(
        { ...g, components: [...g.components, { id, name: 'New Component', type: ComponentType.Process, zoneId }] }
      )
      setSelectedElementId(id)
      setContextMenu(null)
    } else {
      setIsPickingZone(true)
      setFlowDraft(null)
    }
  }, [setGraphWithHistory, graphRef])

  const handleDeleteElement = useCallback((elementId: string) => {
    const g = graphRef.current
    const zone = g.zones.find(z => z.id === elementId)
    if (zone !== undefined) {
      const removedComponentIds = new Set(g.components.filter(c => c.zoneId === elementId).map(c => c.id))
      setGraphWithHistory({
        ...g,
        zones: g.zones.filter(z => z.id !== elementId),
        components: g.components.filter(c => c.zoneId !== elementId),
        flows: g.flows.filter(f => !removedComponentIds.has(f.originatorId) && !removedComponentIds.has(f.targetId))
      })
      setSelectedElementId(null)
      return
    }
    const component = g.components.find(c => c.id === elementId)
    if (component !== undefined) {
      setGraphWithHistory({
        ...g,
        components: g.components.filter(c => c.id !== elementId),
        flows: g.flows.filter(f => f.originatorId !== elementId && f.targetId !== elementId)
      })
      setSelectedElementId(null)
      return
    }
    const flow = g.flows.find(f => f.id === elementId)
    if (flow !== undefined) {
      setGraphWithHistory({ ...g, flows: g.flows.filter(f => f.id !== elementId) })
      setSelectedElementId(null)
    }
  }, [setGraphWithHistory, graphRef])

  const handleFlowEndpointChanged = useCallback((flowId: string, end: 'source' | 'target', newComponentId: string) => {
    const g = graphRef.current
    setGraphWithHistory({
      ...g,
      flows: g.flows.map(f =>
        f.id !== flowId
          ? f
          : end === 'source'
            ? { ...f, originatorId: newComponentId }
            : { ...f, targetId: newComponentId }
      )
    })
  }, [setGraphWithHistory, graphRef])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
        if (e.key === 'y') { e.preventDefault(); redo() }
        if (e.key === 's' && !e.shiftKey) { e.preventDefault(); handleSave() }
        if (e.key === 's' && e.shiftKey) { e.preventDefault(); handleSaveAs() }
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement | null
        const tag = target?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable === true) return
        if (selectedElementId !== null) {
          e.preventDefault()
          handleDeleteElement(selectedElementId)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, handleSave, handleSaveAs, selectedElementId, handleDeleteElement])

  const isInitialRender = useRef(true)
  useEffect(() => {
    if (isInitialRender.current) { isInitialRender.current = false; return }
    setIsDirty(true)
  }, [graph, threats])

  useEffect(() => {
    const fp = currentFilePathRef.current
    if (!isDirty || fp === null) return
    const timer = setTimeout(async () => {
      const savePath = currentFilePathRef.current
      if (savePath === null) return
      try {
        await window.electronAPI.saveGraph(buildPayload(), savePath)
        setIsDirty(false)
        setLastSavedAt(new Date())
      } catch { /* silent auto-save failure */ }
    }, 5000)
    return () => clearTimeout(timer)
  }, [graph, threats, isDirty, buildPayload])

  const handleVerticalResizeStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const container = e.currentTarget.parentElement as HTMLDivElement
    const containerRect = container.getBoundingClientRect()
    const onMouseMove = (me: MouseEvent) => {
      const fraction = (me.clientY - containerRect.top) / containerRect.height
      setCanvasHeightFraction(Math.min(0.85, Math.max(0.15, fraction)))
    }
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [])

  const handleHorizontalResizeStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = sidebarWidthRef.current
    const onMouseMove = (me: MouseEvent) => {
      setSidebarWidth(Math.min(600, Math.max(180, startWidth + (startX - me.clientX))))
    }
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [])

  const contextMenuItems = contextMenu !== null ? (() => {
    if (contextMenu.elementId === null) {
      const items: { label: string; onClick: () => void }[] = [
        { label: 'Add Zone', onClick: () => handleAddZone() },
        { label: 'Add Boundary', onClick: () => handleAddBoundary(contextMenu.x, contextMenu.y) }
      ]
      if (graph.zones.length > 0) {
        items.push({ label: 'Add Component…', onClick: () => handleAddComponent() })
      }
      if (graph.components.length >= 1) {
        items.push({ label: 'Add Flow…', onClick: () => { setFlowDraft({ stage: 'source' }); setIsPickingZone(false) } })
      }
      return items
    }
    const component = graph.components.find(c => c.id === contextMenu.elementId)
    if (component !== undefined) {
      return [
        {
          label: `Start flow from ${component.name}`,
          onClick: () => setFlowDraft({ stage: 'target', sourceId: component.id, sourceName: component.name })
        },
        { label: `Delete ${component.name}`, onClick: () => handleDeleteElement(component.id) }
      ]
    }
    const zone = graph.zones.find(z => z.id === contextMenu.elementId)
    if (zone !== undefined) {
      return [
        { label: `Add Component in ${zone.name}`, onClick: () => handleAddComponent(zone.id) },
        { label: `Delete ${zone.name} (and its contents)`, onClick: () => handleDeleteElement(zone.id) }
      ]
    }
    const flow = graph.flows.find(f => f.id === contextMenu.elementId)
    if (flow !== undefined) {
      return [{ label: `Delete ${flow.name}`, onClick: () => handleDeleteElement(flow.id) }]
    }
    return []
  })() : []

  const handleZoomIn = useCallback(() => {
    const cy = canvasRef.current?.getCy()
    if (cy) cy.zoom({ level: cy.zoom() * 1.2, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } })
  }, [])
  const handleZoomOut = useCallback(() => {
    const cy = canvasRef.current?.getCy()
    if (cy) cy.zoom({ level: cy.zoom() / 1.2, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } })
  }, [])
  const handleFit = useCallback(() => { canvasRef.current?.getCy()?.fit(undefined, 40) }, [])

  const sideContent = (): JSX.Element => {
    if (interview.showInterview) {
      return (
        <InterviewPanel
          messages={interview.messages}
          onSend={interview.send}
          onClose={interview.close}
          onRestart={interview.restart}
          isLoading={interview.isInterviewing}
        />
      )
    }
    if (showChat) {
      return (
        <ChatPanel
          onGraphGenerated={handleGenerateDiagram}
          onClose={() => setShowChat(false)}
          isLoading={isGenerating}
          inline
        />
      )
    }
    if (flowDraft !== null || isPickingZone) {
      return (
        <PalettePanel
          zones={graph.zones}
          onAddZone={handleAddZone}
          onAddComponent={handleAddComponent}
          onStartFlow={() => { setFlowDraft({ stage: 'source' }); setIsPickingZone(false) }}
          onCancelFlow={() => setFlowDraft(null)}
          onCancelPickZone={() => setIsPickingZone(false)}
          flowDraft={flowDraft}
          isPickingZone={isPickingZone}
        />
      )
    }
    if (selectedElementId !== null) {
      return (
        <PropertiesPanel
          graph={graph}
          elementId={selectedElementId}
          onUpdate={setGraphWithHistory}
          onClose={() => setSelectedElementId(null)}
        />
      )
    }
    return (
      <PalettePanel
        zones={graph.zones}
        onAddZone={handleAddZone}
        onAddComponent={handleAddComponent}
        onStartFlow={() => { setFlowDraft({ stage: 'source' }); setIsPickingZone(false) }}
        onCancelFlow={() => setFlowDraft(null)}
        onCancelPickZone={() => setIsPickingZone(false)}
        flowDraft={null}
        isPickingZone={false}
      />
    )
  }

  const t = theme
  const fileName = currentFilePath !== null
    ? currentFilePath.split(/[/\\]/).pop()?.replace(/\.tninja$/i, '') ?? 'untitled'
    : null

  const toolBtn = (t: Theme): React.CSSProperties => ({
    height: 30, padding: '0 11px',
    background: 'transparent', border: '1px solid transparent',
    color: t.text, borderRadius: 6, cursor: 'pointer',
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 450,
    display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' as const, flexShrink: 0,
  })

  const primaryToolBtn = (t: Theme): React.CSSProperties => ({
    ...toolBtn(t),
    background: t.accentBg,
    border: `1px solid ${t.accent}40`,
    color: t.accentDim,
    fontWeight: 500,
  })

  const disabledToolBtn = (t: Theme): React.CSSProperties => ({
    ...toolBtn(t),
    color: t.textDim,
    cursor: 'not-allowed',
  })

  const chevron = <svg width="9" height="9" viewBox="0 0 9 9" style={{ opacity: 0.6 }}><path d="M1.5 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" /></svg>

  return (
    <ThemeContext.Provider value={theme}>
      <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.bg, color: t.text, fontFamily: fonts.sans }}>
        <header style={{ height: 52, background: t.bgAlt, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 0, flexShrink: 0, WebkitAppRegion: 'drag' } as React.CSSProperties}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginRight: 18 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7,
              background: `linear-gradient(135deg, ${t.accent}, ${t.accentDim})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 13,
            }}>TN</div>
            <span style={{ fontSize: 14.5, fontWeight: 600, color: t.text, letterSpacing: -0.2 }}>Threat Ninja</span>
            <span style={{ fontSize: 11, color: isDirty ? t.accent : t.textDim, padding: '2px 7px', background: t.bgInset, borderRadius: 4, marginLeft: 4, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fileName ?? 'untitled'}{isDirty ? ' ●' : ''}
            </span>
          </div>

          <div style={{ width: 1, height: 22, background: t.border, marginRight: 12 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 2, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <ToolbarDropdown label="File" items={[
              { label: 'Save', onClick: handleSave, shortcut: 'Ctrl+S' },
              { label: 'Save As…', onClick: handleSaveAs, shortcut: 'Ctrl+Shift+S' },
              { label: 'Open', onClick: handleLoad, shortcut: 'Ctrl+O' },
            ]} />
            <ToolbarDropdown label="Edit" items={[
              { label: 'Undo', onClick: undo, disabled: !canUndo, shortcut: 'Ctrl+Z' },
              { label: 'Redo', onClick: redo, disabled: !canRedo, shortcut: 'Ctrl+Y' },
            ]} />
            <div style={{ width: 1, height: 18, background: t.border, margin: '0 8px' }} />
            <button aria-label="Generate Diagram" onClick={() => { setShowChat(true); setSelectedElementId(null); setFlowDraft(null) }} style={primaryToolBtn(t)}>Generate {chevron}</button>
            {(isAnalyzing || isAnalyzingAttack) ? (
              <button disabled style={disabledToolBtn(t)} aria-label={isAnalyzing ? 'Analyzing' : 'Mapping ATT&CK'}>
                {isAnalyzing ? 'Analyzing…' : 'Mapping ATT&CK…'}
              </button>
            ) : (
              <ToolbarDropdown label="Analyze" items={[
                { label: 'STRIDE', onClick: handleAnalyze },
                {
                  label: 'ATT&CK',
                  onClick: handleAnalyzeAttack,
                  disabled: threats === null || threats.length === 0,
                },
              ]} />
            )}
            <button onClick={handleInterviewOpen} disabled={interview.isInterviewing} style={interview.isInterviewing ? disabledToolBtn(t) : toolBtn(t)}>
              {interview.isInterviewing ? 'Interviewing…' : interview.messages.length > 0 ? 'Interview ●' : 'Interview'} {chevron}
            </button>
            <div style={{ width: 1, height: 18, background: t.border, margin: '0 8px' }} />
            <button onClick={() => setShowThreats(s => !s)} style={toolBtn(t)} aria-label="Toggle Threats">
              {showThreats ? 'Hide Threats' : 'Show Threats'}
            </button>
            <ToolbarDropdown label="Export" items={[
              { label: 'Export PNG', onClick: handleExportPng },
              { label: 'Export SVG', onClick: handleExportSvg },
              { label: 'Export JSON', onClick: handleExportJson },
              { label: 'Export CSV', onClick: handleExportCsv },
            ]} />
            <div style={{ width: 1, height: 18, background: t.border, margin: '0 8px' }} />
            <button onClick={openSettings} style={toolBtn(t)}>Settings</button>
          </div>

          {(isGenerating || isAnalyzing || interview.isInterviewing) && (
            <div role="status" aria-label="Loading" style={{
              width: 14, height: 14, marginLeft: 8,
              border: `2px solid ${t.accent}`, borderTopColor: 'transparent',
              borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0,
            }} />
          )}

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            height: 30, padding: '0 10px 0 12px',
            background: t.bgInset, borderRadius: 6, fontSize: 12, color: t.textMuted,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: isDirty ? '#d97706' : lastSavedAt !== null ? '#16a34a' : t.textDim }} />
            <span style={{ color: t.text, fontWeight: 500 }}>
              {isDirty ? 'Unsaved changes' : lastSavedAt !== null ? 'Saved' : 'Not saved'}
            </span>
            {lastSavedAt !== null && !isDirty && (
              <span style={{ color: t.textDim }}>&middot; {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>

          <button onClick={toggleTheme} aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              marginLeft: 8, width: 30, height: 30, borderRadius: 6, cursor: 'pointer',
              background: t.bgInset, border: `1px solid ${t.border}`, color: t.textMuted,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            {isDark ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <circle cx="7" cy="7" r="3" />
                <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.6 2.6l1.1 1.1M10.3 10.3l1.1 1.1M2.6 11.4l1.1-1.1M10.3 3.7l1.1-1.1" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11.5 8.5A4.5 4.5 0 0 1 5.5 2.5a5 5 0 1 0 6 6z" />
              </svg>
            )}
          </button>

          <div style={{ width: 1, height: 18, background: t.border, margin: '0 8px' }} />
          <button onClick={() => window.electronAPI.windowMinimize()} aria-label="Minimize" style={winCtrlStyle(t)}>
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6h8" stroke="currentColor" strokeWidth="1.2" /></svg>
          </button>
          <button onClick={() => window.electronAPI.windowMaximize()} aria-label="Maximize" style={winCtrlStyle(t)}>
            <svg width="12" height="12" viewBox="0 0 12 12"><rect x="2" y="2" width="8" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
          </button>
          <button onClick={() => window.electronAPI.windowClose()} aria-label="Close window" style={{ ...winCtrlStyle(t), marginRight: -8 }}>
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
          </button>
          </div>
        </header>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ flex: showThreats ? canvasHeightFraction : 1, position: 'relative', minHeight: 0, padding: 16 }}>
              <div style={{
                position: 'absolute', inset: 16, borderRadius: 10,
                border: `1px solid ${t.border}`, background: t.bgAlt,
                boxShadow: isDark ? 'none' : '0 1px 2px rgba(0,0,0,0.03)',
                overflow: 'hidden',
              }}>
                <Canvas
                  ref={canvasRef}
                  graph={graph}
                  onElementSelected={handleElementSelected}
                  onElementRightClicked={handleElementRightClicked}
                  onPositionChanged={updatePosition}
                  onFlowEndpointChanged={handleFlowEndpointChanged}
                  onBoundaryHandleMoved={handleBoundaryHandleMoved}
                  onBoundaryStraighten={handleBoundaryStraighten}
                />
                <div style={{ position: 'absolute', top: 14, left: 16, display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'none' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>System Diagram</span>
                  <span style={{ fontSize: 12, color: t.textMuted }}>
                    {graph.components.length} components &middot; {graph.flows.length} flows
                  </span>
                </div>
                <div style={{
                  position: 'absolute', top: 14, right: 16, display: 'flex', gap: 4,
                  background: t.bgAlt, border: `1px solid ${t.border}`, borderRadius: 6, padding: 2,
                }}>
                  {[
                    { label: '−', onClick: handleZoomOut },
                    { label: '100%', onClick: handleFit },
                    { label: '+', onClick: handleZoomIn },
                  ].map((btn, i) => (
                    <button key={i} onClick={btn.onClick} style={{
                      height: 24, padding: '0 8px', background: 'transparent', border: 'none',
                      color: t.textMuted, fontSize: 12, cursor: 'pointer', borderRadius: 4, minWidth: 24,
                      fontFamily: fonts.sans,
                    }}>{btn.label}</button>
                  ))}
                </div>
              </div>
            </div>
            {showThreats && (
              <>
                <div
                  data-testid="canvas-threats-resize"
                  onMouseDown={handleVerticalResizeStart}
                  style={{ height: 1, cursor: 'row-resize', background: t.border, flexShrink: 0 }}
                />
                <div style={{ flex: 1 - canvasHeightFraction, overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', borderBottom: `1px solid ${t.border}`, background: t.bgAlt, flexShrink: 0 }}>
                    {([
                      { id: 'stride' as const, label: 'Threats', count: threats?.length },
                      { id: 'attack' as const, label: 'ATT&CK', count: attackThreats?.length },
                    ]).map(tab => {
                      const active = bottomTab === tab.id
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setBottomTab(tab.id)}
                          style={{
                            padding: '10px 18px', background: 'transparent',
                            border: 'none', borderBottom: active ? `2px solid ${t.accent}` : '2px solid transparent',
                            color: active ? t.text : t.textMuted, cursor: 'pointer',
                            fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                          }}
                        >
                          {tab.label}
                          {tab.count !== undefined && tab.count > 0 && (
                            <span style={{ fontSize: 11, color: t.textMuted, padding: '1px 6px', background: t.bgInset, borderRadius: 8 }}>
                              {tab.count}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                    {bottomTab === 'stride' ? (
                      <ThreatsPanel
                        threats={threats}
                        isAnalyzing={isAnalyzing}
                        selectedId={selectedElementId ?? undefined}
                        onThreatSelected={setSelectedElementId}
                        onThreatsChange={setThreats}
                        graph={graph}
                      />
                    ) : (
                      <AttackPanel
                        attackThreats={attackThreats}
                        isAnalyzing={isAnalyzingAttack}
                        selectedId={selectedElementId ?? undefined}
                        onAttackThreatSelected={setSelectedElementId}
                        onAttackThreatsChange={setAttackThreats}
                        graph={graph}
                        threats={threats}
                        onRelatedThreatClick={(threatId) => {
                          const matched = threats?.find(th => th.id === threatId)
                          if (matched !== undefined) {
                            setSelectedElementId(matched.affectedId)
                            setBottomTab('stride')
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <div
            data-testid="content-sidebar-resize"
            onMouseDown={handleHorizontalResizeStart}
            style={{ width: 1, cursor: 'col-resize', background: t.border, flexShrink: 0 }}
          />
          <div style={{ width: sidebarWidth, minWidth: sidebarWidth, height: '100%', background: t.bgAlt, borderLeft: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {sideContent()}
          </div>
        </div>

        {error !== null && (
          <div role="alert" onClick={() => setError(null)} style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: isDark ? '#3a1a1a' : '#fef2f2', color: isDark ? '#f87171' : '#dc2626',
            border: `1px solid ${isDark ? '#5a2a2a' : '#fecaca'}`,
            borderRadius: 6, padding: '10px 20px', fontSize: 13, cursor: 'pointer',
            zIndex: 200, maxWidth: 500, textAlign: 'center',
          }}>
            {error}
          </div>
        )}
        {contextMenu !== null && (
          <ContextMenu
            items={contextMenuItems}
            position={{ x: contextMenu.x, y: contextMenu.y }}
            onDismiss={() => setContextMenu(null)}
          />
        )}
        {showSettings && (
          <SettingsPanel
            settings={settings}
            onSave={saveSettings}
            onClose={closeSettings}
          />
        )}
      </div>
    </ThemeContext.Provider>
  )
}

const winCtrlStyle = (t: Theme): React.CSSProperties => ({
  width: 28, height: 28, borderRadius: 6, cursor: 'pointer',
  background: 'transparent', border: 'none', color: t.textMuted,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
})

const triggerDownload = (href: string, filename: string): void => {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.click()
}
