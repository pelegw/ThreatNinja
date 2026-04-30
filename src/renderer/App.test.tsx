// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import App from './App'
import { ComponentType, FlowDirection } from './model/graph'
import type { Graph } from './model/graph'

const { canvasMock } = vi.hoisted(() => {
  const canvasMock = {
    onElementSelected: undefined as ((id: string | null) => void) | undefined,
    onElementRightClicked: undefined as ((id: string, pos: { x: number; y: number }) => void) | undefined,
    onPositionChanged: undefined as ((id: string, position: { x: number; y: number }) => void) | undefined
  }
  return { canvasMock }
})

vi.mock('./canvas/Canvas', () => ({
  default: ({ onElementSelected, onElementRightClicked, onPositionChanged }: {
    graph: unknown
    onElementSelected?: (id: string | null) => void
    onElementRightClicked?: (id: string, pos: { x: number; y: number }) => void
    onPositionChanged?: (id: string, position: { x: number; y: number }) => void
  }) => {
    canvasMock.onElementSelected = onElementSelected
    canvasMock.onElementRightClicked = onElementRightClicked
    canvasMock.onPositionChanged = onPositionChanged
    return <div data-testid="canvas" />
  }
}))

vi.mock('./llm/nlToGraph', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./llm/nlToGraph')>()
  return { ...actual, generateGraphFromDescription: vi.fn() }
})

vi.mock('./llm/strideAnalysis', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./llm/strideAnalysis')>()
  return { ...actual, generateThreats: vi.fn(), generateThreatsStreaming: vi.fn() }
})

import { generateGraphFromDescription } from './llm/nlToGraph'
import { generateThreatsStreaming } from './llm/strideAnalysis'
import { StrideCategory } from './model/threats'

const mockElectronAPI = {
  saveGraph: vi.fn().mockResolvedValue(undefined),
  loadGraph: vi.fn().mockResolvedValue({ cancelled: true }),
  saveSettings: vi.fn().mockResolvedValue(undefined),
  loadSettings: vi.fn().mockResolvedValue(null)
}

const minimalGraph: Graph = {
  id: 'g-test',
  name: 'Test System',
  zones: [{ id: 'z1', name: 'Internal' }],
  components: [{ id: 'c1', name: 'API', type: ComponentType.Service, zoneId: 'z1' }],
  flows: [{ id: 'f1', name: 'Call', originatorId: 'c1', targetId: 'c1', direction: FlowDirection.Unidirectional }]
}

describe('App', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      configurable: true
    })
    vi.clearAllMocks()
    mockElectronAPI.loadSettings.mockResolvedValue(null)
  })

  it('shows a Generate Diagram button in the header', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /generate diagram/i })).toBeInTheDocument()
  })

  it('opens ChatPanel when Generate Diagram is clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /generate diagram/i }))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('closes ChatPanel when Cancel is clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /generate diagram/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('calls generateGraphFromDescription with the entered description', async () => {
    vi.mocked(generateGraphFromDescription).mockResolvedValue(minimalGraph)
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /generate diagram/i }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A simple API' } })
    fireEvent.click(screen.getByRole('button', { name: /^generate$/i }))
    await waitFor(() =>
      expect(generateGraphFromDescription).toHaveBeenCalledWith(
        expect.any(Object),
        'A simple API'
      )
    )
  })

  it('closes ChatPanel after generation succeeds', async () => {
    vi.mocked(generateGraphFromDescription).mockResolvedValue(minimalGraph)
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /generate diagram/i }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A simple API' } })
    fireEvent.click(screen.getByRole('button', { name: /^generate$/i }))
    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument())
  })

  it('keeps ChatPanel open with loading state while generation is in progress', async () => {
    let resolveGenerate!: (g: Graph) => void
    vi.mocked(generateGraphFromDescription).mockReturnValue(
      new Promise<Graph>(res => { resolveGenerate = res })
    )
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /generate diagram/i }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A simple API' } })
    fireEvent.click(screen.getByRole('button', { name: /^generate$/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generate…' })).toBeDisabled())
    resolveGenerate(minimalGraph)
    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument())
  })
})

describe('App — STRIDE analysis', () => {
  const sampleThreats: Threat[] = [
    { id: 't1', title: 'SQL Injection', category: StrideCategory.Tampering, description: 'desc', affectedId: 'c1', severity: 'high' }
  ]

  beforeEach(() => {
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      configurable: true
    })
    vi.clearAllMocks()
    mockElectronAPI.loadSettings.mockResolvedValue(null)
  })

  it('shows an Analyze button in the header', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument()
  })

  it('opens ThreatsPanel after clicking Analyze and generation completes', async () => {
    vi.mocked(generateThreatsStreaming).mockImplementation(async (_, __, onThreat) => { sampleThreats.forEach(onThreat); return sampleThreats })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))
    await waitFor(() => expect(screen.getByDisplayValue('SQL Injection')).toBeInTheDocument())
  })

  it('saves threats with the diagram when Save is clicked', async () => {
    vi.mocked(generateThreatsStreaming).mockImplementation(async (_, __, onThreat) => { sampleThreats.forEach(onThreat); return sampleThreats })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))
    await waitFor(() => screen.getByDisplayValue('SQL Injection'))
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(mockElectronAPI.saveGraph).toHaveBeenCalled())
    const saved = JSON.parse(mockElectronAPI.saveGraph.mock.calls[0][0] as string) as { threats?: unknown }
    expect(saved.threats).toBeDefined()
  })

  it('restores threats when loading a file that contains them', async () => {
    const fileWithThreats = JSON.stringify({
      version: '1',
      graph: { id: 'g1', name: 'Loaded', zones: [{ id: 'z1', name: 'Z' }], components: [], flows: [] },
      threats: sampleThreats
    })
    mockElectronAPI.loadGraph.mockResolvedValue({ cancelled: false, content: fileWithThreats })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /open/i }))
    await waitFor(() => expect(mockElectronAPI.loadGraph).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText(/1 threats/i)).toBeInTheDocument())
  })

  it('shows threats inline after analysis completes', async () => {
    vi.mocked(generateThreatsStreaming).mockImplementation(async (_, __, onThreat) => { sampleThreats.forEach(onThreat); return sampleThreats })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))
    await waitFor(() => expect(screen.getByDisplayValue('SQL Injection')).toBeInTheDocument())
  })

  it('shows a not-yet-analyzed message in the threats section before any analysis', () => {
    render(<App />)
    expect(screen.getByText(/run analyze/i)).toBeInTheDocument()
  })

  it('marks a threat row as selected when clicking a threat row', async () => {
    const twoThreats = [
      ...sampleThreats,
      { id: 't2', title: 'Identity Theft', category: StrideCategory.Spoofing, description: 'd', affectedId: 'c2', severity: 'low' as const }
    ]
    vi.mocked(generateThreatsStreaming).mockImplementation(async (_, __, onThreat) => { twoThreats.forEach(onThreat); return twoThreats })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))
    await waitFor(() => screen.getByDisplayValue('SQL Injection'))
    fireEvent.click(screen.getByDisplayValue('SQL Injection'))
    await waitFor(() =>
      expect(screen.getByDisplayValue('SQL Injection').closest('tr')).toHaveAttribute('aria-selected', 'true')
    )
    expect(screen.getByDisplayValue('Identity Theft').closest('tr')).not.toHaveAttribute('aria-selected', 'true')
  })

  it('marks the matching threat row as selected when a canvas element is tapped', async () => {
    const twoThreats = [
      ...sampleThreats,
      { id: 't2', title: 'Identity Theft', category: StrideCategory.Spoofing, description: 'd', affectedId: 'c2', severity: 'low' as const }
    ]
    vi.mocked(generateThreatsStreaming).mockImplementation(async (_, __, onThreat) => { twoThreats.forEach(onThreat); return twoThreats })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))
    await waitFor(() => screen.getByDisplayValue('SQL Injection'))
    act(() => { canvasMock.onElementSelected?.('c1') })
    await waitFor(() =>
      expect(screen.getByDisplayValue('SQL Injection').closest('tr')).toHaveAttribute('aria-selected', 'true')
    )
    expect(screen.getByDisplayValue('Identity Theft').closest('tr')).not.toHaveAttribute('aria-selected', 'true')
  })

  it('clears the selection when canvas background is tapped', async () => {
    vi.mocked(generateThreatsStreaming).mockImplementation(async (_, __, onThreat) => { sampleThreats.forEach(onThreat); return sampleThreats })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))
    await waitFor(() => screen.getByDisplayValue('SQL Injection'))
    act(() => { canvasMock.onElementSelected?.('c1') })
    act(() => { canvasMock.onElementSelected?.(null) })
    expect(screen.getByDisplayValue('SQL Injection').closest('tr')).not.toHaveAttribute('aria-selected', 'true')
  })
})

describe('App — Export', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      configurable: true
    })
    vi.clearAllMocks()
    mockElectronAPI.loadSettings.mockResolvedValue(null)
  })

  it('shows an Export PNG button', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /export png/i })).toBeInTheDocument()
  })

  it('shows an Export SVG button', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /export svg/i })).toBeInTheDocument()
  })

  it('shows an Export JSON button', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /export json/i })).toBeInTheDocument()
  })
})

describe('App — Error handling', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      configurable: true
    })
    vi.clearAllMocks()
    mockElectronAPI.loadSettings.mockResolvedValue(null)
  })

  it('shows an error message when diagram generation fails', async () => {
    vi.mocked(generateGraphFromDescription).mockRejectedValue(new Error('API error'))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /generate diagram/i }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A web app' } })
    fireEvent.click(screen.getByRole('button', { name: /^generate$/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  })

  it('shows an error message when STRIDE analysis fails', async () => {
    vi.mocked(generateThreatsStreaming).mockRejectedValue(new Error('API error'))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  })

  it('dismisses the error message when it is clicked', async () => {
    vi.mocked(generateThreatsStreaming).mockRejectedValue(new Error('API error'))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))
    await waitFor(() => screen.getByRole('alert'))
    fireEvent.click(screen.getByRole('alert'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('App — Analyze loading state', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      configurable: true
    })
    vi.clearAllMocks()
    mockElectronAPI.loadSettings.mockResolvedValue(null)
  })

  it('disables the Analyze button while analysis is in progress', async () => {
    let resolveAnalyze!: () => void
    vi.mocked(generateThreatsStreaming).mockReturnValue(
      new Promise(res => { resolveAnalyze = () => res([]) })
    )
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /analyz/i })).toBeDisabled())
    resolveAnalyze()
    await waitFor(() => expect(screen.getByRole('button', { name: /analyze/i })).not.toBeDisabled())
  })
})

describe('App — Side panel', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      configurable: true
    })
    vi.clearAllMocks()
    mockElectronAPI.loadSettings.mockResolvedValue(null)
  })

  it('shows PropertiesPanel when a canvas entity is selected', () => {
    render(<App />)
    act(() => { canvasMock.onElementSelected?.('c-browser') })
    expect(screen.getByDisplayValue('Browser')).toBeInTheDocument()
  })

  it('hides PropertiesPanel when the canvas background is tapped', () => {
    render(<App />)
    act(() => { canvasMock.onElementSelected?.('c-browser') })
    act(() => { canvasMock.onElementSelected?.(null) })
    expect(screen.queryByDisplayValue('Browser')).not.toBeInTheDocument()
  })

  it('closes PropertiesPanel when its close button is clicked', () => {
    render(<App />)
    act(() => { canvasMock.onElementSelected?.('c-browser') })
    expect(screen.getByDisplayValue('Browser')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(screen.queryByDisplayValue('Browser')).not.toBeInTheDocument()
  })

  it('shows ChatPanel inline (not as a fixed overlay) when Generate Diagram is clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /generate diagram/i }))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('textbox').closest('[style*="position: fixed"]')).toBeNull()
  })

  it('closes ChatPanel and shows PropertiesPanel when a canvas entity is selected while chat is open', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /generate diagram/i }))
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    act(() => { canvasMock.onElementSelected?.('c-browser') })
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('Browser')).toBeInTheDocument()
  })

  it('closes PropertiesPanel and opens ChatPanel when Generate Diagram is clicked while entity is selected', () => {
    render(<App />)
    act(() => { canvasMock.onElementSelected?.('c-browser') })
    expect(screen.getByDisplayValue('Browser')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /generate diagram/i }))
    expect(screen.queryByDisplayValue('Browser')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })
})

describe('App — Palette', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'electronAPI', { value: mockElectronAPI, writable: true, configurable: true })
    vi.clearAllMocks()
    mockElectronAPI.loadSettings.mockResolvedValue(null)
  })

  it('shows the palette panel by default', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /add zone/i })).toBeInTheDocument()
  })

  it('creates a zone with a default name and opens PropertiesPanel when Add Zone is clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /add zone/i }))
    expect(screen.getByDisplayValue('New Zone')).toBeInTheDocument()
  })

  it('enters zone-picking mode when Add Component is clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /add component/i }))
    expect(screen.getByText(/click a zone/i)).toBeInTheDocument()
  })

  it('creates a component in the clicked zone and opens PropertiesPanel', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /add component/i }))
    act(() => { canvasMock.onElementSelected?.('z-internal') })
    expect(screen.getByDisplayValue('New Component')).toBeInTheDocument()
  })

  it('returns to the palette when zone-picking is cancelled', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /add component/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.getByRole('button', { name: /add zone/i })).toBeInTheDocument()
  })

  it('enters flow drawing mode when Add Flow is clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /add flow/i }))
    expect(screen.getByText(/click a source component/i)).toBeInTheDocument()
  })

  it('advances to target selection after a source component is clicked on the canvas', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /add flow/i }))
    act(() => { canvasMock.onElementSelected?.('c-browser') })
    expect(screen.getByText(/click a target component/i)).toBeInTheDocument()
    expect(screen.getByText(/browser/i)).toBeInTheDocument()
  })

  it('creates a flow and opens PropertiesPanel when source and target are both selected', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /add flow/i }))
    act(() => { canvasMock.onElementSelected?.('c-browser') })
    act(() => { canvasMock.onElementSelected?.('c-lb') })
    expect(screen.getByDisplayValue('New Flow')).toBeInTheDocument()
  })

  it('returns to the palette when flow drawing is cancelled', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /add flow/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.getByRole('button', { name: /add zone/i })).toBeInTheDocument()
  })
})

describe('App — Context menu', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'electronAPI', { value: mockElectronAPI, writable: true, configurable: true })
    vi.clearAllMocks()
    mockElectronAPI.loadSettings.mockResolvedValue(null)
  })

  it('shows a context menu when a zone is right-clicked on the canvas', () => {
    render(<App />)
    act(() => { canvasMock.onElementRightClicked?.('z-internal', { x: 100, y: 200 }) })
    expect(screen.getByText(/add component in internal network/i)).toBeInTheDocument()
  })

  it('creates a component in the zone and opens PropertiesPanel when the context menu item is clicked', () => {
    render(<App />)
    act(() => { canvasMock.onElementRightClicked?.('z-internal', { x: 100, y: 200 }) })
    fireEvent.click(screen.getByText(/add component in internal network/i))
    expect(screen.getByDisplayValue('New Component')).toBeInTheDocument()
  })

  it('dismisses the context menu after clicking an item', () => {
    render(<App />)
    act(() => { canvasMock.onElementRightClicked?.('z-internal', { x: 100, y: 200 }) })
    fireEvent.click(screen.getByText(/add component in internal network/i))
    expect(screen.queryByText(/add component in internal network/i)).not.toBeInTheDocument()
  })
})

describe('App — Threats toggle', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'electronAPI', { value: mockElectronAPI, writable: true, configurable: true })
    vi.clearAllMocks()
    mockElectronAPI.loadSettings.mockResolvedValue(null)
  })

  it('shows a Threats toggle button in the toolbar', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /toggle threats/i })).toBeInTheDocument()
  })

  it('threats panel is visible by default', () => {
    render(<App />)
    expect(screen.getByText(/run analyze/i)).toBeInTheDocument()
  })

  it('hides the threats panel when the toggle button is clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /toggle threats/i }))
    expect(screen.queryByText(/run analyze/i)).not.toBeInTheDocument()
  })

  it('shows the threats panel again when the toggle is clicked a second time', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /toggle threats/i }))
    fireEvent.click(screen.getByRole('button', { name: /toggle threats/i }))
    expect(screen.getByText(/run analyze/i)).toBeInTheDocument()
  })

  it('hides the canvas-threats resize handle when threats panel is toggled off', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /toggle threats/i }))
    expect(screen.queryByTestId('canvas-threats-resize')).not.toBeInTheDocument()
  })
})

describe('App — Loading indicator', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'electronAPI', { value: mockElectronAPI, writable: true, configurable: true })
    vi.clearAllMocks()
    mockElectronAPI.loadSettings.mockResolvedValue(null)
  })

  it('shows a loading indicator while analysis is in progress', async () => {
    let resolveAnalyze!: () => void
    vi.mocked(generateThreatsStreaming).mockReturnValue(new Promise(res => { resolveAnalyze = () => res([]) }))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())
    resolveAnalyze()
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
  })

  it('shows a loading indicator while diagram generation is in progress', async () => {
    let resolveGenerate!: (g: Graph) => void
    vi.mocked(generateGraphFromDescription).mockReturnValue(new Promise(res => { resolveGenerate = res }))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /generate diagram/i }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A web app' } })
    fireEvent.click(screen.getByRole('button', { name: /^generate$/i }))
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())
    resolveGenerate(minimalGraph)
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
  })
})

describe('App — Resizable panels', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'electronAPI', { value: mockElectronAPI, writable: true, configurable: true })
    vi.clearAllMocks()
    mockElectronAPI.loadSettings.mockResolvedValue(null)
  })

  it('renders a resize handle between canvas and threats panel', () => {
    render(<App />)
    expect(screen.getByTestId('canvas-threats-resize')).toBeInTheDocument()
  })

  it('renders a resize handle between content area and sidebar', () => {
    render(<App />)
    expect(screen.getByTestId('content-sidebar-resize')).toBeInTheDocument()
  })
})

describe('App — Position persistence', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'electronAPI', { value: mockElectronAPI, writable: true, configurable: true })
    vi.clearAllMocks()
    mockElectronAPI.loadSettings.mockResolvedValue(null)
  })

  it('does not add a position change to the undo stack', () => {
    render(<App />)
    act(() => { canvasMock.onPositionChanged?.('z-internet', { x: 50, y: 50 }) })
    expect(screen.getByRole('button', { name: /undo/i })).toBeDisabled()
  })

  it('saves updated zone position when Save is clicked after a position change', async () => {
    render(<App />)
    act(() => { canvasMock.onPositionChanged?.('z-internet', { x: 50, y: 100 }) })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(mockElectronAPI.saveGraph).toHaveBeenCalled())
    const saved = JSON.parse(mockElectronAPI.saveGraph.mock.calls[0][0] as string) as {
      graph: { zones: Array<{ id: string; position?: { x: number; y: number } }> }
    }
    const zone = saved.graph.zones.find(z => z.id === 'z-internet')
    expect(zone?.position).toEqual({ x: 50, y: 100 })
  })
})

describe('App — Undo / Redo', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      configurable: true
    })
    vi.clearAllMocks()
    mockElectronAPI.loadSettings.mockResolvedValue(null)
  })

  it('shows Undo and Redo buttons in the header', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /redo/i })).toBeInTheDocument()
  })

  it('Undo button is disabled when there is no history', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /undo/i })).toBeDisabled()
  })

  it('Redo button is disabled when there is no future history', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /redo/i })).toBeDisabled()
  })

  it('Undo becomes enabled after a diagram is generated', async () => {
    vi.mocked(generateGraphFromDescription).mockResolvedValue(minimalGraph)
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /generate diagram/i }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A web app' } })
    fireEvent.click(screen.getByRole('button', { name: /^generate$/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /undo/i })).not.toBeDisabled())
  })

  it('Redo becomes enabled after Undo is clicked', async () => {
    vi.mocked(generateGraphFromDescription).mockResolvedValue(minimalGraph)
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /generate diagram/i }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A web app' } })
    fireEvent.click(screen.getByRole('button', { name: /^generate$/i }))
    await waitFor(() => screen.getByRole('button', { name: /undo/i }))
    fireEvent.click(screen.getByRole('button', { name: /undo/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /redo/i })).not.toBeDisabled())
  })
})
