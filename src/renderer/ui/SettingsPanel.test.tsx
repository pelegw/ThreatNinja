// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import SettingsPanel from './SettingsPanel'
import { LLMProvider } from '../llm/llm'
import type { LLMSettings } from '../llm/llm'

const defaultSettings: LLMSettings = { provider: LLMProvider.Anthropic }

const openPrompts = () => {
  fireEvent.click(screen.getByRole('button', { name: /system prompts/i }))
}

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
    render(<SettingsPanel settings={defaultSettings} onSave={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    render(<SettingsPanel settings={defaultSettings} onSave={vi.fn()} onClose={onClose} />)
    fireEvent.click(screen.getAllByRole('button', { name: /cancel/i })[1]!)
    expect(onClose).toHaveBeenCalled()
  })

  it('shows a Max tokens input field', () => {
    render(<SettingsPanel settings={defaultSettings} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/max tokens/i)).toBeInTheDocument()
  })

  it('shows a Thinking budget field for Anthropic provider', () => {
    render(<SettingsPanel settings={defaultSettings} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/thinking budget/i)).toBeInTheDocument()
  })

  it('hides the Thinking budget field for non-Anthropic providers', () => {
    render(<SettingsPanel settings={{ provider: LLMProvider.OpenAI }} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByLabelText(/thinking budget/i)).not.toBeInTheDocument()
  })

  it('saves maxTokens as a number', () => {
    const onSave = vi.fn()
    render(<SettingsPanel settings={defaultSettings} onSave={onSave} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/max tokens/i), { target: { value: '8192' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ maxTokens: 8192 }))
  })

  it('saves thinkingBudgetTokens as a number', () => {
    const onSave = vi.fn()
    render(<SettingsPanel settings={defaultSettings} onSave={onSave} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/thinking budget/i), { target: { value: '10000' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ thinkingBudgetTokens: 10000 }))
  })

  describe('prompt fields', () => {
    it('shows an "Edit default" button when the prompt value is empty', () => {
      render(<SettingsPanel settings={defaultSettings} onSave={vi.fn()} onClose={vi.fn()} />)
      openPrompts()
      expect(screen.getAllByRole('button', { name: /edit default/i }).length).toBeGreaterThan(0)
    })

    it('pre-fills the textarea with the default prompt when "Edit default" is clicked', () => {
      render(<SettingsPanel settings={defaultSettings} onSave={vi.fn()} onClose={vi.fn()} />)
      openPrompts()
      fireEvent.click(screen.getAllByRole('button', { name: /edit default/i })[0]!)
      const textarea = screen.getByLabelText(/nl to graph prompt/i) as HTMLTextAreaElement
      expect(textarea.value.length).toBeGreaterThan(0)
    })

    it('swaps "Edit default" to "Reset to default" for the edited field', () => {
      render(<SettingsPanel settings={defaultSettings} onSave={vi.fn()} onClose={vi.fn()} />)
      openPrompts()
      const beforeCount = screen.getAllByRole('button', { name: /edit default/i }).length
      fireEvent.click(screen.getAllByRole('button', { name: /edit default/i })[0]!)
      expect(screen.queryAllByRole('button', { name: /edit default/i }).length).toBe(beforeCount - 1)
      expect(screen.getAllByRole('button', { name: /reset to default/i }).length).toBe(1)
    })
  })
})
