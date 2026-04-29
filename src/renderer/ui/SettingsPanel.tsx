import { useState } from 'react'
import { LLMProvider } from '../llm/llm'
import type { LLMSettings } from '../llm/llm'

type Props = {
  settings: LLMSettings
  onSave: (settings: LLMSettings) => void
  onClose: () => void
}

export default function SettingsPanel({ settings, onSave, onClose }: Props): JSX.Element {
  const [provider, setProvider] = useState<LLMSettings['provider']>(settings.provider)
  const [apiKey, setApiKey] = useState(settings.apiKey ?? '')
  const [endpoint, setEndpoint] = useState(settings.endpoint ?? 'http://localhost:11434/v1')
  const [model, setModel] = useState(settings.model ?? '')

  const handleSave = () => {
    const updated: LLMSettings = { provider }
    if (apiKey.length > 0) updated.apiKey = apiKey
    if (endpoint.length > 0) updated.endpoint = endpoint
    if (model.length > 0) updated.model = model
    onSave(updated)
  }

  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        <h2 style={{ margin: '0 0 16px', fontSize: '16px', color: '#e0e0ff' }}>LLM Settings</h2>

        <label style={labelStyle} htmlFor="provider-select">Provider</label>
        <select
          id="provider-select"
          aria-label="Provider"
          value={provider}
          onChange={e => setProvider(e.target.value as LLMSettings['provider'])}
          style={inputStyle}
        >
          <option value={LLMProvider.Anthropic}>Anthropic</option>
          <option value={LLMProvider.OpenAI}>OpenAI</option>
          <option value={LLMProvider.Local}>Local / Self-hosted</option>
        </select>

        {(provider === LLMProvider.Anthropic || provider === LLMProvider.OpenAI) && (
          <>
            <label style={labelStyle} htmlFor="api-key-input">API Key</label>
            <input
              id="api-key-input"
              aria-label="API Key"
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-..."
              style={inputStyle}
            />
          </>
        )}

        {provider === LLMProvider.Local && (
          <>
            <label style={labelStyle} htmlFor="endpoint-input">Endpoint</label>
            <input
              id="endpoint-input"
              aria-label="Endpoint"
              type="text"
              value={endpoint}
              onChange={e => setEndpoint(e.target.value)}
              placeholder="http://localhost:11434/v1"
              style={inputStyle}
            />
          </>
        )}

        <label style={labelStyle} htmlFor="model-input">Model (optional)</label>
        <input
          id="model-input"
          type="text"
          value={model}
          onChange={e => setModel(e.target.value)}
          placeholder="Leave blank for default"
          style={inputStyle}
        />

        <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={handleSave} style={primaryBtnStyle}>Save</button>
        </div>
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
}

const panelStyle: React.CSSProperties = {
  background: '#1a1a2e', border: '1px solid #4a4a7e', borderRadius: '8px',
  padding: '24px', width: '400px', display: 'flex', flexDirection: 'column', gap: '4px'
}

const labelStyle: React.CSSProperties = {
  fontSize: '12px', color: '#a0a0c0', marginTop: '8px', marginBottom: '4px'
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px', background: '#2a2a4e', color: '#e0e0ff',
  border: '1px solid #4a4a7e', borderRadius: '4px', fontSize: '13px', width: '100%', boxSizing: 'border-box'
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '6px 16px', background: '#4a4aee', color: '#fff',
  border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px'
}

const secondaryBtnStyle: React.CSSProperties = {
  padding: '6px 16px', background: '#2a2a4e', color: '#e0e0ff',
  border: '1px solid #4a4a7e', borderRadius: '4px', cursor: 'pointer', fontSize: '13px'
}
