import { useState, useRef, useEffect } from 'react'
import type { LLMMessage } from '../llm/llm'

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
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span style={titleStyle}>Interview</span>
        <button onClick={onClose} style={closeBtnStyle} aria-label="Close">✕</button>
      </div>

      <div ref={threadRef} style={threadStyle}>
        {visibleMessages.map((msg, i) => (
          <div key={i} style={msg.role === 'assistant' ? researcherRowStyle : developerRowStyle}>
            <div style={msg.role === 'assistant' ? researcherLabelStyle : developerLabelStyle}>
              {msg.role === 'assistant' ? 'Researcher' : 'You'}
            </div>
            <div style={msg.role === 'assistant' ? researcherBubbleStyle : developerBubbleStyle}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={researcherRowStyle}>
            <div style={researcherLabelStyle}>Researcher</div>
            <div style={{ ...researcherBubbleStyle, color: '#6060a0' }}>…</div>
          </div>
        )}
      </div>

      <div style={inputAreaStyle}>
        <textarea
          role="textbox"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your answer…"
          rows={3}
          style={textareaStyle}
          disabled={isLoading}
        />
        <div style={buttonRowStyle}>
          <button onClick={onRestart} style={restartBtnStyle} aria-label="Start Over">
            Start Over
          </button>
          <button onClick={handleSend} disabled={!canSend} style={canSend ? sendBtnStyle : disabledSendBtnStyle} aria-label="Send">
            {isLoading ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  width: '100%', height: '100%', background: '#16162a',
  display: 'flex', flexDirection: 'column', overflow: 'hidden'
}

const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '12px 16px', borderBottom: '1px solid #3a3a6e', flexShrink: 0
}

const titleStyle: React.CSSProperties = {
  fontSize: '13px', fontWeight: 600, color: '#a0a0d0', textTransform: 'uppercase', letterSpacing: '0.05em'
}

const closeBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#6060a0', cursor: 'pointer', fontSize: '16px', padding: '0 4px'
}

const threadStyle: React.CSSProperties = {
  flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px'
}

const researcherRowStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px'
}

const developerRowStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px'
}

const researcherLabelStyle: React.CSSProperties = {
  fontSize: '10px', color: '#6060a0', textTransform: 'uppercase', letterSpacing: '0.05em'
}

const developerLabelStyle: React.CSSProperties = {
  fontSize: '10px', color: '#6060a0', textTransform: 'uppercase', letterSpacing: '0.05em'
}

const researcherBubbleStyle: React.CSSProperties = {
  background: '#1e2a3e', color: '#a0d0ff', padding: '8px 12px',
  borderRadius: '4px 12px 12px 4px', fontSize: '13px', maxWidth: '90%',
  lineHeight: '1.5', wordBreak: 'break-word'
}

const developerBubbleStyle: React.CSSProperties = {
  background: '#2a2a4e', color: '#e0e0ff', padding: '8px 12px',
  borderRadius: '12px 4px 4px 12px', fontSize: '13px', maxWidth: '90%',
  lineHeight: '1.5', wordBreak: 'break-word'
}

const inputAreaStyle: React.CSSProperties = {
  padding: '12px 16px', borderTop: '1px solid #3a3a6e', flexShrink: 0,
  display: 'flex', flexDirection: 'column', gap: '8px'
}

const textareaStyle: React.CSSProperties = {
  padding: '8px', background: '#2a2a4e', color: '#e0e0ff',
  border: '1px solid #4a4a7e', borderRadius: '4px', fontSize: '13px',
  resize: 'none', fontFamily: 'inherit', width: '100%'
}

const buttonRowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', gap: '8px'
}

const sendBtnStyle: React.CSSProperties = {
  padding: '6px 16px', background: '#4a4aee', color: '#fff',
  border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px'
}

const disabledSendBtnStyle: React.CSSProperties = {
  ...sendBtnStyle, background: '#2a2a6e', color: '#6060a0', cursor: 'not-allowed'
}

const restartBtnStyle: React.CSSProperties = {
  padding: '6px 12px', background: '#2a2a4e', color: '#a0a0c0',
  border: '1px solid #4a4a7e', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
}
