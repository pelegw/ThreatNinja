import { useState } from 'react'
import { LLMProvider } from '../llm/llm'
import type { LLMSettings } from '../llm/llm'
import { DEFAULT_NL_TO_GRAPH_PROMPT } from '../llm/nlToGraph'
import { DEFAULT_INTERVIEW_PROMPT } from '../llm/interview'
import { DEFAULT_STRIDE_PROMPT } from '../llm/strideAnalysis'
import { DEFAULT_MITRE_PROMPT } from '../llm/attackAnalysis'
import { useTheme, overlayStyle, primaryBtnStyle, secondaryBtnStyle, inputStyle } from './tokens'
import type { Theme } from './tokens'

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
  const [maxTokensStr, setMaxTokensStr] = useState(settings.maxTokens !== undefined ? String(settings.maxTokens) : '')
  const [thinkingBudgetStr, setThinkingBudgetStr] = useState(settings.thinkingBudgetTokens !== undefined ? String(settings.thinkingBudgetTokens) : '')
  const [nlToGraphPrompt, setNlToGraphPrompt] = useState(settings.nlToGraphPrompt ?? '')
  const [interviewPrompt, setInterviewPrompt] = useState(settings.interviewPrompt ?? '')
  const [stridePrompt, setStridePrompt] = useState(settings.stridePrompt ?? '')
  const [mitrePrompt, setMitrePrompt] = useState(settings.mitrePrompt ?? '')
  const [showPrompts, setShowPrompts] = useState(false)
  const t = useTheme()

  const handleSave = () => {
    const updated: LLMSettings = { provider }
    if (apiKey.length > 0) updated.apiKey = apiKey
    if (endpoint.length > 0) updated.endpoint = endpoint
    if (model.length > 0) updated.model = model
    const maxTokensNum = parseInt(maxTokensStr, 10)
    if (!isNaN(maxTokensNum) && maxTokensNum > 0) updated.maxTokens = maxTokensNum
    const thinkingNum = parseInt(thinkingBudgetStr, 10)
    if (!isNaN(thinkingNum) && thinkingNum > 0) updated.thinkingBudgetTokens = thinkingNum
    if (nlToGraphPrompt.length > 0) updated.nlToGraphPrompt = nlToGraphPrompt
    if (interviewPrompt.length > 0) updated.interviewPrompt = interviewPrompt
    if (stridePrompt.length > 0) updated.stridePrompt = stridePrompt
    if (mitrePrompt.length > 0) updated.mitrePrompt = mitrePrompt
    onSave(updated)
  }

  const selectInput: React.CSSProperties = {
    ...inputStyle(t), padding: '6px 10px', width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={overlayStyle(t)}>
      <div style={{
        background: t.bgAlt, border: `1px solid ${t.border}`, borderRadius: 8,
        padding: 24, width: 560, maxHeight: '85vh', display: 'flex', flexDirection: 'column', gap: 4,
        overflowY: 'auto',
      }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, color: t.text }}>LLM Settings</h2>

        <label style={{ fontSize: 12, color: t.textMuted, marginTop: 8, marginBottom: 4 }} htmlFor="provider-select">Provider</label>
        <select
          id="provider-select"
          aria-label="Provider"
          value={provider}
          onChange={e => setProvider(e.target.value as LLMSettings['provider'])}
          style={selectInput}
        >
          <option value={LLMProvider.Anthropic}>Anthropic</option>
          <option value={LLMProvider.OpenAI}>OpenAI</option>
          <option value={LLMProvider.Local}>Local / Self-hosted</option>
        </select>

        {(provider === LLMProvider.Anthropic || provider === LLMProvider.OpenAI) && (
          <>
            <label style={{ fontSize: 12, color: t.textMuted, marginTop: 8, marginBottom: 4 }} htmlFor="api-key-input">API Key</label>
            <input
              id="api-key-input"
              aria-label="API Key"
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-..."
              style={selectInput}
            />
          </>
        )}

        {provider === LLMProvider.Local && (
          <>
            <label style={{ fontSize: 12, color: t.textMuted, marginTop: 8, marginBottom: 4 }} htmlFor="endpoint-input">Endpoint</label>
            <input
              id="endpoint-input"
              aria-label="Endpoint"
              type="text"
              value={endpoint}
              onChange={e => setEndpoint(e.target.value)}
              placeholder="http://localhost:11434/v1"
              style={selectInput}
            />
          </>
        )}

        <label style={{ fontSize: 12, color: t.textMuted, marginTop: 8, marginBottom: 4 }} htmlFor="model-input">Model</label>
        <input
          id="model-input"
          aria-label="Model"
          type="text"
          value={model}
          onChange={e => setModel(e.target.value)}
          placeholder={provider === LLMProvider.Local ? 'Required for vLLM / Ollama' : 'Leave blank for default'}
          style={selectInput}
        />

        <label style={{ fontSize: 12, color: t.textMuted, marginTop: 8, marginBottom: 4 }} htmlFor="max-tokens-input">Max tokens</label>
        <input
          id="max-tokens-input"
          aria-label="Max tokens"
          type="number"
          min={1}
          value={maxTokensStr}
          onChange={e => setMaxTokensStr(e.target.value)}
          placeholder="Default: 4096"
          style={selectInput}
        />

        {provider === LLMProvider.Anthropic && (
          <>
            <label style={{ fontSize: 12, color: t.textMuted, marginTop: 8, marginBottom: 4 }} htmlFor="thinking-budget-input">
              Thinking budget tokens
              <span style={{ color: t.textDim, marginLeft: 6, fontWeight: 400 }}>· set to enable extended thinking</span>
            </label>
            <input
              id="thinking-budget-input"
              aria-label="Thinking budget tokens"
              type="number"
              min={1024}
              value={thinkingBudgetStr}
              onChange={e => setThinkingBudgetStr(e.target.value)}
              placeholder="e.g. 10000"
              style={selectInput}
            />
          </>
        )}

        <button
          type="button"
          onClick={() => setShowPrompts(s => !s)}
          aria-expanded={showPrompts}
          aria-label="System prompts"
          style={{
            marginTop: 20, padding: '8px 0', background: 'none', border: 'none',
            color: t.text, fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
            borderTop: `1px solid ${t.border}`, fontFamily: 'inherit',
          }}
        >
          {showPrompts ? '▾' : '▸'} System prompts
          <span style={{ fontWeight: 400, color: t.textMuted, marginLeft: 8 }}>
            (advanced — leave blank to use defaults)
          </span>
        </button>

        {showPrompts && (
          <>
            <PromptField
              t={t}
              label="Generate Diagram (NL → graph)"
              value={nlToGraphPrompt}
              onChange={setNlToGraphPrompt}
              defaultPrompt={DEFAULT_NL_TO_GRAPH_PROMPT}
              ariaLabel="NL to Graph Prompt"
            />
            <PromptField
              t={t}
              label="Interview"
              value={interviewPrompt}
              onChange={setInterviewPrompt}
              defaultPrompt={DEFAULT_INTERVIEW_PROMPT}
              ariaLabel="Interview Prompt"
            />
            <PromptField
              t={t}
              label="STRIDE Analysis"
              value={stridePrompt}
              onChange={setStridePrompt}
              defaultPrompt={DEFAULT_STRIDE_PROMPT}
              ariaLabel="STRIDE Prompt"
            />
            <PromptField
              t={t}
              label="ATT&CK Analysis"
              value={mitrePrompt}
              onChange={setMitrePrompt}
              defaultPrompt={DEFAULT_MITRE_PROMPT}
              ariaLabel="ATT&CK Prompt"
            />
          </>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={secondaryBtnStyle(t)}>Cancel</button>
          <button onClick={handleSave} style={primaryBtnStyle(t)}>Save</button>
        </div>
      </div>
    </div>
  )
}

function PromptField({ t, label, value, onChange, defaultPrompt, ariaLabel }: {
  t: Theme
  label: string
  value: string
  onChange: (v: string) => void
  defaultPrompt: string
  ariaLabel: string
}): JSX.Element {
  const isOverridden = value.length > 0
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <label style={{ fontSize: 12, color: t.textMuted, flex: 1 }}>
          {label}
          {!isOverridden && <span style={{ color: t.textDim, marginLeft: 6 }}>· using default</span>}
        </label>
        {isOverridden ? (
          <button
            type="button"
            onClick={() => onChange('')}
            style={{
              background: 'none', border: 'none', color: t.accent, fontSize: 11,
              cursor: 'pointer', padding: 0, fontFamily: 'inherit',
            }}
          >
            Reset to default
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onChange(defaultPrompt)}
            style={{
              background: 'none', border: 'none', color: t.accent, fontSize: 11,
              cursor: 'pointer', padding: 0, fontFamily: 'inherit',
            }}
          >
            Edit default
          </button>
        )}
      </div>
      <textarea
        aria-label={ariaLabel}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={isOverridden ? '' : defaultPrompt}
        rows={6}
        style={{
          width: '100%', boxSizing: 'border-box', padding: '8px 10px',
          background: t.bgAlt,
          border: `1px solid ${t.border}`, borderRadius: 6, color: t.text,
          fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          resize: 'vertical', minHeight: 100, outline: 'none', overflowY: 'auto',
        }}
      />
    </div>
  )
}
