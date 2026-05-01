import { StrideCategory } from '../model/threats'
import type { Threat, ThreatList } from '../model/threats'
import type { Graph } from '../model/graph'
import { useTheme, fonts } from './tokens'
import type { Theme } from './tokens'
import { nextId } from '../model/ids'

type Props = {
  threats: ThreatList | null
  isAnalyzing?: boolean
  onClose?: () => void
  selectedId?: string
  onThreatSelected?: (affectedId: string) => void
  onThreatsChange?: (threats: Threat[]) => void
  graph?: Graph
}

export default function ThreatsPanel({ threats, isAnalyzing, onClose, selectedId, onThreatSelected, onThreatsChange, graph }: Props): JSX.Element {
  const t = useTheme()

  const update = (id: string, patch: Partial<Threat>) => {
    onThreatsChange?.((threats ?? []).map(th => th.id === id ? { ...th, ...patch } : th))
  }

  const remove = (id: string) => {
    onThreatsChange?.((threats ?? []).filter(th => th.id !== id))
  }

  const addThreat = () => {
    const newThreat: Threat = {
      id: nextId('t', (threats ?? []).map(th => th.id)),
      title: '',
      category: StrideCategory.Spoofing,
      description: '',
      affectedId: '',
      severity: 'medium'
    }
    onThreatsChange?.([...(threats ?? []), newThreat])
  }

  const sevColor = (severity: string) =>
    severity === 'critical' ? t.sevCritical
      : severity === 'high' ? t.sevHigh
      : severity === 'medium' ? t.sevMed
      : t.sevLow

  const sevCounts = threats !== null ? {
    critical: threats.filter(th => th.severity === 'critical').length,
    high: threats.filter(th => th.severity === 'high').length,
    medium: threats.filter(th => th.severity === 'medium').length,
    low: threats.filter(th => th.severity === 'low').length,
  } : { critical: 0, high: 0, medium: 0, low: 0 }

  return (
    <div style={{ background: t.bgAlt, borderTop: `1px solid ${t.border}`, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        height: 48, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 14,
        borderBottom: `1px solid ${t.border}`, flexShrink: 0,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Threats</span>
        {threats !== null && (
          <span style={{ fontSize: 12, color: t.textMuted, padding: '2px 7px', background: t.bgInset, borderRadius: 10 }}>
            {threats.length}
          </span>
        )}
        {threats !== null && threats.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginLeft: 4 }}>
            {([
              { label: 'Critical', count: sevCounts.critical, color: t.sevCritical },
              { label: 'High', count: sevCounts.high, color: t.sevHigh },
              { label: 'Medium', count: sevCounts.medium, color: t.sevMed },
              { label: 'Low', count: sevCounts.low, color: t.sevLow },
            ] as const).map(s => (
              <span key={s.label} style={{ fontSize: 11.5, color: t.textMuted, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: 4, background: s.color }} />
                {s.count} {s.label}
              </span>
            ))}
          </div>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={addThreat} style={{
          height: 30, padding: '0 12px', background: t.text, border: 'none', color: t.bgAlt,
          fontFamily: fonts.sans, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', borderRadius: 6,
        }}>+ New threat</button>
        {onClose !== undefined && (
          <button onClick={onClose} aria-label="Close" style={{
            background: 'none', border: 'none', color: t.textDim, cursor: 'pointer', fontSize: 16, padding: '0 4px',
          }}>✕</button>
        )}
      </div>

      {threats === null ? (
        <p style={{ color: t.textMuted, fontSize: 13, margin: 0, padding: '16px 20px' }}>Run Analyze to identify threats, or click <strong>+ New threat</strong> to add one manually.</p>
      ) : isAnalyzing === true && threats.length === 0 ? (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ color: t.textMuted, fontSize: 13, margin: 0 }}>Analyzing threats...</p>
          <div role="progressbar" style={{ width: '100%', height: 4, background: t.bgInset, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: '40%', height: '100%', background: t.accent, borderRadius: 2, animation: 'analyzeSlide 1.5s ease-in-out infinite' }} />
          </div>
        </div>
      ) : threats.length === 0 ? (
        <p style={{ color: t.textMuted, fontSize: 13, margin: 0, padding: '16px 20px' }}>No threats found.</p>
      ) : (
        <>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: t.text }}>
              <thead>
                <tr style={{ background: t.bgInset }}>
                  {['Severity', 'Category', 'Title', 'Description', 'Mitigation', 'Affected', ''].map(h => (
                    <th key={h} style={thStyle(t)}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {threats.map(th => (
                  <tr
                    key={th.id}
                    style={{ background: th.affectedId === selectedId ? t.accentBg : 'transparent', cursor: 'pointer', borderBottom: `1px solid ${t.border}` }}
                    aria-selected={th.affectedId === selectedId ? 'true' : undefined}
                    onClick={() => onThreatSelected?.(th.affectedId)}
                  >
                    <td style={tdStyle(t)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 4, background: sevColor(th.severity), flexShrink: 0 }} />
                        <select style={{ ...cellSelectStyle(t), color: t.text, fontWeight: 500, fontSize: 12.5 }} value={th.severity} onChange={e => update(th.id, { severity: e.target.value as typeof th.severity })}>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                    </td>
                    <td style={tdStyle(t)}>
                      <select style={{ ...cellSelectStyle(t), fontFamily: fonts.mono, fontSize: 12, color: t.textMuted }} value={th.category} onChange={e => update(th.id, { category: e.target.value as typeof th.category })}>
                        {Object.values(StrideCategory).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td style={tdStyle(t)} title={th.title}>
                      <input style={{ ...cellInputStyle(t), fontWeight: 500 }} value={th.title} onChange={e => update(th.id, { title: e.target.value })} title={th.title} />
                    </td>
                    <td style={tdStyle(t)} title={th.description}>
                      <input style={{ ...cellInputStyle(t), color: t.textMuted }} value={th.description} onChange={e => update(th.id, { description: e.target.value })} title={th.description} />
                    </td>
                    <td style={tdStyle(t)} title={th.mitigation ?? ''}>
                      <input style={{ ...cellInputStyle(t), color: t.textMuted }} value={th.mitigation ?? ''} onChange={e => update(th.id, { mitigation: e.target.value || undefined })} title={th.mitigation ?? ''} />
                    </td>
                    <td style={tdStyle(t)}>
                      {graph !== undefined ? (
                        <select
                          aria-label="Affected"
                          style={{ ...cellSelectStyle(t), fontFamily: fonts.mono, fontSize: 11.5, color: t.textMuted }}
                          value={th.affectedId}
                          onChange={e => update(th.id, { affectedId: e.target.value })}
                          onClick={e => e.stopPropagation()}
                        >
                          <option value="">(unassigned)</option>
                          {graph.components.length > 0 && (
                            <optgroup label="Components">
                              {graph.components.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
                            </optgroup>
                          )}
                          {graph.flows.length > 0 && (
                            <optgroup label="Flows">
                              {graph.flows.map(f => <option key={f.id} value={f.id}>{f.name} ({f.id})</option>)}
                            </optgroup>
                          )}
                          {th.affectedId !== '' &&
                            graph.components.every(c => c.id !== th.affectedId) &&
                            graph.flows.every(f => f.id !== th.affectedId) && (
                              <option value={th.affectedId}>{th.affectedId} (stale)</option>
                            )}
                        </select>
                      ) : (
                        <span style={{
                          padding: '2px 6px', background: t.bgInset, border: `1px solid ${t.border}`,
                          borderRadius: 4, fontFamily: fonts.mono, fontSize: 11.5, color: t.textMuted,
                        }}>{th.affectedId}</span>
                      )}
                    </td>
                    <td style={tdStyle(t)}>
                      <button aria-label="Delete" style={{
                        width: 24, height: 24, border: 'none', background: 'transparent',
                        color: '#dc2626', cursor: 'pointer', borderRadius: 4, fontSize: 14, fontWeight: 600,
                      }} onClick={e => { e.stopPropagation(); remove(th.id) }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

const thStyle = (t: Theme): React.CSSProperties => ({
  textAlign: 'left', padding: '8px 12px',
  color: t.textMuted, fontWeight: 500, fontSize: 11,
  textTransform: 'uppercase', letterSpacing: '0.02em',
  borderBottom: `1px solid ${t.border}`,
})

const tdStyle = (t: Theme): React.CSSProperties => ({
  padding: '6px 12px', verticalAlign: 'middle',
})

const cellInputStyle = (t: Theme): React.CSSProperties => ({
  background: 'transparent', border: 'none', color: t.text,
  fontSize: 13, width: '100%', fontFamily: 'inherit', outline: 'none',
})

const cellSelectStyle = (t: Theme): React.CSSProperties => ({
  background: 'transparent', border: 'none', color: t.text,
  fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
})
