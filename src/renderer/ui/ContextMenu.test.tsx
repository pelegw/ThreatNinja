// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import ContextMenu from './ContextMenu'

const items = [
  { label: 'Add Component', onClick: vi.fn() },
  { label: 'Delete', onClick: vi.fn() }
]

describe('ContextMenu', () => {
  it('renders all item labels', () => {
    render(<ContextMenu items={items} position={{ x: 100, y: 200 }} onDismiss={vi.fn()} />)
    expect(screen.getByText('Add Component')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('calls the item onClick when an item is clicked', () => {
    const onClick = vi.fn()
    render(<ContextMenu items={[{ label: 'Do it', onClick }]} position={{ x: 0, y: 0 }} onDismiss={vi.fn()} />)
    fireEvent.click(screen.getByText('Do it'))
    expect(onClick).toHaveBeenCalled()
  })

  it('calls onDismiss when an item is clicked', () => {
    const onDismiss = vi.fn()
    render(<ContextMenu items={[{ label: 'Do it', onClick: vi.fn() }]} position={{ x: 0, y: 0 }} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByText('Do it'))
    expect(onDismiss).toHaveBeenCalled()
  })

  it('renders at the given position using fixed positioning', () => {
    const { container } = render(<ContextMenu items={items} position={{ x: 150, y: 250 }} onDismiss={vi.fn()} />)
    const menu = container.firstElementChild as HTMLElement
    expect(menu.style.position).toBe('fixed')
    expect(menu.style.left).toBe('150px')
    expect(menu.style.top).toBe('250px')
  })

  it('calls onDismiss when the backdrop is clicked', () => {
    const onDismiss = vi.fn()
    const { container } = render(<ContextMenu items={items} position={{ x: 0, y: 0 }} onDismiss={onDismiss} />)
    fireEvent.mouseDown(container.ownerDocument.body)
    expect(onDismiss).toHaveBeenCalled()
  })
})
