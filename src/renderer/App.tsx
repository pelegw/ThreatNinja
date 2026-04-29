import { useState, useCallback, useEffect, useRef } from 'react'
import Canvas from './canvas/Canvas'
import type { CanvasHandle } from './canvas/Canvas'
import { GraphSchema, ComponentType, FlowDirection } from './model/graph'
import type { Graph, Flow } from './model/graph'
import { buildFilePayload, extractGraph, extractThreats, extractInterviewTranscript } from './storage/file'
import SettingsPanel from './ui/SettingsPanel'
import ChatPanel from './ui/ChatPanel'
import ThreatsPanel from './ui/ThreatsPanel'
import PropertiesPanel from './ui/PropertiesPanel'
import PalettePanel from './ui/PalettePanel'
import type { FlowDraft } from './ui/PalettePanel'
import ContextMenu from './ui/ContextMenu'
import { LLMProvider, LLMSettingsSchema, createLLMClient } from './llm/llm'
import type { LLMSettings, LLMMessage } from './llm/llm'
import { generateGraphFromDescription } from './llm/nlToGraph'
import { generateThreats } from './llm/strideAnalysis'
import { startInterview, continueInterview } from './llm/interview'
import InterviewPanel from './ui/InterviewPanel'
import type { ThreatList } from './model/threats'
import { exportToPng, exportToSvg, exportToJson } from './canvas/export'

const defaultGraph: Graph = GraphSchema.parse({
  id: 'demo',
  name: 'Demo System',
  zones: [
    { id: 'z-internet', name: 'Internet' },
    { id: 'z-dmz', name: 'DMZ', description: 'Demilitarized zone' },
    { id: 'z-internal', name: 'Internal Network' }
  ],
  components: [
    { id: 'c-browser', name: 'Browser', type: ComponentType.Desktop, zoneId: 'z-internet' },
    { id: 'c-lb', name: 'Load Balancer', type: ComponentType.Server, zoneId: 'z-dmz' },
    { id: 'c-api', name: 'API Server', type: ComponentType.Service, zoneId: 'z-internal' },
    { id: 'c-db', name: 'Database', type: ComponentType.Database, zoneId: 'z-internal' }
  ],
  flows: [
    { id: 'f1', name: 'User Traffic', originatorId: 'c-browser', targetId: 'c-lb', direction: FlowDirection.Unidirectional, protocol: 'HTTPS', encrypted: true, encryption: 'TLS' },
    { id: 'f2', name: 'Backend Traffic', originatorId: 'c-lb', targetId: 'c-api', direction: FlowDirection.Bidirectional, protocol: 'HTTP', encrypted: false },
    { id: 'f3', name: 'Database Query', originatorId: 'c-api', targetId: 'c-db', direction: FlowDirection.Bidirectional, protocol: 'SQL', encrypted: true, encryption: 'TLS' }
  ]
})

const defaultSettings: LLMSettings = { provider: LLMProvider.Anthropic }

export default function App(): JSX.Element {
  const canvasRef = useRef<CanvasHandle>(null)
  const [graph, setGraph] = useState<Graph>(defaultGraph)
  const [undoStack, setUndoStack] = useState<Graph[]>([])
  const [redoStack, setRedoStack] = useState<Graph[]>([])
  const [settings, setSettings] = useState<LLMSettings>(defaultSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [threats, setThreats] = useState<ThreatList | null>(null)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [flowDraft, setFlowDraft] = useState<FlowDraft>(null)
  const [isPickingZone, setIsPickingZone] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ elementId: string; x: number; y: number } | null>(null)
  const [showThreats, setShowThreats] = useState(true)
  const [canvasHeightFraction, setCanvasHeightFraction] = useState(0.667)
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const sidebarWidthRef = useRef(sidebarWidth)
  sidebarWidthRef.current = sidebarWidth
  const [interviewMessages, setInterviewMessages] = useState<LLMMessage[]>([])
  const [isInterviewing, setIsInterviewing] = useState(false)
  const [showInterview, setShowInterview] = useState(false)
  const interviewMessagesRef = useRef(interviewMessages)
  interviewMessagesRef.current = interviewMessages

  const graphRef = useRef(graph)
  graphRef.current = graph
  const flowDraftRef = useRef(flowDraft)
  flowDraftRef.current = flowDraft
  const isPickingZoneRef = useRef(isPickingZone)
  isPickingZoneRef.current = isPickingZone

  useEffect(() => {
    window.electronAPI.loadSettings().then(json => {
      if (json === null) return
      try {
        setSettings(LLMSettingsSchema.parse(JSON.parse(json)))
      } catch { /* ignore corrupt settings */ }
    })
  }, [])

  const threatsRef = useRef(threats)
  threatsRef.current = threats

  const handleSave = useCallback(async () => {
    const t = threatsRef.current
    const iv = interviewMessagesRef.current
    await window.electronAPI.saveGraph(JSON.stringify(buildFilePayload(graphRef.current, t ?? undefined, iv.length > 0 ? iv : undefined)))
  }, [])

  const setGraphWithHistory = useCallback((next: Graph, current: Graph) => {
    setUndoStack(prev => [...prev, current])
    setRedoStack([])
    setGraph(next)
  }, [])

  const handleLoad = useCallback(async () => {
    const result = await window.electronAPI.loadGraph()
    if (result.cancelled || result.content === undefined) return
    try {
      setGraphWithHistory(extractGraph(result.content), graphRef.current)
      const loadedThreats = extractThreats(result.content)
      setThreats(loadedThreats ?? null)
      setInterviewMessages(extractInterviewTranscript(result.content) ?? [])
    } catch {
      alert('Failed to load diagram: file is corrupt or incompatible.')
    }
  }, [setGraphWithHistory])

  const handleGenerateDiagram = useCallback(async (description: string) => {
    setIsGenerating(true)
    try {
      const client = createLLMClient(settings)
      const generated = await generateGraphFromDescription(client, description)
      setGraphWithHistory(generated, graphRef.current)
      setShowChat(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }, [settings, setGraphWithHistory])

  const handleUndo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev
      const previous = prev[prev.length - 1]!
      setRedoStack(redo => [graphRef.current, ...redo])
      setGraph(previous)
      return prev.slice(0, -1)
    })
  }, [])

  const handleRedo = useCallback(() => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev
      const next = prev[0]!
      setUndoStack(undo => [...undo, graphRef.current])
      setGraph(next)
      return prev.slice(1)
    })
  }, [])

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
  }, [])

  const handlePositionChanged = useCallback((id: string, position: { x: number; y: number }) => {
    setGraph(g => ({
      ...g,
      zones: g.zones.map(z => z.id === id ? { ...z, position } : z),
      components: g.components.map(c => c.id === id ? { ...c, position } : c)
    }))
  }, [])

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true)
    try {
      const client = createLLMClient(settings)
      const iv = interviewMessagesRef.current
      const result = await generateThreats(client, graphRef.current, iv.length > 0 ? iv : undefined)
      setThreats(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }, [settings])

  const handleInterviewOpen = useCallback(async () => {
    setShowInterview(true)
    setShowChat(false)
    setSelectedElementId(null)
    if (interviewMessagesRef.current.length > 0) return
    setIsInterviewing(true)
    try {
      const messages = await startInterview(createLLMClient(settings), graphRef.current)
      setInterviewMessages(messages)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Interview failed')
      setShowInterview(false)
    } finally {
      setIsInterviewing(false)
    }
  }, [settings])

  const handleInterviewSend = useCallback(async (answer: string) => {
    setIsInterviewing(true)
    try {
      const updated = await continueInterview(createLLMClient(settings), interviewMessagesRef.current, answer)
      setInterviewMessages(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Interview failed')
    } finally {
      setIsInterviewing(false)
    }
  }, [settings])

  const handleInterviewRestart = useCallback(async () => {
    setInterviewMessages([])
    setIsInterviewing(true)
    try {
      const messages = await startInterview(createLLMClient(settings), graphRef.current)
      setInterviewMessages(messages)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Interview failed')
      setShowInterview(false)
    } finally {
      setIsInterviewing(false)
    }
  }, [settings])

  const handleElementSelected = useCallback((id: string | null) => {
    const draft = flowDraftRef.current
    const picking = isPickingZoneRef.current
    const g = graphRef.current

    if (id !== null && picking) {
      const zone = g.zones.find(z => z.id === id)
      if (zone !== undefined) {
        const newId = `c-${Date.now()}`
        setGraphWithHistory(
          { ...g, components: [...g.components, { id: newId, name: 'New Component', type: ComponentType.Service, zoneId: zone.id }] },
          g
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
          id: `f-${Date.now()}`,
          name: 'New Flow',
          originatorId: draft.sourceId,
          targetId: id,
          direction: FlowDirection.Unidirectional
        }
        setGraphWithHistory({ ...g, flows: [...g.flows, newFlow] }, g)
        setFlowDraft(null)
        setSelectedElementId(newFlow.id)
        return
      }
    }

    setSelectedElementId(id)
    if (id !== null) setShowChat(false)
  }, [setGraphWithHistory])

  const handleElementRightClicked = useCallback((elementId: string, position: { x: number; y: number }) => {
    const zone = graphRef.current.zones.find(z => z.id === elementId)
    if (zone !== undefined) {
      setContextMenu({ elementId, x: position.x, y: position.y })
    }
  }, [])

  const handleAddZone = useCallback(() => {
    const g = graphRef.current
    const id = `z-${Date.now()}`
    const newGraph = { ...g, zones: [...g.zones, { id, name: 'New Zone' }] }
    setGraphWithHistory(newGraph, g)
    setSelectedElementId(id)
  }, [setGraphWithHistory])

  const handleAddComponent = useCallback((zoneId?: string) => {
    if (typeof zoneId === 'string') {
      const g = graphRef.current
      const id = `c-${Date.now()}`
      setGraphWithHistory(
        { ...g, components: [...g.components, { id, name: 'New Component', type: ComponentType.Service, zoneId }] },
        g
      )
      setSelectedElementId(id)
      setContextMenu(null)
    } else {
      setIsPickingZone(true)
      setFlowDraft(null)
    }
  }, [setGraphWithHistory])

  const handleSaveSettings = useCallback(async (updated: LLMSettings) => {
    setSettings(updated)
    setShowSettings(false)
    await window.electronAPI.saveSettings(JSON.stringify(updated))
  }, [])

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
    const zone = graph.zones.find(z => z.id === contextMenu.elementId)
    if (zone !== undefined) {
      return [{ label: `Add Component in ${zone.name}`, onClick: () => handleAddComponent(zone.id) }]
    }
    return []
  })() : []

  const sideContent = (): JSX.Element => {
    if (showInterview) {
      return (
        <InterviewPanel
          messages={interviewMessages}
          onSend={handleInterviewSend}
          onClose={() => setShowInterview(false)}
          onRestart={handleInterviewRestart}
          isLoading={isInterviewing}
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
          onUpdate={g => setGraphWithHistory(g, graph)}
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

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={headerStyle}>
        <span style={brandStyle}>ThreatNinja</span>
        <button onClick={handleSave} style={toolBtnStyle}>Save</button>
        <button onClick={handleLoad} style={toolBtnStyle}>Open</button>
        <div style={separatorStyle} />
        <button onClick={handleUndo} disabled={undoStack.length === 0} style={undoStack.length === 0 ? disabledToolBtnStyle : toolBtnStyle}>Undo</button>
        <button onClick={handleRedo} disabled={redoStack.length === 0} style={redoStack.length === 0 ? disabledToolBtnStyle : toolBtnStyle}>Redo</button>
        <div style={separatorStyle} />
        <button aria-label="Generate Diagram" onClick={() => { setShowChat(true); setSelectedElementId(null); setFlowDraft(null) }} style={toolBtnStyle}>Generate</button>
        <button onClick={handleAnalyze} disabled={isAnalyzing} style={isAnalyzing ? disabledToolBtnStyle : toolBtnStyle}>
          {isAnalyzing ? 'Analyzing…' : 'Analyze'}
        </button>
        <button onClick={handleInterviewOpen} disabled={isInterviewing} style={isInterviewing ? disabledToolBtnStyle : toolBtnStyle}>
          {isInterviewing ? 'Interviewing…' : interviewMessages.length > 0 ? 'Interview ●' : 'Interview'}
        </button>
        <button
          onClick={() => setShowThreats(s => !s)}
          style={toolBtnStyle}
          aria-label="Toggle Threats"
        >
          {showThreats ? 'Threats ▼' : 'Threats ▲'}
        </button>
        {(isGenerating || isAnalyzing || isInterviewing) && (
          <div role="status" aria-label="Loading" style={spinnerStyle} />
        )}
        <div style={separatorStyle} />
        <button aria-label="Export PNG" onClick={handleExportPng} style={toolBtnStyle}>PNG</button>
        <button aria-label="Export SVG" onClick={handleExportSvg} style={toolBtnStyle}>SVG</button>
        <button aria-label="Export JSON" onClick={handleExportJson} style={toolBtnStyle}>JSON</button>
        <div style={separatorStyle} />
        <button onClick={() => setShowSettings(true)} style={toolBtnStyle}>Settings</button>
      </header>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ flex: showThreats ? canvasHeightFraction : 1, overflow: 'hidden', minHeight: 0 }}>
            <Canvas
              ref={canvasRef}
              graph={graph}
              onElementSelected={handleElementSelected}
              onElementRightClicked={handleElementRightClicked}
              onPositionChanged={handlePositionChanged}
            />
          </div>
          {showThreats && (
            <>
              <div
                data-testid="canvas-threats-resize"
                onMouseDown={handleVerticalResizeStart}
                style={vDividerStyle}
              />
              <div style={{ flex: 1 - canvasHeightFraction, overflow: 'hidden', minHeight: 0 }}>
                <ThreatsPanel
                  threats={threats}
                  selectedId={selectedElementId ?? undefined}
                  onThreatSelected={setSelectedElementId}
                  onThreatsChange={setThreats}
                />
              </div>
            </>
          )}
        </div>
        <div
          data-testid="content-sidebar-resize"
          onMouseDown={handleHorizontalResizeStart}
          style={hDividerStyle}
        />
        <div style={{ width: sidebarWidth, minWidth: sidebarWidth, height: '100%', background: '#16162a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {sideContent()}
        </div>
      </div>
      {error !== null && (
        <div role="alert" onClick={() => setError(null)} style={errorStyle}>
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
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

const headerStyle: React.CSSProperties = {
  background: '#1a1a2e', borderBottom: '1px solid #3a3a6e',
  display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', flexShrink: 0
}

const brandStyle: React.CSSProperties = {
  fontSize: '15px', fontWeight: 'bold', color: '#a0a0ff', marginRight: '8px', whiteSpace: 'nowrap'
}

const separatorStyle: React.CSSProperties = {
  width: '1px', height: '18px', background: '#3a3a6e', margin: '0 2px', flexShrink: 0
}

const toolBtnStyle: React.CSSProperties = {
  padding: '4px 10px', background: '#2a2a4e', color: '#e0e0ff',
  border: '1px solid #4a4a7e', borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
  whiteSpace: 'nowrap', flexShrink: 0
}

const disabledToolBtnStyle: React.CSSProperties = {
  padding: '4px 10px', background: '#1a1a3e', color: '#6060a0',
  border: '1px solid #4a4a7e', borderRadius: '4px', cursor: 'not-allowed', fontSize: '12px',
  whiteSpace: 'nowrap', flexShrink: 0
}

const vDividerStyle: React.CSSProperties = {
  height: '5px', cursor: 'row-resize', background: '#2a2a4e', flexShrink: 0,
  borderTop: '1px solid #3a3a6e', borderBottom: '1px solid #3a3a6e'
}

const hDividerStyle: React.CSSProperties = {
  width: '5px', cursor: 'col-resize', background: '#2a2a4e', flexShrink: 0,
  borderLeft: '1px solid #3a3a6e', borderRight: '1px solid #3a3a6e'
}

const spinnerStyle: React.CSSProperties = {
  width: 14, height: 14,
  border: '2px solid #4a4aee',
  borderTopColor: 'transparent',
  borderRadius: '50%',
  animation: 'spin 0.7s linear infinite',
  flexShrink: 0
}

const errorStyle: React.CSSProperties = {
  position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
  background: '#5a1a1a', color: '#ffaaaa', border: '1px solid #8a3a3a',
  borderRadius: '6px', padding: '10px 20px', fontSize: '13px', cursor: 'pointer',
  zIndex: 200, maxWidth: '500px', textAlign: 'center'
}

const triggerDownload = (href: string, filename: string): void => {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.click()
}
