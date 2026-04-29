// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import SettingsPanel from './SettingsPanel'
import { LLMProvider } from '../llm/llm'
import type { LLMSettings } from '../llm/llm'

const defaultSettings: LLMSettings = { provider: LLMProvider.Anthropic }

describe('SettingsPanel', () => {
  it('renders a provider selector', () => {
    render(<SettingsPanel settings={defaultSettings} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByRole('combobox', { name: /provider/i })).toBeInTheDocument()
  })

  it('shows API key field for Anthropic provider', () => {
    render(<SettingsPanel settings={defaultSettings} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/api key/i)).toBeInTheDocument()
  })

  it('shows endpoint field for Local provider', () => {
    render(<SettingsPanel settings={{ provider: LLMProvider.Local }} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/endpoint/i)).toBeInTheDocument()
  })

  it('calls onSave with updated settings when Save is clicked', () => {
    const onSave = vi.fn()
    render(<SettingsPanel settings={defaultSettings} onSave={onSave} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ provider: LLMProvider.Anthropic }))
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(<SettingsPanel settings={defaultSettings} onSave={vi.fn()} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
