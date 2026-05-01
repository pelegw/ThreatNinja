import { ComponentType, FlowDirection } from '../model/graph'
import type { Graph } from '../model/graph'
import { ICONS_BY_TYPE } from '../canvas/shapes'
import { useTheme, inputStyle, closeBtnStyle, panelHeaderStyle, sectionTitleStyle } from './tokens'

type Props = {
  graph: Graph
  elementId: string
  onUpdate: (graph: Graph) => void
  onClose: () => void
}

export default function PropertiesPanel({ graph, elementId, onUpdate, onClose }: Props): JSX.Element {
  const t = useTheme()
  const zone = graph.zones.find(z => z.id === elementId)
  const component = graph.components.find(c => c.id === elementId)
  const flow = graph.flows.find(f => f.id === elementId)

  return (
    <div style={{
      width: '100%', height: '100%', background: t.bgAlt,
      display: 'flex', flexDirection: 'column', overflow: 'hidden'
    }}>
      <div style={panelHeaderStyle(t)}>
        <span style={sectionTitleStyle(t)}>
          {zone !== undefined ? 'Zone' : component !== undefined ? 'Component' : 'Flow'}
        </span>
        <button onClick={onClose} style={closeBtnStyle(t)} aria-label="Close">✕</button>
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
  const t = useTheme()
  const isLine = zone.shape === 'line'
  return (
    <div style={fieldsStyle}>
      <label style={labelStyle(t)}>
        Name
        <input style={inputStyle(t)} value={zone.name} onChange={e => onUpdate({ ...zone, name: e.target.value })} />
      </label>
      <label style={labelStyle(t)}>
        Description
        <input style={inputStyle(t)} value={zone.description ?? ''} onChange={e => onUpdate({ ...zone, ...(e.target.value ? { description: e.target.value } : {}) })} />
      </label>
      <label style={labelStyle(t)}>
        Shape
        <select
          style={{ ...inputStyle(t), cursor: 'pointer' }}
          value={zone.shape ?? 'rect'}
          onChange={e => {
            const next = e.target.value as 'rect' | 'line'
            if (next === 'line') {
              const start = zone.position ?? { x: 0, y: 0 }
              const endPosition = zone.endPosition ?? { x: start.x + 200, y: start.y }
              onUpdate({ ...zone, shape: 'line', position: start, endPosition, parentId: undefined })
            } else {
              const { endPosition: _e, midPosition: _m, ...rest } = zone
              onUpdate({ ...rest, shape: 'rect' })
            }
          }}
          aria-label="Shape"
        >
          <option value="rect">Rectangle</option>
          <option value="line">Line</option>
        </select>
      </label>
      {!isLine && (
        <label style={labelStyle(t)}>
          Parent Zone
          <select
            style={{ ...inputStyle(t), cursor: 'pointer' }}
            value={zone.parentId ?? ''}
            onChange={e => {
              const val = e.target.value
              onUpdate(val ? { ...zone, parentId: val } : { ...zone, parentId: undefined })
            }}
            aria-label="Parent Zone"
          >
            <option value="">None</option>
            {allZones.filter(z => z.id !== zone.id && z.shape !== 'line').map(z => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}

function ComponentFields({ component, zones, onUpdate }: {
  component: NonNullable<Graph['components'][number]>
  zones: Graph['zones']
  onUpdate: (c: typeof component) => void
}) {
  const t = useTheme()
  return (
    <div style={fieldsStyle}>
      <label style={labelStyle(t)}>
        Name
        <input style={inputStyle(t)} value={component.name} onChange={e => onUpdate({ ...component, name: e.target.value })} />
      </label>
      <label style={labelStyle(t)}>
        Type
        <select
          style={{ ...inputStyle(t), cursor: 'pointer' }}
          value={component.type}
          onChange={e => {
            const nextType = e.target.value as ComponentType
            const { icon: _drop, ...rest } = component
            onUpdate({ ...rest, type: nextType })
          }}
          aria-label="Type"
        >
          {Object.entries(ComponentType).map(([label, value]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <label style={labelStyle(t)}>
        Icon
        <select
          style={{ ...inputStyle(t), cursor: 'pointer' }}
          value={component.icon ?? ''}
          onChange={e => {
            const val = e.target.value
            if (val === '') {
              const { icon: _drop, ...rest } = component
              onUpdate(rest)
            } else {
              onUpdate({ ...component, icon: val })
            }
          }}
          aria-label="Icon"
        >
          <option value="">(none)</option>
          {ICONS_BY_TYPE[component.type].map(icon => (
            <option key={icon} value={icon}>{icon}</option>
          ))}
        </select>
      </label>
      <label style={labelStyle(t)}>
        Zone
        <select style={{ ...inputStyle(t), cursor: 'pointer' }} value={component.zoneId} onChange={e => onUpdate({ ...component, zoneId: e.target.value })} aria-label="Zone">
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
  const t = useTheme()

  return (
    <div style={fieldsStyle}>
      <label style={labelStyle(t)}>
        Name
        <input style={inputStyle(t)} value={flow.name} onChange={e => onUpdate({ ...flow, name: e.target.value })} />
      </label>
      <label style={labelStyle(t)}>
        Protocol
        <input
          id="flow-protocol"
          aria-label="Protocol"
          style={inputStyle(t)}
          value={flow.protocol ?? ''}
          placeholder="e.g. HTTP, gRPC, SQL"
          onChange={e => onUpdate({ ...flow, protocol: e.target.value || undefined })}
        />
      </label>
      <label style={{ ...labelStyle(t), flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input
          type="checkbox"
          aria-label="Encrypted"
          checked={flow.encrypted ?? false}
          onChange={e => onUpdate({ ...flow, encrypted: e.target.checked, ...(!e.target.checked ? { encryption: undefined } : {}) })}
        />
        Encrypted
      </label>
      {flow.encrypted === true && (
        <label style={labelStyle(t)}>
          Encryption Method
          <input
            aria-label="Encryption Method"
            style={inputStyle(t)}
            value={flow.encryption ?? ''}
            placeholder="e.g. TLS, mTLS"
            onChange={e => onUpdate({ ...flow, encryption: e.target.value || undefined })}
          />
        </label>
      )}
      <label style={labelStyle(t)}>
        Direction
        <select style={{ ...inputStyle(t), cursor: 'pointer' }} value={flow.direction} onChange={e => onUpdate({ ...flow, direction: e.target.value as FlowDirection })} aria-label="Direction">
          <option value={FlowDirection.Unidirectional}>Unidirectional</option>
          <option value={FlowDirection.Bidirectional}>Bidirectional</option>
        </select>
      </label>
      <label style={labelStyle(t)}>
        Source
        <select
          style={{ ...inputStyle(t), cursor: 'pointer' }}
          value={flow.originatorId}
          onChange={e => onUpdate({ ...flow, originatorId: e.target.value })}
          aria-label="Source"
        >
          {graph.components.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>
      <label style={labelStyle(t)}>
        Target
        <select
          style={{ ...inputStyle(t), cursor: 'pointer' }}
          value={flow.targetId}
          onChange={e => onUpdate({ ...flow, targetId: e.target.value })}
          aria-label="Target"
        >
          {graph.components.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>
    </div>
  )
}

const fieldsStyle: React.CSSProperties = {
  padding: 16, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto'
}

const labelStyle = (t: { textMuted: string }): React.CSSProperties => ({
  display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: t.textMuted
})
