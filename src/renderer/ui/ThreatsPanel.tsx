import { StrideCategory } from '../model/threats'
import type { Threat, ThreatList } from '../model/threats'

type Props = {
  threats: ThreatList | null
  onClose?: () => void
  selectedId?: string
  onThreatSelected?: (affectedId: string) => void
  onThreatsChange?: (threats: Threat[]) => void
}

export default function ThreatsPanel({ threats, onClose, selectedId, onThreatSelected, onThreatsChange }: Props): JSX.Element {
  const update = (id: string, patch: Partial<Threat>) => {
    onThreatsChange?.((threats ?? []).map(t => t.id === id ? { ...t, ...patch } : t))
  }

  const remove = (id: string) => {
    onThreatsChange?.((threats ?? []).filter(t => t.id !== id))
  }

  const addThreat = () => {
    const newThreat: Threat = {
      id: crypto.randomUUID(),
      title: '',
      category: StrideCategory.Spoofing,
      description: '',
      affectedId: '',
      severity: 'medium'
    }
    onThreatsChange?.([...(threats ?? []), newThreat])
  }

  const heading = threats === null
    ? 'Threats'
    : `${threats.length} threats identified`

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={{ margin: 0, fontSize: '14px', color: '#e0e0ff', flex: 1 }}>{heading}</h2>
        {threats !== null && <button onClick={addThreat} style={addBtnStyle}>Add Threat</button>}
        {onClose !== undefined && <button onClick={onClose} style={closeBtnStyle}>Close</button>}
      </div>
      {threats === null ? (
        <p style={emptyStyle}>Run Analyze to identify threats.</p>
      ) : threats.length === 0 ? (
        <p style={emptyStyle}>No threats found.</p>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {['Title', 'Category', 'Severity', 'Description', 'Mitigation', 'Affected', ''].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {threats.map(t => (
                <tr
                  key={t.id}
                  style={{ ...rowStyle, ...(t.affectedId === selectedId ? selectedRowStyle : {}) }}
                  aria-selected={t.affectedId === selectedId ? 'true' : undefined}
                  onClick={() => onThreatSelected?.(t.affectedId)}
                >
                  <td style={tdStyle}>
                    <input style={cellInputStyle} value={t.title} onChange={e => update(t.id, { title: e.target.value })} />
                  </td>
                  <td style={tdStyle}>
                    <select style={cellSelectStyle} value={t.category} onChange={e => update(t.id, { category: e.target.value as typeof t.category })} >
                      {Object.values(StrideCategory).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td style={{ ...tdStyle, color: severityColor(t.severity) }}>
                    <select style={{ ...cellSelectStyle, color: severityColor(t.severity) }} value={t.severity} onChange={e => update(t.id, { severity: e.target.value as typeof t.severity })} >
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <input style={cellInputStyle} value={t.description} onChange={e => update(t.id, { description: e.target.value })} />
                  </td>
                  <td style={tdStyle}>
                    <input style={cellInputStyle} value={t.mitigation ?? ''} onChange={e => update(t.id, { mitigation: e.target.value || undefined })} />
                  </td>
                  <td style={tdStyle}>{t.affectedId}</td>
                  <td style={tdStyle}>
                    <button aria-label="Delete" style={deleteBtnStyle} onClick={e => { e.stopPropagation(); remove(t.id) }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const severityColor = (severity: string): string =>
  severity === 'high' ? '#ff6b6b' : severity === 'medium' ? '#ffd93d' : '#6bcb77'

const containerStyle: React.CSSProperties = {
  height: '100%', display: 'flex', flexDirection: 'column',
  padding: '8px 16px', background: '#1a1a2e', overflow: 'hidden'
}

const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', marginBottom: '8px', flexShrink: 0
}

const emptyStyle: React.CSSProperties = { color: '#a0a0c0', fontSize: '13px', margin: 0 }

const tableStyle: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#e0e0ff'
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #4a4a7e',
  color: '#a0a0c0', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase'
}

const tdStyle: React.CSSProperties = {
  padding: '3px 6px', borderBottom: '1px solid #2a2a4e', verticalAlign: 'middle'
}

const rowStyle: React.CSSProperties = { background: 'transparent', cursor: 'pointer' }
const selectedRowStyle: React.CSSProperties = { background: '#2a2a5e' }

const cellInputStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#e0e0ff',
  fontSize: '12px', width: '100%', fontFamily: 'inherit', outline: 'none'
}

const cellSelectStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#e0e0ff',
  fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer', outline: 'none'
}

const closeBtnStyle: React.CSSProperties = {
  padding: '3px 10px', background: '#2a2a4e', color: '#e0e0ff',
  border: '1px solid #4a4a7e', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginLeft: '8px'
}

const addBtnStyle: React.CSSProperties = {
  padding: '3px 10px', background: '#2a4e2a', color: '#c0ffc0',
  border: '1px solid #4a7e4a', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
}

const deleteBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#a06060', cursor: 'pointer', fontSize: '13px', padding: '0 4px'
}
