// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import PropertiesPanel from './PropertiesPanel'
import { ComponentType, FlowDirection, GraphSchema } from '../model/graph'
import type { Graph } from '../model/graph'

const graph: Graph = GraphSchema.parse({
  id: 'g1',
  name: 'My System',
  zones: [
    { id: 'z1', name: 'Internal', description: 'Internal network' },
    { id: 'z2', name: 'DMZ' }
  ],
  components: [
    { id: 'c1', name: 'API Server', type: ComponentType.Process, zoneId: 'z1', icon: 'server' },
    { id: 'c2', name: 'Database', type: ComponentType.DataStore, zoneId: 'z1' }
  ],
  flows: [
    { id: 'f1', name: 'SQL Query', originatorId: 'c1', targetId: 'c2', direction: FlowDirection.Bidirectional }
  ]
})

const noop = vi.fn()

describe('PropertiesPanel — Zone', () => {
  it('shows the zone name as an editable input', () => {
    render(<PropertiesPanel graph={graph} elementId="z1" onUpdate={noop} onClose={noop} />)
    expect(screen.getByDisplayValue('Internal')).toBeInTheDocument()
  })

  it('shows the zone description as an editable input', () => {
    render(<PropertiesPanel graph={graph} elementId="z1" onUpdate={noop} onClose={noop} />)
    expect(screen.getByDisplayValue('Internal network')).toBeInTheDocument()
  })

  it('calls onUpdate with updated graph when zone name changes', () => {
    const onUpdate = vi.fn()
    render(<PropertiesPanel graph={graph} elementId="z1" onUpdate={onUpdate} onClose={noop} />)
    fireEvent.change(screen.getByDisplayValue('Internal'), { target: { value: 'Private' } })
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        zones: expect.arrayContaining([
          expect.objectContaining({ id: 'z1', name: 'Private' })
        ])
      })
    )
  })

  it('shows a parent zone selector with "None" as first option', () => {
    render(<PropertiesPanel graph={graph} elementId="z1" onUpdate={noop} onClose={noop} />)
    const select = screen.getByRole('combobox', { name: /parent zone/i })
    expect(select).toBeInTheDocument()
    expect(select.querySelector('option[value=""]')).toBeInTheDocument()
  })

  it('shows other zones as parent zone options (excluding itself)', () => {
    render(<PropertiesPanel graph={graph} elementId="z1" onUpdate={noop} onClose={noop} />)
    const select = screen.getByRole('combobox', { name: /parent zone/i })
    expect(select.querySelector('option[value="z2"]')).toBeInTheDocument()
    expect(select.querySelector('option[value="z1"]')).toBeNull()
  })

  it('calls onUpdate with parentId when parent zone is changed', () => {
    const onUpdate = vi.fn()
    render(<PropertiesPanel graph={graph} elementId="z1" onUpdate={onUpdate} onClose={noop} />)
    fireEvent.change(screen.getByRole('combobox', { name: /parent zone/i }), { target: { value: 'z2' } })
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        zones: expect.arrayContaining([expect.objectContaining({ id: 'z1', parentId: 'z2' })])
      })
    )
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<PropertiesPanel graph={graph} elementId="z1" onUpdate={noop} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows a Shape select with Rectangle as the default', () => {
    render(<PropertiesPanel graph={graph} elementId="z1" onUpdate={noop} onClose={noop} />)
    const select = screen.getByRole('combobox', { name: /shape/i })
    expect(select).toHaveValue('rect')
  })

  it('switches the zone shape to line and synthesizes endPosition when chosen', () => {
    const onUpdate = vi.fn()
    render(<PropertiesPanel graph={graph} elementId="z1" onUpdate={onUpdate} onClose={noop} />)
    fireEvent.change(screen.getByRole('combobox', { name: /shape/i }), { target: { value: 'line' } })
    const updated = onUpdate.mock.calls[0]?.[0].zones.find((z: { id: string }) => z.id === 'z1')
    expect(updated.shape).toBe('line')
    expect(updated.endPosition).toBeDefined()
    expect(typeof updated.endPosition.x).toBe('number')
    expect(typeof updated.endPosition.y).toBe('number')
  })

  it('drops endPosition and midPosition when switching shape back to rectangle', () => {
    const lineGraph = {
      ...graph,
      zones: [{ ...graph.zones[0]!, shape: 'line' as const, position: { x: 0, y: 0 }, endPosition: { x: 100, y: 0 }, midPosition: { x: 50, y: 50 } }, graph.zones[1]!]
    }
    const onUpdate = vi.fn()
    render(<PropertiesPanel graph={lineGraph} elementId="z1" onUpdate={onUpdate} onClose={noop} />)
    fireEvent.change(screen.getByRole('combobox', { name: /shape/i }), { target: { value: 'rect' } })
    const updated = onUpdate.mock.calls[0]?.[0].zones.find((z: { id: string }) => z.id === 'z1')
    expect(updated.shape).toBe('rect')
    expect(updated.endPosition).toBeUndefined()
    expect(updated.midPosition).toBeUndefined()
  })

  it('hides the Parent Zone selector when shape is line', () => {
    const lineGraph = {
      ...graph,
      zones: [{ ...graph.zones[0]!, shape: 'line' as const, position: { x: 0, y: 0 }, endPosition: { x: 100, y: 0 } }, graph.zones[1]!]
    }
    render(<PropertiesPanel graph={lineGraph} elementId="z1" onUpdate={noop} onClose={noop} />)
    expect(screen.queryByRole('combobox', { name: /parent zone/i })).not.toBeInTheDocument()
  })
})

describe('PropertiesPanel — Component', () => {
  it('shows the component name as an editable input', () => {
    render(<PropertiesPanel graph={graph} elementId="c1" onUpdate={noop} onClose={noop} />)
    expect(screen.getByDisplayValue('API Server')).toBeInTheDocument()
  })

  it('shows the component type as a select', () => {
    render(<PropertiesPanel graph={graph} elementId="c1" onUpdate={noop} onClose={noop} />)
    const select = screen.getByRole('combobox', { name: /type/i })
    expect(select).toHaveValue(ComponentType.Process)
  })

  it('shows all component type options', () => {
    render(<PropertiesPanel graph={graph} elementId="c1" onUpdate={noop} onClose={noop} />)
    const select = screen.getByRole('combobox', { name: /type/i })
    expect(select.querySelectorAll('option')).toHaveLength(Object.keys(ComponentType).length)
  })

  it('shows a zone selector with current zone selected', () => {
    render(<PropertiesPanel graph={graph} elementId="c1" onUpdate={noop} onClose={noop} />)
    const select = screen.getByRole('combobox', { name: /zone/i })
    expect(select).toHaveValue('z1')
  })

  it('lists all zones as options in the zone selector', () => {
    render(<PropertiesPanel graph={graph} elementId="c1" onUpdate={noop} onClose={noop} />)
    expect(screen.getByRole('option', { name: 'Internal' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'DMZ' })).toBeInTheDocument()
  })

  it('calls onUpdate when component name changes', () => {
    const onUpdate = vi.fn()
    render(<PropertiesPanel graph={graph} elementId="c1" onUpdate={onUpdate} onClose={noop} />)
    fireEvent.change(screen.getByDisplayValue('API Server'), { target: { value: 'Gateway' } })
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        components: expect.arrayContaining([
          expect.objectContaining({ id: 'c1', name: 'Gateway' })
        ])
      })
    )
  })

  it('calls onUpdate when component type changes', () => {
    const onUpdate = vi.fn()
    render(<PropertiesPanel graph={graph} elementId="c1" onUpdate={onUpdate} onClose={noop} />)
    fireEvent.change(screen.getByRole('combobox', { name: /type/i }), {
      target: { value: ComponentType.External }
    })
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        components: expect.arrayContaining([
          expect.objectContaining({ id: 'c1', type: ComponentType.External })
        ])
      })
    )
  })

  it('clears the icon when component type changes (icons are scoped per type)', () => {
    const onUpdate = vi.fn()
    render(<PropertiesPanel graph={graph} elementId="c1" onUpdate={onUpdate} onClose={noop} />)
    fireEvent.change(screen.getByRole('combobox', { name: /type/i }), {
      target: { value: ComponentType.External }
    })
    const updated = onUpdate.mock.calls[0]?.[0].components.find((c: { id: string }) => c.id === 'c1')
    expect(updated.icon).toBeUndefined()
  })

  it('shows the icon picker with the current icon selected', () => {
    render(<PropertiesPanel graph={graph} elementId="c1" onUpdate={noop} onClose={noop} />)
    const select = screen.getByRole('combobox', { name: /icon/i })
    expect(select).toHaveValue('server')
  })

  it('offers a "(none)" icon option so the icon can be cleared', () => {
    render(<PropertiesPanel graph={graph} elementId="c1" onUpdate={noop} onClose={noop} />)
    const select = screen.getByRole('combobox', { name: /icon/i })
    expect(select.querySelector('option[value=""]')).toBeInTheDocument()
  })

  it('limits icon options to those valid for the component type', () => {
    render(<PropertiesPanel graph={graph} elementId="c1" onUpdate={noop} onClose={noop} />)
    const select = screen.getByRole('combobox', { name: /icon/i })
    expect(select.querySelector('option[value="server"]')).toBeInTheDocument()
    expect(select.querySelector('option[value="cog"]')).toBeInTheDocument()
    expect(select.querySelector('option[value="worker"]')).toBeInTheDocument()
    expect(select.querySelector('option[value="database"]')).toBeNull()
  })

  it('calls onUpdate with the chosen icon when icon changes', () => {
    const onUpdate = vi.fn()
    render(<PropertiesPanel graph={graph} elementId="c1" onUpdate={onUpdate} onClose={noop} />)
    fireEvent.change(screen.getByRole('combobox', { name: /icon/i }), {
      target: { value: 'cog' }
    })
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        components: expect.arrayContaining([
          expect.objectContaining({ id: 'c1', icon: 'cog' })
        ])
      })
    )
  })

  it('calls onUpdate clearing the icon when "(none)" is chosen', () => {
    const onUpdate = vi.fn()
    render(<PropertiesPanel graph={graph} elementId="c1" onUpdate={onUpdate} onClose={noop} />)
    fireEvent.change(screen.getByRole('combobox', { name: /icon/i }), {
      target: { value: '' }
    })
    const updated = onUpdate.mock.calls[0]?.[0].components.find((c: { id: string }) => c.id === 'c1')
    expect(updated.icon).toBeUndefined()
  })

  it('calls onUpdate when zone is reassigned', () => {
    const onUpdate = vi.fn()
    render(<PropertiesPanel graph={graph} elementId="c1" onUpdate={onUpdate} onClose={noop} />)
    fireEvent.change(screen.getByRole('combobox', { name: /zone/i }), {
      target: { value: 'z2' }
    })
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        components: expect.arrayContaining([
          expect.objectContaining({ id: 'c1', zoneId: 'z2' })
        ])
      })
    )
  })
})

describe('PropertiesPanel — Flow', () => {
  it('shows the flow name as an editable input', () => {
    render(<PropertiesPanel graph={graph} elementId="f1" onUpdate={noop} onClose={noop} />)
    expect(screen.getByDisplayValue('SQL Query')).toBeInTheDocument()
  })

  it('shows the direction as a select with the current value', () => {
    render(<PropertiesPanel graph={graph} elementId="f1" onUpdate={noop} onClose={noop} />)
    const select = screen.getByRole('combobox', { name: /direction/i })
    expect(select).toHaveValue(FlowDirection.Bidirectional)
  })

  it('shows the source and target as editable selects with the current components selected', () => {
    render(<PropertiesPanel graph={graph} elementId="f1" onUpdate={noop} onClose={noop} />)
    expect(screen.getByRole('combobox', { name: /source/i })).toHaveValue('c1')
    expect(screen.getByRole('combobox', { name: /target/i })).toHaveValue('c2')
  })

  it('lists every component as a source option', () => {
    render(<PropertiesPanel graph={graph} elementId="f1" onUpdate={noop} onClose={noop} />)
    const select = screen.getByRole('combobox', { name: /source/i })
    expect(select.querySelector('option[value="c1"]')).toBeInTheDocument()
    expect(select.querySelector('option[value="c2"]')).toBeInTheDocument()
  })

  it('calls onUpdate with the new originatorId when source changes', () => {
    const onUpdate = vi.fn()
    render(<PropertiesPanel graph={graph} elementId="f1" onUpdate={onUpdate} onClose={noop} />)
    fireEvent.change(screen.getByRole('combobox', { name: /source/i }), { target: { value: 'c2' } })
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        flows: expect.arrayContaining([expect.objectContaining({ id: 'f1', originatorId: 'c2' })])
      })
    )
  })

  it('calls onUpdate with the new targetId when target changes', () => {
    const onUpdate = vi.fn()
    render(<PropertiesPanel graph={graph} elementId="f1" onUpdate={onUpdate} onClose={noop} />)
    fireEvent.change(screen.getByRole('combobox', { name: /target/i }), { target: { value: 'c1' } })
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        flows: expect.arrayContaining([expect.objectContaining({ id: 'f1', targetId: 'c1' })])
      })
    )
  })

  it('calls onUpdate when flow name changes', () => {
    const onUpdate = vi.fn()
    render(<PropertiesPanel graph={graph} elementId="f1" onUpdate={onUpdate} onClose={noop} />)
    fireEvent.change(screen.getByDisplayValue('SQL Query'), { target: { value: 'DB Call' } })
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        flows: expect.arrayContaining([
          expect.objectContaining({ id: 'f1', name: 'DB Call' })
        ])
      })
    )
  })

  it('calls onUpdate when flow direction changes', () => {
    const onUpdate = vi.fn()
    render(<PropertiesPanel graph={graph} elementId="f1" onUpdate={onUpdate} onClose={noop} />)
    fireEvent.change(screen.getByRole('combobox', { name: /direction/i }), {
      target: { value: FlowDirection.Unidirectional }
    })
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        flows: expect.arrayContaining([
          expect.objectContaining({ id: 'f1', direction: FlowDirection.Unidirectional })
        ])
      })
    )
  })

  it('shows a Protocol field for flows', () => {
    render(<PropertiesPanel graph={graph} elementId="f1" onUpdate={noop} onClose={noop} />)
    expect(screen.getByLabelText(/protocol/i)).toBeInTheDocument()
  })

  it('shows an Encrypted checkbox for flows', () => {
    render(<PropertiesPanel graph={graph} elementId="f1" onUpdate={noop} onClose={noop} />)
    expect(screen.getByRole('checkbox', { name: /encrypted/i })).toBeInTheDocument()
  })

  it('hides the Encryption Method field when flow is not encrypted', () => {
    render(<PropertiesPanel graph={graph} elementId="f1" onUpdate={noop} onClose={noop} />)
    expect(screen.queryByLabelText(/encryption method/i)).not.toBeInTheDocument()
  })

  it('shows the Encryption Method field when flow is encrypted', () => {
    const encryptedGraph = { ...graph, flows: [{ ...graph.flows[0]!, encrypted: true }] }
    render(<PropertiesPanel graph={encryptedGraph} elementId="f1" onUpdate={noop} onClose={noop} />)
    expect(screen.getByLabelText(/encryption method/i)).toBeInTheDocument()
  })

  it('calls onUpdate with updated protocol when protocol changes', () => {
    const onUpdate = vi.fn()
    render(<PropertiesPanel graph={graph} elementId="f1" onUpdate={onUpdate} onClose={noop} />)
    fireEvent.change(screen.getByLabelText(/protocol/i), { target: { value: 'gRPC' } })
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        flows: expect.arrayContaining([expect.objectContaining({ id: 'f1', protocol: 'gRPC' })])
      })
    )
  })

  it('calls onUpdate with encrypted true when checkbox is checked', () => {
    const onUpdate = vi.fn()
    render(<PropertiesPanel graph={graph} elementId="f1" onUpdate={onUpdate} onClose={noop} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /encrypted/i }))
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        flows: expect.arrayContaining([expect.objectContaining({ id: 'f1', encrypted: true })])
      })
    )
  })
})
