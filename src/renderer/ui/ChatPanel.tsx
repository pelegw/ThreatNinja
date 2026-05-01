import { useState } from 'react'
import { useTheme, overlayStyle, primaryBtnStyle, disabledPrimaryBtnStyle, secondaryBtnStyle, inputStyle } from './tokens'
import { fonts } from './tokens'

type Props = {
  onGraphGenerated: (description: string) => void
  onClose: () => void
  isLoading: boolean
  inline?: boolean
}

export default function ChatPanel({ onGraphGenerated, onClose, isLoading, inline = false }: Props): JSX.Element {
  const [description, setDescription] = useState('')
  const t = useTheme()

  const handleGenerate = () => {
    if (description.trim().length > 0) onGraphGenerated(description)
  }

  const canGenerate = description.trim().length > 0 && !isLoading

  const body = (
    <div style={inline ? { padding: 16, display: 'flex', flexDirection: 'column' as const, flex: 1 } : {
      background: t.bgAlt, border: `1px solid ${t.border}`, borderRadius: 8,
      padding: 24, width: 520, display: 'flex', flexDirection: 'column' as const,
    }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 16, color: t.text }}>Describe your system</h2>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: t.textMuted }}>
        Describe your architecture in plain English and the AI will generate the diagram.
      </p>
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="e.g. A web app with an API server behind a load balancer, connected to a PostgreSQL database..."
        style={{
          ...inputStyle(t), padding: 8, resize: 'vertical' as const, flex: 1, fontFamily: fonts.sans,
        }}
        rows={6}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={secondaryBtnStyle(t)}>Cancel</button>
        <button onClick={handleGenerate} disabled={!canGenerate} style={canGenerate ? primaryBtnStyle(t) : disabledPrimaryBtnStyle(t)}>
          {isLoading ? 'Generate…' : 'Generate'}
        </button>
      </div>
    </div>
  )

  if (inline) return body

  return (
    <div style={overlayStyle(t)}>
      {body}
    </div>
  )
}
