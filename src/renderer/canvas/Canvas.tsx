import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import cytoscape from 'cytoscape'
import type { LayoutOptions } from 'cytoscape'
import dagre from 'cytoscape-dagre'
import coseBilkent from 'cytoscape-cose-bilkent'
import type { Graph } from '../model/graph'
import { toElements } from './elements'
import { layoutOptions } from './layout'
import { cytoscapeStyle } from './style'

cytoscape.use(dagre)
cytoscape.use(coseBilkent)

export type CanvasHandle = {
  getCy: () => cytoscape.Core | null
}

type Props = {
  graph: Graph
  onElementSelected?: (id: string | null) => void
  onElementRightClicked?: (id: string, position: { x: number; y: number }) => void
  onPositionChanged?: (id: string, position: { x: number; y: number }) => void
}

const Canvas = forwardRef<CanvasHandle, Props>(function Canvas(
  { graph, onElementSelected, onElementRightClicked, onPositionChanged },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)
  const prevGraphRef = useRef(graph)

  useImperativeHandle(ref, () => ({
    getCy: () => cyRef.current
  }))

  // Create cy once on mount, destroy on unmount; wire right-click drag panning
  useEffect(() => {
    if (containerRef.current === null) return
    const container = containerRef.current
    const elements = toElements(graph)
    const nodes = elements.filter(el => el.group === 'nodes')
    const allNodesPositioned = nodes.length > 0 && nodes.every(el => 'position' in el)
    const cy = cytoscape({
      container,
      elements,
      style: cytoscapeStyle()
    })
    cy.layout(allNodesPositioned ? ({ name: 'preset' } as LayoutOptions) : layoutOptions()).run()
    cyRef.current = cy

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

    return () => {
      container.removeEventListener('mousedown', onMouseDown)
      cy.destroy()
      cyRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Register event listeners; re-register when callbacks change
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
          onElementRightClicked(evt.target.id() as string, { x: oe.clientX, y: oe.clientY })
        }
      : undefined
    const dragfreeHandler = onPositionChanged !== undefined
      ? (evt: cytoscape.EventObject) => {
          const pos = evt.target.position() as { x: number; y: number }
          onPositionChanged(evt.target.id() as string, pos)
        }
      : undefined

    if (tapNodeHandler !== undefined) cy.on('tap', 'node, edge', tapNodeHandler)
    if (tapBgHandler !== undefined) cy.on('tap', tapBgHandler)
    if (cxttapHandler !== undefined) cy.on('cxttap', 'node', cxttapHandler)
    if (dragfreeHandler !== undefined) cy.on('dragfree', 'node', dragfreeHandler)

    return () => {
      if (tapNodeHandler !== undefined) cy.off('tap', 'node, edge', tapNodeHandler)
      if (tapBgHandler !== undefined) cy.off('tap', tapBgHandler)
      if (cxttapHandler !== undefined) cy.off('cxttap', 'node', cxttapHandler)
      if (dragfreeHandler !== undefined) cy.off('dragfree', 'node', dragfreeHandler)
    }
  }, [onElementSelected, onElementRightClicked, onPositionChanged])

  // Apply incremental graph updates without recreating cy
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

    // Remove elements that no longer exist
    prevIds.forEach(id => {
      if (!newIds.has(id)) cy.getElementById(id).remove()
    })

    // Add new elements and re-run layout with randomize: false so existing positions are preserved
    const toAdd = newElements.filter(el => !prevIds.has(el.data.id as string))
    if (toAdd.length > 0) {
      cy.add(toAdd)
      cy.layout(layoutOptions()).run()
    }

    // Update data and CSS classes for existing elements
    newElements.forEach(el => {
      if (prevIds.has(el.data.id as string)) {
        const ele = cy.getElementById(el.data.id as string)
        ele.data(el.data)
        ele.classes(el.classes ?? '')
      }
    })

    prevGraphRef.current = graph
  }, [graph])

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Diagram canvas"
      style={{ width: '100%', height: '100%' }}
    />
  )
})

export default Canvas
