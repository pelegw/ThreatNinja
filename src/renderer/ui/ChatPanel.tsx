import { useState } from 'react'

type Props = {
  onGraphGenerated: (description: string) => void
  onClose: () => void
  isLoading: boolean
  inline?: boolean
}

export default function ChatPanel({ onGraphGenerated, onClose, isLoading, inline = false }: Props): JSX.Element {
  const [description, setDescription] = useState('')

  const handleGenerate = () => {
    if (description.trim().length > 0) onGraphGenerated(description)
  }

  const canGenerate = description.trim().length > 0 && !isLoading

  const body = (
    <div style={inline ? inlinePanelStyle : panelStyle}>
      <h2 style={{ margin: '0 0 12px', fontSize: '16px', color: '#e0e0ff' }}>Describe your system</h2>
      <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#a0a0c0' }}>
        Describe your architecture in plain English and the AI will generate the diagram.
      </p>
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="e.g. A web app with an API server behind a load balancer, connected to a PostgreSQL database..."
        style={textareaStyle}
        rows={6}
      />
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
        <button onClick={handleGenerate} disabled={!canGenerate} style={canGenerate ? primaryBtnStyle : disabledBtnStyle}>
          {isLoading ? 'Generate…' : 'Generate'}
        </button>
      </div>
    </div>
  )

  if (inline) return body

  return (
    <div style={overlayStyle}>
      {body}
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
}

const panelStyle: React.CSSProperties = {
  background: '#1a1a2e', border: '1px solid #4a4a7e', borderRadius: '8px',
  padding: '24px', width: '520px', display: 'flex', flexDirection: 'column'
}

const inlinePanelStyle: React.CSSProperties = {
  padding: '16px', display: 'flex', flexDirection: 'column', flex: 1
}

const textareaStyle: React.CSSProperties = {
  padding: '8px', background: '#2a2a4e', color: '#e0e0ff',
  border: '1px solid #4a4a7e', borderRadius: '4px', fontSize: '13px',
  resize: 'vertical', fontFamily: 'inherit', flex: 1
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '6px 16px', background: '#4a4aee', color: '#fff',
  border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px'
}

const disabledBtnStyle: React.CSSProperties = {
  ...primaryBtnStyle, background: '#2a2a6e', color: '#6060a0', cursor: 'not-allowed'
}

const secondaryBtnStyle: React.CSSProperties = {
  padding: '6px 16px', background: '#2a2a4e', color: '#e0e0ff',
  border: '1px solid #4a4a7e', borderRadius: '4px', cursor: 'pointer', fontSize: '13px'
}
