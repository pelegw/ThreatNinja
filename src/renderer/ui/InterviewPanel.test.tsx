// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import InterviewPanel from './InterviewPanel'
import type { LLMMessage } from '../llm/llm'

const bootstrapMessage: LLMMessage = { role: 'user', content: 'bootstrap prompt with graph data' }
const firstQuestion: LLMMessage = { role: 'assistant', content: 'What authentication mechanism does your API use?' }
const userAnswer: LLMMessage = { role: 'user', content: 'We use JWT tokens' }
const followUp: LLMMessage = { role: 'assistant', content: 'How are the JWT tokens validated?' }

const defaultProps = {
  messages: [bootstrapMessage, firstQuestion],
  onSend: vi.fn(),
  onClose: vi.fn(),
  onRestart: vi.fn(),
  isLoading: false
}

describe('InterviewPanel', () => {
  it('renders the first assistant question', () => {
    render(<InterviewPanel {...defaultProps} />)
    expect(screen.getByText('What authentication mechanism does your API use?')).toBeInTheDocument()
  })

  it('does not render the bootstrap prompt', () => {
    render(<InterviewPanel {...defaultProps} />)
    expect(screen.queryByText('bootstrap prompt with graph data')).not.toBeInTheDocument()
  })

  it('renders user answers with a Developer label', () => {
    render(<InterviewPanel {...defaultProps} messages={[bootstrapMessage, firstQuestion, userAnswer]} />)
    expect(screen.getByText('We use JWT tokens')).toBeInTheDocument()
  })

  it('renders all turns in a multi-turn conversation', () => {
    const messages = [bootstrapMessage, firstQuestion, userAnswer, followUp]
    render(<InterviewPanel {...defaultProps} messages={messages} />)
    expect(screen.getByText('What authentication mechanism does your API use?')).toBeInTheDocument()
    expect(screen.getByText('We use JWT tokens')).toBeInTheDocument()
    expect(screen.getByText('How are the JWT tokens validated?')).toBeInTheDocument()
  })

  it('disables the Send button when the input is empty', () => {
    render(<InterviewPanel {...defaultProps} />)
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
  })

  it('enables the Send button after typing', () => {
    render(<InterviewPanel {...defaultProps} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My answer' } })
    expect(screen.getByRole('button', { name: /send/i })).not.toBeDisabled()
  })

  it('calls onSend with the trimmed input value when Send is clicked', () => {
    const onSend = vi.fn()
    render(<InterviewPanel {...defaultProps} onSend={onSend} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  My answer  ' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(onSend).toHaveBeenCalledWith('My answer')
  })

  it('clears the input after sending', () => {
    render(<InterviewPanel {...defaultProps} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'My answer' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(input).toHaveValue('')
  })

  it('sends on Enter key without Shift', () => {
    const onSend = vi.fn()
    render(<InterviewPanel {...defaultProps} onSend={onSend} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'My answer' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })
    expect(onSend).toHaveBeenCalledWith('My answer')
  })

  it('does not send on Shift+Enter', () => {
    const onSend = vi.fn()
    render(<InterviewPanel {...defaultProps} onSend={onSend} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'My answer' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    expect(onSend).not.toHaveBeenCalled()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<InterviewPanel {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onRestart when the Start Over button is clicked', () => {
    const onRestart = vi.fn()
    render(<InterviewPanel {...defaultProps} onRestart={onRestart} />)
    fireEvent.click(screen.getByRole('button', { name: /start over/i }))
    expect(onRestart).toHaveBeenCalled()
  })

  it('disables the Send button and shows loading indicator when isLoading is true', () => {
    render(<InterviewPanel {...defaultProps} isLoading />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'My answer' } })
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
  })
})
