import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import cytoscape from 'cytoscape'
import type { LayoutOptions, NodeSingular } from 'cytoscape'
import dagre from 'cytoscape-dagre'
import coseBilkent from 'cytoscape-cose-bilkent'
import type { Graph } from '../model/graph'
import { toElements } from './elements'
import { layoutOptions } from './layout'
import { cytoscapeStyle } from './style'
import { useTheme, fonts } from '../ui/tokens'
import { ICON_PATHS } from './shapes'
import { bezierControlFor, geometricMidpoint, graphToRendered, renderedToGraph } from './boundary'
import type { Point } from './boundary'
import type { Theme } from '../ui/tokens'

cytoscape.use(dagre)
cytoscape.use(coseBilkent)

export type CanvasHandle = {
  getCy: () => cytoscape.Core | null
}

type FlowEndpoint = 'source' | 'target'
export type BoundaryHandle = 'start' | 'mid' | 'end'

type Props = {
  graph: Graph
  onElementSelected?: (id: string | null) => void
  onElementRightClicked?: (id: string | null, position: { x: number; y: number }) => void
  onPositionChanged?: (id: string, position: { x: number; y: number }) => void
  onFlowEndpointChanged?: (flowId: string, end: FlowEndpoint, newComponentId: string) => void
  onBoundaryHandleMoved?: (zoneId: string, which: BoundaryHandle, position: { x: number; y: number }) => void
  onBoundaryStraighten?: (zoneId: string) => void
}

type OverlayNode = {
  id: string
  x: number
  y: number
  w: number
  h: number
  cyShape: string
  icon: string | undefined
}

type RewireState = {
  fixedX: number
  fixedY: number
  cursorX: number
  cursorY: number
}

type OverlayBoundary = {
  id: string
  name: string
  sx: number; sy: number
  mx: number; my: number
  ex: number; ey: number
  hasCurve: boolean
}

type OverlayLayerProps = {
  nodes: OverlayNode[]
  boundaries: OverlayBoundary[]
  theme: Theme
  rewire: RewireState | null
  onBoundarySelect: (id: string) => void
  onBoundaryHandleDown: (id: string, which: BoundaryHandle, e: React.MouseEvent) => void
  onBoundaryMidDoubleClick: (id: string) => void
}

const OverlayLayer = ({ nodes, boundaries, theme, rewire, onBoundarySelect, onBoundaryHandleDown, onBoundaryMidDoubleClick }: OverlayLayerProps) => (
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
    {nodes.map(n => (
      <div key={n.id} style={{ position: 'absolute', left: n.x, top: n.y, width: n.w, height: n.h }}>
        {n.cyShape === 'open' && (
          <svg width={n.w} height={n.h} style={{ position: 'absolute', top: 0, left: 0 }}>
            <line x1={0} y1={0.75} x2={n.w} y2={0.75} stroke={theme.nodeStroke} strokeWidth={1.5} />
            <line x1={0} y1={n.h - 0.75} x2={n.w} y2={n.h - 0.75} stroke={theme.nodeStroke} strokeWidth={1.5} />
          </svg>
        )}
        {n.icon !== undefined && ICON_PATHS[n.icon] !== undefined && (
          <svg
            width={14} height={14} viewBox="0 0 18 18"
            style={{
              position: 'absolute',
              ...(n.cyShape === 'circle'
                ? { right: n.w * 0.15, bottom: n.h * 0.15 }
                : { right: 6, bottom: 4 }),
              color: theme.iconColor,
              overflow: 'visible',
            }}
          >
            <g
              fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"
              dangerouslySetInnerHTML={{ __html: ICON_PATHS[n.icon]! }}
            />
          </svg>
        )}
      </div>
    ))}
    {boundaries.length > 0 && (
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {boundaries.map(b => {
          const ctrl = bezierControlFor({ x: b.sx, y: b.sy }, { x: b.mx, y: b.my }, { x: b.ex, y: b.ey })
          const d = `M ${b.sx},${b.sy} Q ${ctrl.x},${ctrl.y} ${b.ex},${b.ey}`
          return (
            <g key={b.id}>
              <path
                d={d}
                fill="none"
                stroke="transparent"
                strokeWidth={12}
                style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                onClick={() => onBoundarySelect(b.id)}
              />
              <path
                d={d}
                fill="none"
                stroke={theme.edgeUntrusted}
                strokeWidth={1.5}
                strokeDasharray="6,4"
                style={{ pointerEvents: 'none' }}
              />
              <text
                x={b.sx + 6} y={b.sy - 6}
                style={{
                  pointerEvents: 'none',
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  fontWeight: 500,
                  fill: theme.edgeUntrusted,
                  textTransform: 'uppercase',
                }}
              >
                {b.name}
              </text>
              <circle
                cx={b.sx} cy={b.sy} r={6}
                fill={theme.accent}
                stroke={theme.bgAlt}
                strokeWidth={2}
                style={{ pointerEvents: 'auto', cursor: 'grab' }}
                onMouseDown={e => onBoundaryHandleDown(b.id, 'start', e)}
              />
              <circle
                cx={b.mx} cy={b.my} r={6}
                fill={theme.accent}
                stroke={theme.bgAlt}
                strokeWidth={2}
                style={{ pointerEvents: 'auto', cursor: 'grab' }}
                onMouseDown={e => onBoundaryHandleDown(b.id, 'mid', e)}
                onDoubleClick={() => onBoundaryMidDoubleClick(b.id)}
              />
              <circle
                cx={b.ex} cy={b.ey} r={6}
                fill={theme.accent}
                stroke={theme.bgAlt}
                strokeWidth={2}
                style={{ pointerEvents: 'auto', cursor: 'grab' }}
                onMouseDown={e => onBoundaryHandleDown(b.id, 'end', e)}
              />
            </g>
          )
        })}
      </svg>
    )}
    {rewire !== null && (
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <line
          x1={rewire.fixedX} y1={rewire.fixedY}
          x2={rewire.cursorX} y2={rewire.cursorY}
          stroke={theme.accent}
          strokeWidth={1.75}
          strokeDasharray="6,4"
        />
      </svg>
    )}
  </div>
)

const Canvas = forwardRef<CanvasHandle, Props>(function Canvas(
  { graph, onElementSelected, onElementRightClicked, onPositionChanged, onFlowEndpointChanged, onBoundaryHandleMoved, onBoundaryStraighten },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)
  const prevGraphRef = useRef(graph)
  const theme = useTheme()
  const [overlayNodes, setOverlayNodes] = useState<OverlayNode[]>([])
  const [overlayBoundaries, setOverlayBoundaries] = useState<OverlayBoundary[]>([])
  const [rewire, setRewire] = useState<RewireState | null>(null)
  const onFlowEndpointChangedRef = useRef(onFlowEndpointChanged)
  onFlowEndpointChangedRef.current = onFlowEndpointChanged
  const onBoundaryHandleMovedRef = useRef(onBoundaryHandleMoved)
  onBoundaryHandleMovedRef.current = onBoundaryHandleMoved
  const onBoundaryStraightenRef = useRef(onBoundaryStraighten)
  onBoundaryStraightenRef.current = onBoundaryStraighten
  const onElementSelectedRef = useRef(onElementSelected)
  onElementSelectedRef.current = onElementSelected
  const graphRef = useRef(graph)
  graphRef.current = graph

  useImperativeHandle(ref, () => ({
    getCy: () => cyRef.current
  }))

  const handleBoundarySelect = useCallback((id: string) => {
    onElementSelectedRef.current?.(id)
  }, [])

  const handleBoundaryHandleDown = useCallback((id: string, which: BoundaryHandle, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const cy = cyRef.current
    const container = containerRef.current
    if (cy === null || container === null) return
    const containerRect = container.getBoundingClientRect()
    const onMove = (me: MouseEvent) => {
      const pan = cy.pan?.() ?? { x: 0, y: 0 }
      const zoom = cy.zoom?.() ?? 1
      const graphPos = renderedToGraph(
        { x: me.clientX - containerRect.left, y: me.clientY - containerRect.top },
        pan,
        zoom
      )
      onBoundaryHandleMovedRef.current?.(id, which, graphPos)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  const handleBoundaryMidDoubleClick = useCallback((id: string) => {
    onBoundaryStraightenRef.current?.(id)
  }, [])

  const updateOverlay = useCallback(() => {
    const cy = cyRef.current
    if (cy === null) return
    const nodes: OverlayNode[] = []
    cy.nodes().forEach((n: NodeSingular) => {
      const cyShape = n.data('cyShape') as string | undefined
      if (cyShape === undefined) return
      const icon = n.data('icon') as string | undefined
      const bb = n.renderedBoundingBox({ includeLabels: false })
      nodes.push({
        id: n.id(),
        x: bb.x1,
        y: bb.y1,
        w: bb.x2 - bb.x1,
        h: bb.y2 - bb.y1,
        cyShape,
        icon,
      })
    })
    setOverlayNodes(nodes)

    const pan = cy.pan?.() ?? { x: 0, y: 0 }
    const zoom = cy.zoom?.() ?? 1
    const boundaries: OverlayBoundary[] = []
    for (const z of graphRef.current.zones) {
      if (z.shape !== 'line' || z.position === undefined || z.endPosition === undefined) continue
      const start = graphToRendered(z.position, pan, zoom)
      const end = graphToRendered(z.endPosition, pan, zoom)
      const mid = z.midPosition !== undefined
        ? graphToRendered(z.midPosition, pan, zoom)
        : geometricMidpoint(start, end)
      boundaries.push({
        id: z.id, name: z.name,
        sx: start.x, sy: start.y,
        mx: mid.x, my: mid.y,
        ex: end.x, ey: end.y,
        hasCurve: z.midPosition !== undefined,
      })
    }
    setOverlayBoundaries(boundaries)
  }, [])

  useEffect(() => {
    if (containerRef.current === null) return
    const container = containerRef.current
    const elements = toElements(graph)
    const nodes = elements.filter(el => el.group === 'nodes')
    const allNodesPositioned = nodes.length > 0 && nodes.every(el => 'position' in el)
    const cy = cytoscape({
      container,
      elements,
      style: cytoscapeStyle(theme)
    })
    cy.layout(allNodesPositioned ? ({ name: 'preset' } as LayoutOptions) : layoutOptions()).run()
    cyRef.current = cy

    const scheduleOverlay = () => requestAnimationFrame(updateOverlay)
    cy.on('render', scheduleOverlay)
    scheduleOverlay()

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 2) return
      e.preventDefault()
      let lastX = e.clientX
      let lastY = e.clientY

      const onMouseMove = (me: MouseEvent) => {
        const dx = me.clientX - lastX
        const dy = me.clientY - lastY
        lastX = me.clientX
        lastY = me.clientY
        cyRef.current?.panBy({ x: dx, y: dy })
      }

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    }

    container.addEventListener('mousedown', onMouseDown)

    const onEdgeMouseDown = (evt: cytoscape.EventObject) => {
      const oe = evt.originalEvent as MouseEvent
      if (oe.button !== 0) return
      const edge = evt.target
      const flowId = edge.id() as string
      const containerRect = container.getBoundingClientRect()
      const startCX = oe.clientX
      const startCY = oe.clientY
      const grabRX = startCX - containerRect.left
      const grabRY = startCY - containerRect.top

      const srcBB = edge.source().renderedBoundingBox()
      const tgtBB = edge.target().renderedBoundingBox()
      const srcCenter = { x: (srcBB.x1 + srcBB.x2) / 2, y: (srcBB.y1 + srcBB.y2) / 2 }
      const tgtCenter = { x: (tgtBB.x1 + tgtBB.x2) / 2, y: (tgtBB.y1 + tgtBB.y2) / 2 }
      const d2src = Math.hypot(grabRX - srcCenter.x, grabRY - srcCenter.y)
      const d2tgt = Math.hypot(grabRX - tgtCenter.x, grabRY - tgtCenter.y)
      const grabbedEnd: FlowEndpoint = d2src < d2tgt ? 'source' : 'target'
      const fixed = grabbedEnd === 'source' ? tgtCenter : srcCenter

      let dragging = false

      const onMove = (me: MouseEvent) => {
        const moved = Math.hypot(me.clientX - startCX, me.clientY - startCY)
        if (!dragging && moved < 4) return
        if (!dragging) {
          dragging = true
          cy.userPanningEnabled(false)
          cy.boxSelectionEnabled(false)
          cy.getElementById(flowId).addClass('rewiring')
        }
        setRewire({
          fixedX: fixed.x,
          fixedY: fixed.y,
          cursorX: me.clientX - containerRect.left,
          cursorY: me.clientY - containerRect.top,
        })
      }

      const onUp = (me: MouseEvent) => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        if (!dragging) return
        cy.userPanningEnabled(true)
        cy.boxSelectionEnabled(true)
        cy.getElementById(flowId).removeClass('rewiring')
        setRewire(null)

        const upX = me.clientX - containerRect.left
        const upY = me.clientY - containerRect.top
        let dropTargetId: string | null = null
        cy.nodes().forEach((n: NodeSingular) => {
          if (n.isParent()) return
          const bb = n.renderedBoundingBox({ includeLabels: false })
          if (upX >= bb.x1 && upX <= bb.x2 && upY >= bb.y1 && upY <= bb.y2) {
            dropTargetId = n.id() as string
          }
        })
        if (dropTargetId !== null) {
          onFlowEndpointChangedRef.current?.(flowId, grabbedEnd, dropTargetId)
        }
      }

      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    }

    cy.on('mousedown', 'edge', onEdgeMouseDown)

    return () => {
      container.removeEventListener('mousedown', onMouseDown)
      cy.off('mousedown', 'edge', onEdgeMouseDown)
      cy.off('render', scheduleOverlay)
      cy.destroy()
      cyRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const cy = cyRef.current
    if (cy === null) return
    cy.style().fromJson(cytoscapeStyle(theme)).update()
  }, [theme])

  useEffect(() => {
    const cy = cyRef.current
    if (cy === null) return

    const tapNodeHandler = onElementSelected !== undefined
      ? (evt: cytoscape.EventObject) => { onElementSelected(evt.target.id() as string) }
      : undefined
    const tapBgHandler = onElementSelected !== undefined
      ? (evt: cytoscape.EventObject) => { if (evt.target === cy) onElementSelected(null) }
      : undefined
    const cxttapHandler = onElementRightClicked !== undefined
      ? (evt: cytoscape.EventObject) => {
          const oe = evt.originalEvent as MouseEvent
          const id = evt.target === cy ? null : (evt.target.id() as string)
          onElementRightClicked(id, { x: oe.clientX, y: oe.clientY })
        }
      : undefined
    let positionTimer: ReturnType<typeof setTimeout> | null = null
    const positionHandler = onPositionChanged !== undefined
      ? (evt: cytoscape.EventObject) => {
          if (positionTimer !== null) clearTimeout(positionTimer)
          positionTimer = setTimeout(() => {
            cy.nodes().forEach((n: cytoscape.NodeSingular) => {
              const p = n.position()
              onPositionChanged(n.id() as string, { x: p.x, y: p.y })
            })
            positionTimer = null
          }, 200)
        }
      : undefined

    if (tapNodeHandler !== undefined) cy.on('tap', 'node, edge', tapNodeHandler)
    if (tapBgHandler !== undefined) cy.on('tap', tapBgHandler)
    if (cxttapHandler !== undefined) cy.on('cxttap', cxttapHandler)
    if (positionHandler !== undefined) cy.on('drag', 'node', positionHandler)

    return () => {
      if (tapNodeHandler !== undefined) cy.off('tap', 'node, edge', tapNodeHandler)
      if (tapBgHandler !== undefined) cy.off('tap', tapBgHandler)
      if (cxttapHandler !== undefined) cy.off('cxttap', cxttapHandler)
      if (positionHandler !== undefined) cy.off('drag', 'node', positionHandler)
      if (positionTimer !== null) clearTimeout(positionTimer)
    }
  }, [onElementSelected, onElementRightClicked, onPositionChanged])

  useEffect(() => {
    const cy = cyRef.current
    if (cy === null) return

    const prev = prevGraphRef.current
    const prevIds = new Set([
      ...prev.zones.map(z => z.id),
      ...prev.components.map(c => c.id),
      ...prev.flows.map(f => f.id)
    ])

    const newElements = toElements(graph)
    const newIds = new Set(newElements.map(el => el.data.id as string))

    prevIds.forEach(id => {
      if (!newIds.has(id)) cy.getElementById(id).remove()
    })

    const toAdd = newElements.filter(el => !prevIds.has(el.data.id as string))
    if (toAdd.length > 0) {
      cy.add(toAdd)
      cy.layout(layoutOptions()).run()
    }

    newElements.forEach(el => {
      if (prevIds.has(el.data.id as string)) {
        const ele = cy.getElementById(el.data.id as string)
        if (ele.isEdge()) {
          const newSource = el.data.source as string | undefined
          const newTarget = el.data.target as string | undefined
          if (newSource !== undefined && newTarget !== undefined) {
            const oldSource = ele.source().id() as string
            const oldTarget = ele.target().id() as string
            if (oldSource !== newSource || oldTarget !== newTarget) {
              ele.move({ source: newSource, target: newTarget })
            }
          }
        }
        ele.data(el.data)
        ele.classes(el.classes ?? '')
        if ('position' in el && el.position !== undefined) {
          ele.position(el.position)
        }
      }
    })

    prevGraphRef.current = graph
    requestAnimationFrame(updateOverlay)
  }, [graph, updateOverlay])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={containerRef}
        role="region"
        aria-label="Diagram canvas"
        style={{
          width: '100%', height: '100%',
          backgroundImage: `radial-gradient(${theme.gridColor} 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
      <OverlayLayer
        nodes={overlayNodes}
        boundaries={overlayBoundaries}
        theme={theme}
        rewire={rewire}
        onBoundarySelect={handleBoundarySelect}
        onBoundaryHandleDown={handleBoundaryHandleDown}
        onBoundaryMidDoubleClick={handleBoundaryMidDoubleClick}
      />
    </div>
  )
})

export default Canvas
