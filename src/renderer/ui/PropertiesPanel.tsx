import { ComponentType, FlowDirection } from '../model/graph'
import type { Graph } from '../model/graph'

type Props = {
  graph: Graph
  elementId: string
  onUpdate: (graph: Graph) => void
  onClose: () => void
}

export default function PropertiesPanel({ graph, elementId, onUpdate, onClose }: Props): JSX.Element {
  const zone = graph.zones.find(z => z.id === elementId)
  const component = graph.components.find(c => c.id === elementId)
  const flow = graph.flows.find(f => f.id === elementId)

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span style={titleStyle}>
          {zone !== undefined ? 'Zone' : component !== undefined ? 'Component' : 'Flow'}
        </span>
        <button onClick={onClose} style={closeBtnStyle} aria-label="Close">✕</button>
      </div>

      {zone !== undefined && (
        <ZoneFields
          zone={zone}
          allZones={graph.zones}
          onUpdate={updated => onUpdate({ ...graph, zones: graph.zones.map(z => z.id === updated.id ? updated : z) })}
        />
      )}
      {component !== undefined && (
        <ComponentFields
          component={component}
          zones={graph.zones}
          onUpdate={updated => onUpdate({ ...graph, components: graph.components.map(c => c.id === updated.id ? updated : c) })}
        />
      )}
      {flow !== undefined && (
        <FlowFields
          flow={flow}
          graph={graph}
          onUpdate={updated => onUpdate({ ...graph, flows: graph.flows.map(f => f.id === updated.id ? updated : f) })}
        />
      )}
    </div>
  )
}

function ZoneFields({ zone, allZones, onUpdate }: {
  zone: NonNullable<Graph['zones'][number]>
  allZones: Graph['zones']
  onUpdate: (z: typeof zone) => void
}) {
  return (
    <div style={fieldsStyle}>
      <label style={labelStyle}>
        Name
        <input
          style={inputStyle}
          value={zone.name}
          onChange={e => onUpdate({ ...zone, name: e.target.value })}
        />
      </label>
      <label style={labelStyle}>
        Description
        <input
          style={inputStyle}
          value={zone.description ?? ''}
          onChange={e => onUpdate({ ...zone, ...(e.target.value ? { description: e.target.value } : {}) })}
        />
      </label>
      <label style={labelStyle}>
        Parent Zone
        <select
          style={selectStyle}
          value={zone.parentId ?? ''}
          onChange={e => {
            const val = e.target.value
            onUpdate(val ? { ...zone, parentId: val } : { ...zone, parentId: undefined })
          }}
          aria-label="Parent Zone"
        >
          <option value="">None</option>
          {allZones.filter(z => z.id !== zone.id).map(z => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>
      </label>
    </div>
  )
}

function ComponentFields({ component, zones, onUpdate }: {
  component: NonNullable<Graph['components'][number]>
  zones: Graph['zones']
  onUpdate: (c: typeof component) => void
}) {
  return (
    <div style={fieldsStyle}>
      <label style={labelStyle}>
        Name
        <input
          style={inputStyle}
          value={component.name}
          onChange={e => onUpdate({ ...component, name: e.target.value })}
        />
      </label>
      <label style={labelStyle}>
        Type
        <select
          style={selectStyle}
          value={component.type}
          onChange={e => onUpdate({ ...component, type: e.target.value as ComponentType })}
          aria-label="Type"
        >
          {Object.entries(ComponentType).map(([label, value]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <label style={labelStyle}>
        Zone
        <select
          style={selectStyle}
          value={component.zoneId}
          onChange={e => onUpdate({ ...component, zoneId: e.target.value })}
          aria-label="Zone"
        >
          {zones.map(z => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>
      </label>
    </div>
  )
}

function FlowFields({ flow, graph, onUpdate }: {
  flow: NonNullable<Graph['flows'][number]>
  graph: Graph
  onUpdate: (f: typeof flow) => void
}) {
  const originator = graph.components.find(c => c.id === flow.originatorId)
  const target = graph.components.find(c => c.id === flow.targetId)

  return (
    <div style={fieldsStyle}>
      <label style={labelStyle}>
        Name
        <input
          style={inputStyle}
          value={flow.name}
          onChange={e => onUpdate({ ...flow, name: e.target.value })}
        />
      </label>
      <label style={labelStyle}>
        Protocol
        <input
          id="flow-protocol"
          aria-label="Protocol"
          style={inputStyle}
          value={flow.protocol ?? ''}
          placeholder="e.g. HTTP, gRPC, SQL"
          onChange={e => onUpdate({ ...flow, protocol: e.target.value || undefined })}
        />
      </label>
      <label style={{ ...labelStyle, flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
        <input
          type="checkbox"
          aria-label="Encrypted"
          checked={flow.encrypted ?? false}
          onChange={e => onUpdate({ ...flow, encrypted: e.target.checked, ...(!e.target.checked ? { encryption: undefined } : {}) })}
        />
        Encrypted
      </label>
      {flow.encrypted === true && (
        <label style={labelStyle}>
          Encryption Method
          <input
            aria-label="Encryption Method"
            style={inputStyle}
            value={flow.encryption ?? ''}
            placeholder="e.g. TLS, mTLS"
            onChange={e => onUpdate({ ...flow, encryption: e.target.value || undefined })}
          />
        </label>
      )}
      <label style={labelStyle}>
        Direction
        <select
          style={selectStyle}
          value={flow.direction}
          onChange={e => onUpdate({ ...flow, direction: e.target.value as FlowDirection })}
          aria-label="Direction"
        >
          <option value={FlowDirection.Unidirectional}>Unidirectional</option>
          <option value={FlowDirection.Bidirectional}>Bidirectional</option>
        </select>
      </label>
      <div style={infoRowStyle}>
        <span style={infoLabelStyle}>From</span>
        <span style={infoValueStyle}>{originator?.name ?? flow.originatorId}</span>
      </div>
      <div style={infoRowStyle}>
        <span style={infoLabelStyle}>To</span>
        <span style={infoValueStyle}>{target?.name ?? flow.targetId}</span>
      </div>
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  width: '320px', minWidth: '320px', height: '100%', background: '#16162a',
  borderLeft: '1px solid #3a3a6e', display: 'flex', flexDirection: 'column', overflow: 'hidden'
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

const fieldsStyle: React.CSSProperties = {
  padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto'
}

const labelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#a0a0c0'
}

const inputStyle: React.CSSProperties = {
  padding: '6px 8px', background: '#2a2a4e', color: '#e0e0ff',
  border: '1px solid #4a4a7e', borderRadius: '4px', fontSize: '13px', fontFamily: 'inherit'
}

const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: 'pointer'
}

const infoRowStyle: React.CSSProperties = {
  display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px'
}

const infoLabelStyle: React.CSSProperties = {
  color: '#a0a0c0', width: '36px', flexShrink: 0
}

const infoValueStyle: React.CSSProperties = {
  color: '#e0e0ff', background: '#2a2a4e', padding: '4px 8px', borderRadius: '4px', flex: 1
}
