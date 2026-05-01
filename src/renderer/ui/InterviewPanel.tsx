import { useState, useRef, useEffect } from 'react'
import type { LLMMessage } from '../llm/llm'
import { useTheme, fonts } from './tokens'

type Props = {
  messages: LLMMessage[]
  onSend: (answer: string) => void
  onClose: () => void
  onRestart: () => void
  isLoading: boolean
}

export default function InterviewPanel({ messages, onSend, onClose, onRestart, isLoading }: Props): JSX.Element {
  const [input, setInput] = useState('')
  const threadRef = useRef<HTMLDivElement>(null)
  const t = useTheme()

  const canSend = input.trim().length > 0 && !isLoading

  useEffect(() => {
    if (threadRef.current !== null) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    if (!canSend) return
    onSend(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const visibleMessages = messages.slice(1)

  return (
    <div style={{ width: '100%', height: '100%', background: t.bgAlt, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        padding: '16px 20px 14px', borderBottom: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text, letterSpacing: -0.2 }}>Interview</div>
          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
            {visibleMessages.length} questions &middot; {isLoading ? 'thinking' : 'in progress'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isLoading && (
            <div style={{
              padding: '3px 8px', background: t.accentBg, color: t.accentDim,
              fontSize: 11, fontWeight: 600, borderRadius: 4, letterSpacing: 0.02,
            }}>LIVE</div>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.textDim, cursor: 'pointer', fontSize: 16, padding: '0 4px' }} aria-label="Close">✕</button>
        </div>
      </div>

      <div ref={threadRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {visibleMessages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 11,
                background: msg.role === 'assistant' ? t.accent : '#a78bfa',
                color: '#fff', fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{msg.role === 'assistant' ? 'TN' : 'You'}</div>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>
                {msg.role === 'assistant' ? 'Threat Ninja' : 'You'}
              </span>
              <span style={{ fontSize: 11, color: t.textDim }}>&middot; just now</span>
            </div>
            <div style={{
              fontSize: 13, lineHeight: 1.55, color: t.text,
              padding: msg.role === 'assistant' ? '10px 12px' : 0,
              background: msg.role === 'assistant' ? t.bgInset : 'transparent',
              border: msg.role === 'assistant' ? `1px solid ${t.border}` : 'none',
              borderRadius: 8,
              marginLeft: 30,
            }}>{msg.content}</div>
          </div>
        ))}
        {isLoading && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 11, background: t.accent,
                color: '#fff', fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>TN</div>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>Threat Ninja</span>
            </div>
            <div style={{
              fontSize: 13, color: t.textDim, padding: '10px 12px',
              background: t.bgInset, border: `1px solid ${t.border}`, borderRadius: 8, marginLeft: 30,
            }}>…</div>
          </div>
        )}
      </div>

      <div style={{ borderTop: `1px solid ${t.border}`, padding: 16, flexShrink: 0 }}>
        <div style={{
          background: t.bgInset, border: `1px solid ${t.border}`, borderRadius: 10,
          padding: '10px 12px', minHeight: 76, display: 'flex', flexDirection: 'column',
        }}>
          <textarea
            role="textbox"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer…"
            rows={3}
            style={{
              background: 'transparent', border: 'none', color: t.text,
              fontSize: 13, fontFamily: fonts.sans, resize: 'none', width: '100%',
              outline: 'none', flex: 1, lineHeight: 1.55,
            }}
            disabled={isLoading}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <button onClick={onRestart} style={{
              height: 24, border: 'none', background: 'transparent', color: t.textMuted,
              cursor: 'pointer', borderRadius: 4, fontSize: 11, fontFamily: fonts.sans,
            }} aria-label="Start Over">Start Over</button>
            <div style={{ flex: 1 }} />
            <button onClick={handleSend} disabled={!canSend} aria-label="Send" style={{
              height: 26, padding: '0 12px',
              background: canSend ? t.text : t.bgInset,
              border: 'none',
              color: canSend ? t.bgAlt : t.textDim,
              fontFamily: fonts.sans, fontSize: 12, fontWeight: 500,
              cursor: canSend ? 'pointer' : 'not-allowed', borderRadius: 6,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {isLoading ? '…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
