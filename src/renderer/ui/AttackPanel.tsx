import { Fragment, useState } from 'react'
import { AttackTactic } from '../model/attackThreats'
import type { AttackThreat, AttackThreatList } from '../model/attackThreats'
import type { Graph } from '../model/graph'
import type { ThreatList } from '../model/threats'
import { useTheme, fonts } from './tokens'
import type { Theme } from './tokens'
import { nextId } from '../model/ids'

type Props = {
  attackThreats: AttackThreatList | null
  isAnalyzing?: boolean
  selectedId?: string
  onAttackThreatSelected?: (affectedId: string) => void
  onAttackThreatsChange?: (threats: AttackThreat[]) => void
  graph?: Graph
  threats?: ThreatList | null
  onRelatedThreatClick?: (threatId: string) => void
}

const sevColor = (t: Theme, severity: string): string =>
  severity === 'critical' ? t.sevCritical
    : severity === 'high' ? t.sevHigh
    : severity === 'medium' ? t.sevMed
    : t.sevLow

const techniqueUrl = (techniqueId: string): string => {
  const path = techniqueId.replace('.', '/')
  return `https://attack.mitre.org/techniques/${path}/`
}

export default function AttackPanel({
  attackThreats, isAnalyzing, selectedId, onAttackThreatSelected, onAttackThreatsChange, graph, threats, onRelatedThreatClick
}: Props): JSX.Element {
  const t = useTheme()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const update = (id: string, patch: Partial<AttackThreat>) => {
    onAttackThreatsChange?.((attackThreats ?? []).map(a => a.id === id ? { ...a, ...patch } : a))
  }

  const remove = (id: string) => {
    onAttackThreatsChange?.((attackThreats ?? []).filter(a => a.id !== id))
  }

  const addAttack = () => {
    const newAttack: AttackThreat = {
      id: nextId('a', (attackThreats ?? []).map(a => a.id)),
      tactic: AttackTactic.InitialAccess,
      techniqueId: '',
      techniqueName: '',
      title: '',
      description: '',
      affectedId: '',
      severity: 'medium',
    }
    onAttackThreatsChange?.([...(attackThreats ?? []), newAttack])
  }

  const openTechnique = (techniqueId: string) => {
    if (techniqueId.length === 0) return
    void window.electronAPI?.openExternal?.(techniqueUrl(techniqueId))
  }

  const sevCounts = attackThreats !== null ? {
    critical: attackThreats.filter(a => a.severity === 'critical').length,
    high: attackThreats.filter(a => a.severity === 'high').length,
    medium: attackThreats.filter(a => a.severity === 'medium').length,
    low: attackThreats.filter(a => a.severity === 'low').length,
  } : { critical: 0, high: 0, medium: 0, low: 0 }

  return (
    <div style={{ background: t.bgAlt, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        height: 48, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 14,
        borderBottom: `1px solid ${t.border}`, flexShrink: 0,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>ATT&CK</span>
        {attackThreats !== null && (
          <span style={{ fontSize: 12, color: t.textMuted, padding: '2px 7px', background: t.bgInset, borderRadius: 10 }}>
            {attackThreats.length}
          </span>
        )}
        {attackThreats !== null && attackThreats.length > 0 && (
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
        <button onClick={addAttack} style={{
          height: 30, padding: '0 12px', background: t.text, border: 'none', color: t.bgAlt,
          fontFamily: fonts.sans, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', borderRadius: 6,
        }}>+ New ATT&CK threat</button>
      </div>

      {attackThreats === null ? (
        <p style={{ color: t.textMuted, fontSize: 13, margin: 0, padding: '16px 20px' }}>
          Run STRIDE first, then click <strong>Analyze ATT&CK</strong> to enrich with MITRE techniques. Or click <strong>+ New ATT&CK threat</strong> to add one manually.
        </p>
      ) : isAnalyzing === true && attackThreats.length === 0 ? (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ color: t.textMuted, fontSize: 13, margin: 0 }}>Mapping ATT&CK techniques…</p>
          <div role="progressbar" style={{ width: '100%', height: 4, background: t.bgInset, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: '40%', height: '100%', background: t.accent, borderRadius: 2, animation: 'analyzeSlide 1.5s ease-in-out infinite' }} />
          </div>
        </div>
      ) : attackThreats.length === 0 ? (
        <p style={{ color: t.textMuted, fontSize: 13, margin: 0, padding: '16px 20px' }}>No ATT&CK techniques identified.</p>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: t.text }}>
            <thead>
              <tr style={{ background: t.bgInset }}>
                {['Tactic', 'Technique', 'Affected', 'Severity', 'Title', ''].map(h => (
                  <th key={h} style={thStyle(t)}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attackThreats.map(a => {
                const isExpanded = expandedId === a.id
                return (
                  <Fragment key={a.id}>
                    <tr
                      style={{ background: a.affectedId === selectedId ? t.accentBg : 'transparent', cursor: 'pointer', borderBottom: `1px solid ${t.border}` }}
                      aria-selected={a.affectedId === selectedId ? 'true' : undefined}
                      onClick={() => {
                        setExpandedId(isExpanded ? null : a.id)
                        onAttackThreatSelected?.(a.affectedId)
                      }}
                    >
                      <td style={tdStyle(t)} title={a.tactic}>
                        <span style={{
                          padding: '2px 8px', background: t.bgInset, border: `1px solid ${t.border}`,
                          borderRadius: 10, fontFamily: fonts.mono, fontSize: 11.5, color: t.text,
                          whiteSpace: 'nowrap',
                        }}>{a.tactic}</span>
                      </td>
                      <td style={tdStyle(t)} title={`${a.techniqueId} ${a.techniqueName}`}>
                        <a
                          onClick={e => { e.stopPropagation(); openTechnique(a.techniqueId) }}
                          style={{ color: t.accent, cursor: 'pointer', fontFamily: fonts.mono, fontSize: 12, marginRight: 8, textDecoration: 'underline' }}
                        >
                          {a.techniqueId || '—'}
                        </a>
                        <span style={{ fontSize: 12, color: t.textMuted }}>{a.techniqueName}</span>
                      </td>
                      <td style={tdStyle(t)}>
                        {graph !== undefined ? (
                          <select
                            aria-label="Affected"
                            style={{ ...cellSelectStyle(t), fontFamily: fonts.mono, fontSize: 11.5, color: t.textMuted }}
                            value={a.affectedId}
                            onChange={e => update(a.id, { affectedId: e.target.value })}
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
                            {a.affectedId !== '' &&
                              graph.components.every(c => c.id !== a.affectedId) &&
                              graph.flows.every(f => f.id !== a.affectedId) && (
                                <option value={a.affectedId}>{a.affectedId} (stale)</option>
                              )}
                          </select>
                        ) : (
                          <span style={{
                            padding: '2px 6px', background: t.bgInset, border: `1px solid ${t.border}`,
                            borderRadius: 4, fontFamily: fonts.mono, fontSize: 11.5, color: t.textMuted,
                          }}>{a.affectedId}</span>
                        )}
                      </td>
                      <td style={tdStyle(t)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 4, background: sevColor(t, a.severity), flexShrink: 0 }} />
                          <select
                            style={{ ...cellSelectStyle(t), color: t.text, fontWeight: 500, fontSize: 12.5 }}
                            value={a.severity}
                            onClick={e => e.stopPropagation()}
                            onChange={e => update(a.id, { severity: e.target.value as AttackThreat['severity'] })}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>
                      </td>
                      <td style={tdStyle(t)} title={a.title}>
                        <input
                          style={{ ...cellInputStyle(t), fontWeight: 500 }}
                          value={a.title}
                          onClick={e => e.stopPropagation()}
                          onChange={e => update(a.id, { title: e.target.value })}
                          title={a.title}
                        />
                      </td>
                      <td style={tdStyle(t)}>
                        <button
                          aria-label="Delete"
                          style={{ width: 24, height: 24, border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', borderRadius: 4, fontSize: 14, fontWeight: 600 }}
                          onClick={e => { e.stopPropagation(); remove(a.id) }}
                        >✕</button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ background: t.bgInset, borderBottom: `1px solid ${t.border}` }}>
                        <td colSpan={6} style={{ padding: '12px 20px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <DetailField t={t} label="Description" value={a.description} onChange={v => update(a.id, { description: v })} />
                            <DetailField t={t} label="Mitigation" value={a.mitigation ?? ''} onChange={v => update(a.id, { mitigation: v.length > 0 ? v : undefined })} />
                            <DetailField t={t} label="Detection" value={a.detection ?? ''} onChange={v => update(a.id, { detection: v.length > 0 ? v : undefined })} />
                            <TechniqueFields t={t} a={a} onChange={patch => update(a.id, patch)} />
                          </div>
                          <RelatedThreats
                            t={t}
                            related={a.relatedThreatIds ?? []}
                            allThreats={threats ?? []}
                            onClick={onRelatedThreatClick}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function DetailField({ t, label, value, onChange }: { t: Theme; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{label}</span>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        style={{
          width: '100%', boxSizing: 'border-box', padding: '6px 8px',
          background: t.bgAlt, border: `1px solid ${t.border}`, borderRadius: 4,
          color: t.text, fontSize: 12, fontFamily: 'inherit', resize: 'vertical', outline: 'none',
        }}
      />
    </label>
  )
}

function TechniqueFields({ t, a, onChange }: { t: Theme; a: AttackThreat; onChange: (patch: Partial<AttackThreat>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Technique ID</span>
        <input
          value={a.techniqueId}
          onChange={e => onChange({ techniqueId: e.target.value })}
          placeholder="T1190 or T1190.001"
          style={{ width: '100%', padding: '6px 8px', boxSizing: 'border-box', background: t.bgAlt, border: `1px solid ${t.border}`, borderRadius: 4, color: t.text, fontSize: 12, fontFamily: fonts.mono, outline: 'none' }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Technique Name</span>
        <input
          value={a.techniqueName}
          onChange={e => onChange({ techniqueName: e.target.value })}
          style={{ width: '100%', padding: '6px 8px', boxSizing: 'border-box', background: t.bgAlt, border: `1px solid ${t.border}`, borderRadius: 4, color: t.text, fontSize: 12, fontFamily: 'inherit', outline: 'none' }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Tactic</span>
        <select
          value={a.tactic}
          onChange={e => onChange({ tactic: e.target.value as AttackThreat['tactic'] })}
          style={{ padding: '6px 8px', background: t.bgAlt, border: `1px solid ${t.border}`, borderRadius: 4, color: t.text, fontSize: 12, fontFamily: 'inherit', outline: 'none' }}
        >
          {Object.values(AttackTactic).map(tac => <option key={tac} value={tac}>{tac}</option>)}
        </select>
      </label>
    </div>
  )
}

function RelatedThreats({ t, related, allThreats, onClick }: {
  t: Theme
  related: string[]
  allThreats: ThreatList
  onClick?: (id: string) => void
}) {
  if (related.length === 0) return null
  return (
    <div style={{ marginTop: 12 }}>
      <span style={{ fontSize: 11, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.02em', display: 'block', marginBottom: 6 }}>
        Related STRIDE threats
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {related.map(rid => {
          const matched = allThreats.find(th => th.id === rid)
          const label = matched !== undefined ? `${rid} · ${matched.title}` : `${rid} (missing)`
          return (
            <button
              key={rid}
              onClick={() => onClick?.(rid)}
              style={{
                padding: '3px 8px', background: t.accentBg, border: `1px solid ${t.accent}`,
                borderRadius: 10, color: t.accent, fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >{label}</button>
          )
        })}
      </div>
    </div>
  )
}

const thStyle = (t: Theme): React.CSSProperties => ({
  textAlign: 'left', padding: '8px 12px',
  color: t.textMuted, fontWeight: 500, fontSize: 11,
  textTransform: 'uppercase', letterSpacing: '0.02em',
  borderBottom: `1px solid ${t.border}`,
})

const tdStyle = (_t: Theme): React.CSSProperties => ({
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
