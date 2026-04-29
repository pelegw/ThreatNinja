// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import PalettePanel from './PalettePanel'
import type { Zone } from '../model/graph'

const zones: Zone[] = [
  { id: 'z1', name: 'Internal' },
  { id: 'z2', name: 'DMZ' }
]

const noop = vi.fn()

describe('PalettePanel — idle state', () => {
  it('renders an Add Zone button', () => {
    render(<PalettePanel zones={zones} onAddZone={noop} onAddComponent={noop} onStartFlow={noop} onCancelFlow={noop} onCancelPickZone={noop} flowDraft={null} isPickingZone={false} />)
    expect(screen.getByRole('button', { name: /add zone/i })).toBeInTheDocument()
  })

  it('renders an Add Component button', () => {
    render(<PalettePanel zones={zones} onAddZone={noop} onAddComponent={noop} onStartFlow={noop} onCancelFlow={noop} onCancelPickZone={noop} flowDraft={null} isPickingZone={false} />)
    expect(screen.getByRole('button', { name: /add component/i })).toBeInTheDocument()
  })

  it('renders an Add Flow button', () => {
    render(<PalettePanel zones={zones} onAddZone={noop} onAddComponent={noop} onStartFlow={noop} onCancelFlow={noop} onCancelPickZone={noop} flowDraft={null} isPickingZone={false} />)
    expect(screen.getByRole('button', { name: /add flow/i })).toBeInTheDocument()
  })

  it('calls onAddZone when Add Zone is clicked', () => {
    const onAddZone = vi.fn()
    render(<PalettePanel zones={zones} onAddZone={onAddZone} onAddComponent={noop} onStartFlow={noop} onCancelFlow={noop} flowDraft={null} />)
    fireEvent.click(screen.getByRole('button', { name: /add zone/i }))
    expect(onAddZone).toHaveBeenCalled()
  })

  it('calls onAddComponent when Add Component is clicked', () => {
    const onAddComponent = vi.fn()
    render(<PalettePanel zones={zones} onAddZone={noop} onAddComponent={onAddComponent} onStartFlow={noop} onCancelFlow={noop} flowDraft={null} />)
    fireEvent.click(screen.getByRole('button', { name: /add component/i }))
    expect(onAddComponent).toHaveBeenCalled()
  })

  it('disables Add Component when there are no zones', () => {
    render(<PalettePanel zones={[]} onAddZone={noop} onAddComponent={noop} onStartFlow={noop} onCancelFlow={noop} onCancelPickZone={noop} flowDraft={null} isPickingZone={false} />)
    expect(screen.getByRole('button', { name: /add component/i })).toBeDisabled()
  })

  it('calls onStartFlow when Add Flow is clicked', () => {
    const onStartFlow = vi.fn()
    render(<PalettePanel zones={zones} onAddZone={noop} onAddComponent={noop} onStartFlow={onStartFlow} onCancelFlow={noop} flowDraft={null} />)
    fireEvent.click(screen.getByRole('button', { name: /add flow/i }))
    expect(onStartFlow).toHaveBeenCalled()
  })

  it('disables Add Flow when there are fewer than 2 components possible (no zones)', () => {
    render(<PalettePanel zones={[]} onAddZone={noop} onAddComponent={noop} onStartFlow={noop} onCancelFlow={noop} onCancelPickZone={noop} flowDraft={null} isPickingZone={false} />)
    expect(screen.getByRole('button', { name: /add flow/i })).toBeDisabled()
  })
})

describe('PalettePanel — picking zone for component', () => {
  it('shows a "click a zone" instruction when isPickingZone is true', () => {
    render(<PalettePanel zones={zones} onAddZone={noop} onAddComponent={noop} onStartFlow={noop} onCancelFlow={noop} onCancelPickZone={noop} flowDraft={null} isPickingZone />)
    expect(screen.getByText(/click a zone/i)).toBeInTheDocument()
  })

  it('shows a Cancel button when isPickingZone is true', () => {
    render(<PalettePanel zones={zones} onAddZone={noop} onAddComponent={noop} onStartFlow={noop} onCancelFlow={noop} onCancelPickZone={noop} flowDraft={null} isPickingZone />)
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('calls onCancelPickZone when Cancel is clicked during zone picking', () => {
    const onCancelPickZone = vi.fn()
    render(<PalettePanel zones={zones} onAddZone={noop} onAddComponent={noop} onStartFlow={noop} onCancelFlow={noop} onCancelPickZone={onCancelPickZone} flowDraft={null} isPickingZone />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancelPickZone).toHaveBeenCalled()
  })

  it('does not show Add Zone/Component/Flow buttons when isPickingZone is true', () => {
    render(<PalettePanel zones={zones} onAddZone={noop} onAddComponent={noop} onStartFlow={noop} onCancelFlow={noop} onCancelPickZone={noop} flowDraft={null} isPickingZone />)
    expect(screen.queryByRole('button', { name: /add zone/i })).not.toBeInTheDocument()
  })
})

describe('PalettePanel — flow drawing: select source', () => {
  it('shows a "click source component" instruction when flowDraft stage is source', () => {
    render(<PalettePanel zones={zones} onAddZone={noop} onAddComponent={noop} onStartFlow={noop} onCancelFlow={noop} onCancelPickZone={noop} flowDraft={{ stage: 'source' }} isPickingZone={false} />)
    expect(screen.getByText(/click a source component/i)).toBeInTheDocument()
  })

  it('shows a Cancel button during flow drawing', () => {
    render(<PalettePanel zones={zones} onAddZone={noop} onAddComponent={noop} onStartFlow={noop} onCancelFlow={noop} onCancelPickZone={noop} flowDraft={{ stage: 'source' }} isPickingZone={false} />)
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('calls onCancelFlow when Cancel is clicked during flow drawing', () => {
    const onCancelFlow = vi.fn()
    render(<PalettePanel zones={zones} onAddZone={noop} onAddComponent={noop} onStartFlow={noop} onCancelFlow={onCancelFlow} flowDraft={{ stage: 'source' }} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancelFlow).toHaveBeenCalled()
  })
})

describe('PalettePanel — flow drawing: select target', () => {
  it('shows a "click target component" instruction when flowDraft stage is target', () => {
    render(<PalettePanel zones={zones} onAddZone={noop} onAddComponent={noop} onStartFlow={noop} onCancelFlow={noop} onCancelPickZone={noop} flowDraft={{ stage: 'target', sourceId: 'c1', sourceName: 'API Server' }} isPickingZone={false} />)
    expect(screen.getByText(/click a target component/i)).toBeInTheDocument()
  })

  it('shows the source component name during target selection', () => {
    render(<PalettePanel zones={zones} onAddZone={noop} onAddComponent={noop} onStartFlow={noop} onCancelFlow={noop} onCancelPickZone={noop} flowDraft={{ stage: 'target', sourceId: 'c1', sourceName: 'API Server' }} isPickingZone={false} />)
    expect(screen.getByText(/api server/i)).toBeInTheDocument()
  })
})
