import type { Zone } from '../model/graph'
import { useTheme, secondaryBtnStyle, sectionTitleStyle } from './tokens'

export type FlowDraft =
  | null
  | { stage: 'source' }
  | { stage: 'target'; sourceId: string; sourceName: string }

type Props = {
  zones: Zone[]
  onAddZone: () => void
  onAddComponent: () => void
  onStartFlow: () => void
  onCancelFlow: () => void
  onCancelPickZone: () => void
  flowDraft: FlowDraft
  isPickingZone: boolean
}

export default function PalettePanel({ zones, onAddZone, onAddComponent, onStartFlow, onCancelFlow, onCancelPickZone, flowDraft, isPickingZone }: Props): JSX.Element {
  const t = useTheme()

  if (isPickingZone) {
    return (
      <div style={containerStyle}>
        <h2 style={sectionTitleStyle(t)}>Add Component</h2>
        <p style={{ fontSize: 13, color: t.textMuted, margin: 0, lineHeight: 1.5 }}>Click a zone on the canvas to place the new component.</p>
        <button onClick={onCancelPickZone} style={secondaryBtnStyle(t)}>Cancel</button>
      </div>
    )
  }

  if (flowDraft !== null) {
    return (
      <div style={containerStyle}>
        <h2 style={sectionTitleStyle(t)}>Add Flow</h2>
        {flowDraft.stage === 'source' && (
          <p style={{ fontSize: 13, color: t.textMuted, margin: 0, lineHeight: 1.5 }}>Click a source component on the canvas.</p>
        )}
        {flowDraft.stage === 'target' && (
          <p style={{ fontSize: 13, color: t.textMuted, margin: 0, lineHeight: 1.5 }}>
            Click a target component on the canvas.<br />
            <span style={{ color: t.accent, fontStyle: 'italic' }}>From: {flowDraft.sourceName}</span>
          </p>
        )}
        <button onClick={onCancelFlow} style={secondaryBtnStyle(t)}>Cancel</button>
      </div>
    )
  }

  const hasZones = zones.length > 0

  const palBtn: React.CSSProperties = {
    padding: '8px 12px', background: t.bgInset, color: t.text,
    border: `1px solid ${t.border}`, borderRadius: 6, cursor: 'pointer',
    fontSize: 13, textAlign: 'left', fontFamily: 'inherit',
  }
  const disabledPalBtn: React.CSSProperties = {
    ...palBtn, background: t.bgInset, color: t.textDim, cursor: 'not-allowed',
  }

  return (
    <div style={containerStyle}>
      <h2 style={sectionTitleStyle(t)}>Add Element</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={onAddZone} style={palBtn}>Add Zone</button>
        <button onClick={onAddComponent} disabled={!hasZones} style={hasZones ? palBtn : disabledPalBtn}>
          Add Component
        </button>
        <button onClick={onStartFlow} disabled={!hasZones} style={hasZones ? palBtn : disabledPalBtn}>
          Add Flow
        </button>
      </div>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  padding: 16, display: 'flex', flexDirection: 'column', gap: 12
}
