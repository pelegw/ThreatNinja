import type { Zone } from '../model/graph'

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
  if (isPickingZone) {
    return (
      <div style={containerStyle}>
        <h2 style={titleStyle}>Add Component</h2>
        <p style={instructionStyle}>Click a zone on the canvas to place the new component.</p>
        <button onClick={onCancelPickZone} style={secondaryBtnStyle}>Cancel</button>
      </div>
    )
  }

  if (flowDraft !== null) {
    return (
      <div style={containerStyle}>
        <h2 style={titleStyle}>Add Flow</h2>
        {flowDraft.stage === 'source' && (
          <p style={instructionStyle}>Click a source component on the canvas.</p>
        )}
        {flowDraft.stage === 'target' && (
          <p style={instructionStyle}>
            Click a target component on the canvas.<br />
            <span style={sourceNameStyle}>From: {flowDraft.sourceName}</span>
          </p>
        )}
        <button onClick={onCancelFlow} style={secondaryBtnStyle}>Cancel</button>
      </div>
    )
  }

  const hasZones = zones.length > 0

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>Add Element</h2>
      <div style={btnGroupStyle}>
        <button onClick={onAddZone} style={primaryBtnStyle}>Add Zone</button>
        <button onClick={onAddComponent} disabled={!hasZones} style={hasZones ? primaryBtnStyle : disabledBtnStyle}>
          Add Component
        </button>
        <button onClick={onStartFlow} disabled={!hasZones} style={hasZones ? primaryBtnStyle : disabledBtnStyle}>
          Add Flow
        </button>
      </div>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px'
}

const titleStyle: React.CSSProperties = {
  margin: '0 0 4px', fontSize: '13px', fontWeight: 600, color: '#a0a0d0',
  textTransform: 'uppercase', letterSpacing: '0.05em'
}

const btnGroupStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '8px'
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 12px', background: '#2a2a4e', color: '#e0e0ff',
  border: '1px solid #4a4a7e', borderRadius: '4px', cursor: 'pointer',
  fontSize: '13px', textAlign: 'left'
}

const disabledBtnStyle: React.CSSProperties = {
  ...primaryBtnStyle, background: '#1a1a3e', color: '#4a4a70', cursor: 'not-allowed'
}

const secondaryBtnStyle: React.CSSProperties = {
  padding: '6px 12px', background: '#2a2a4e', color: '#e0e0ff',
  border: '1px solid #4a4a7e', borderRadius: '4px', cursor: 'pointer', fontSize: '13px'
}

const instructionStyle: React.CSSProperties = {
  fontSize: '13px', color: '#c0c0e0', margin: 0, lineHeight: 1.5
}

const sourceNameStyle: React.CSSProperties = {
  color: '#a0a0ff', fontStyle: 'italic'
}
