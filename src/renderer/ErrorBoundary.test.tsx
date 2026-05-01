// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import ErrorBoundary from './ErrorBoundary'

function ThrowingChild(): JSX.Element {
  throw new Error('test error')
}

describe('ErrorBoundary', () => {
  const originalError = console.error

  afterEach(() => {
    console.error = originalError
  })

  it('renders children when no error occurs', () => {
    render(<ErrorBoundary><p>Hello</p></ErrorBoundary>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('renders a recovery UI when a child component throws', () => {
    console.error = vi.fn()
    render(<ErrorBoundary><ThrowingChild /></ErrorBoundary>)
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })

  it('shows a Reload button in the fallback UI', () => {
    console.error = vi.fn()
    render(<ErrorBoundary><ThrowingChild /></ErrorBoundary>)
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument()
  })

  it('displays the error message', () => {
    console.error = vi.fn()
    render(<ErrorBoundary><ThrowingChild /></ErrorBoundary>)
    expect(screen.getByText('test error')).toBeInTheDocument()
  })
})
