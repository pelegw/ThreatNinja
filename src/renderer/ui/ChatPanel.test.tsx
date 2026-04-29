// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ChatPanel from './ChatPanel'

const noop = vi.fn()

describe('ChatPanel', () => {
  it('renders a text input for the user description', () => {
    render(<ChatPanel onGraphGenerated={noop} onClose={noop} isLoading={false} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders a Generate button', () => {
    render(<ChatPanel onGraphGenerated={noop} onClose={noop} isLoading={false} />)
    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument()
  })

  it('calls onGraphGenerated with the input text when Generate is clicked', async () => {
    const onGraphGenerated = vi.fn()
    render(<ChatPanel onGraphGenerated={onGraphGenerated} onClose={noop} isLoading={false} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A web app with a database' } })
    fireEvent.click(screen.getByRole('button', { name: /generate/i }))
    await waitFor(() => expect(onGraphGenerated).toHaveBeenCalledWith('A web app with a database'))
  })

  it('disables the Generate button when input is empty', () => {
    render(<ChatPanel onGraphGenerated={noop} onClose={noop} isLoading={false} />)
    expect(screen.getByRole('button', { name: /generate/i })).toBeDisabled()
  })

  it('disables the Generate button while loading', () => {
    render(<ChatPanel onGraphGenerated={noop} onClose={noop} isLoading={true} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'some text' } })
    expect(screen.getByRole('button', { name: /generate/i })).toBeDisabled()
  })

  it('calls onClose when the Cancel button is clicked', () => {
    const onClose = vi.fn()
    render(<ChatPanel onGraphGenerated={noop} onClose={onClose} isLoading={false} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('ChatPanel — inline mode', () => {
  it('renders the textbox without a fixed overlay when inline', () => {
    const { container } = render(<ChatPanel onGraphGenerated={noop} onClose={noop} isLoading={false} inline />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    const fixedEl = container.querySelector('[style*="position: fixed"]')
    expect(fixedEl).toBeNull()
  })

  it('still calls onGraphGenerated when Generate is clicked in inline mode', async () => {
    const onGraphGenerated = vi.fn()
    render(<ChatPanel onGraphGenerated={onGraphGenerated} onClose={noop} isLoading={false} inline />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A system' } })
    fireEvent.click(screen.getByRole('button', { name: /generate/i }))
    await waitFor(() => expect(onGraphGenerated).toHaveBeenCalledWith('A system'))
  })
})
