import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { ThemeContext, lightTheme, fonts } from './ui/tokens'
import type { Theme } from './ui/tokens'

type Props = { children: ReactNode }
type State = { hasError: boolean; message: string }

export default class ErrorBoundary extends Component<Props, State> {
  static contextType = ThemeContext
  declare context: Theme

  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const t = this.context ?? lightTheme
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', background: t.bg, color: t.text, gap: 16, fontFamily: fonts.sans,
        }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: t.sevHigh, margin: 0 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: t.textMuted, margin: 0, maxWidth: 400, textAlign: 'center' }}>{this.state.message}</p>
          <button onClick={() => window.location.reload()} style={{
            padding: '8px 24px', background: t.accent, color: '#fff',
            border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontFamily: fonts.sans,
          }}>
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
