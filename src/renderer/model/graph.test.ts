import { describe, it, expect } from 'vitest'
import {
  ZoneSchema, ComponentSchema, ComponentType,
  FlowSchema, FlowDirection, GraphSchema,
  serializeGraph, deserializeGraph
} from './graph'

describe('Zone', () => {
  it('parses a valid zone', () => {
    const result = ZoneSchema.parse({ id: 'z1', name: 'DMZ' })
    expect(result).toEqual({ id: 'z1', name: 'DMZ' })
  })

  it('accepts an optional description', () => {
    const result = ZoneSchema.parse({ id: 'z1', name: 'DMZ', description: 'Demilitarized zone' })
    expect(result).toEqual({ id: 'z1', name: 'DMZ', description: 'Demilitarized zone' })
  })

  it('accepts an optional position with x and y coordinates', () => {
    const result = ZoneSchema.parse({ id: 'z1', name: 'DMZ', position: { x: 100, y: 200 } })
    expect(result.position).toEqual({ x: 100, y: 200 })
  })

  it('preserves zone without position (position remains undefined)', () => {
    const result = ZoneSchema.parse({ id: 'z1', name: 'DMZ' })
    expect(result.position).toBeUndefined()
  })

  it('throws when position has a non-numeric coordinate', () => {
    expect(() => ZoneSchema.parse({ id: 'z1', name: 'DMZ', position: { x: 'bad', y: 200 } })).toThrow()
  })

  it('accepts an optional shape field with rect or line', () => {
    expect(ZoneSchema.parse({ id: 'z1', name: 'DMZ', shape: 'rect' }).shape).toBe('rect')
    expect(ZoneSchema.parse({ id: 'z1', name: 'DMZ', shape: 'line' }).shape).toBe('line')
  })

  it('preserves zone without a shape (shape remains undefined for legacy diagrams)', () => {
    expect(ZoneSchema.parse({ id: 'z1', name: 'DMZ' }).shape).toBeUndefined()
  })

  it('throws when shape is an unknown value', () => {
    expect(() => ZoneSchema.parse({ id: 'z1', name: 'DMZ', shape: 'pentagon' })).toThrow()
  })

  it('accepts an optional endPosition with x and y coordinates (line endpoint)', () => {
    const result = ZoneSchema.parse({ id: 'z1', name: 'DMZ', shape: 'line', position: { x: 0, y: 0 }, endPosition: { x: 200, y: 0 } })
    expect(result.endPosition).toEqual({ x: 200, y: 0 })
  })

  it('accepts an optional midPosition for curved boundaries', () => {
    const result = ZoneSchema.parse({ id: 'z1', name: 'DMZ', shape: 'line', position: { x: 0, y: 0 }, endPosition: { x: 200, y: 0 }, midPosition: { x: 100, y: 50 } })
    expect(result.midPosition).toEqual({ x: 100, y: 50 })
  })

  it('preserves zone without midPosition (line stays straight by default)', () => {
    const result = ZoneSchema.parse({ id: 'z1', name: 'DMZ', shape: 'line' })
    expect(result.midPosition).toBeUndefined()
  })

  it('throws when id is missing', () => {
    expect(() => ZoneSchema.parse({ name: 'DMZ' })).toThrow()
  })

  it('throws when name is missing', () => {
    expect(() => ZoneSchema.parse({ id: 'z1' })).toThrow()
  })

  it('strips unknown fields', () => {
    const result = ZoneSchema.parse({ id: 'z1', name: 'DMZ', extra: 'ignored' })
    expect(result).not.toHaveProperty('extra')
  })
})

describe('Component', () => {
  it('parses a valid component for each ComponentType', () => {
    for (const type of Object.values(ComponentType)) {
      const result = ComponentSchema.parse({ id: 'c1', name: 'Web Server', type, zoneId: 'z1' })
      expect(result).toEqual({ id: 'c1', name: 'Web Server', type, zoneId: 'z1' })
    }
  })

  it('exposes the four DFD node classes', () => {
    expect(new Set(Object.values(ComponentType))).toEqual(
      new Set(['process', 'external', 'datastore', 'queue'])
    )
  })

  it('accepts an optional position with x and y coordinates', () => {
    const result = ComponentSchema.parse({ id: 'c1', name: 'Web Server', type: ComponentType.Process, zoneId: 'z1', position: { x: 50, y: 75 } })
    expect(result.position).toEqual({ x: 50, y: 75 })
  })

  it('preserves component without position (position remains undefined)', () => {
    const result = ComponentSchema.parse({ id: 'c1', name: 'Web Server', type: ComponentType.Process, zoneId: 'z1' })
    expect(result.position).toBeUndefined()
  })

  it('accepts an optional icon string identifying the subclass', () => {
    const result = ComponentSchema.parse({ id: 'c1', name: 'Web Server', type: ComponentType.Process, zoneId: 'z1', icon: 'server' })
    expect(result.icon).toBe('server')
  })

  it('preserves component without icon (icon remains undefined when type is unknown)', () => {
    const result = ComponentSchema.parse({ id: 'c1', name: 'Web Server', type: ComponentType.Process, zoneId: 'z1' })
    expect(result.icon).toBeUndefined()
  })

  it('throws when type is an unknown value', () => {
    expect(() =>
      ComponentSchema.parse({ id: 'c1', name: 'Web Server', type: 'rocket', zoneId: 'z1' })
    ).toThrow()
  })

  it('throws when zoneId is missing', () => {
    expect(() =>
      ComponentSchema.parse({ id: 'c1', name: 'Web Server', type: ComponentType.Process })
    ).toThrow()
  })

  it('strips unknown fields', () => {
    const result = ComponentSchema.parse({
      id: 'c1',
      name: 'Web Server',
      type: ComponentType.Process,
      zoneId: 'z1',
      extra: 'ignored'
    })
    expect(result).not.toHaveProperty('extra')
  })
})

describe('Flow', () => {
  it('parses a unidirectional flow', () => {
    const flow = { id: 'f1', name: 'HTTPS Request', originatorId: 'c1', targetId: 'c2', direction: FlowDirection.Unidirectional }
    expect(FlowSchema.parse(flow)).toEqual(flow)
  })

  it('parses a bidirectional flow', () => {
    const flow = { id: 'f1', name: 'DB Connection', originatorId: 'c1', targetId: 'c2', direction: FlowDirection.Bidirectional }
    expect(FlowSchema.parse(flow)).toEqual(flow)
  })

  it('throws when direction is an unknown value', () => {
    expect(() =>
      FlowSchema.parse({ id: 'f1', name: 'Flow', originatorId: 'c1', targetId: 'c2', direction: 'sideways' })
    ).toThrow()
  })

  it('allows originatorId === targetId (self-loop)', () => {
    const flow = { id: 'f1', name: 'Self', originatorId: 'c1', targetId: 'c1', direction: FlowDirection.Unidirectional }
    expect(FlowSchema.parse(flow)).toEqual(flow)
  })

  it('throws when originatorId is missing', () => {
    expect(() =>
      FlowSchema.parse({ id: 'f1', name: 'Flow', targetId: 'c2', direction: FlowDirection.Unidirectional })
    ).toThrow()
  })

  it('strips unknown fields', () => {
    const result = FlowSchema.parse({
      id: 'f1', name: 'Flow', originatorId: 'c1', targetId: 'c2',
      direction: FlowDirection.Unidirectional, extra: 'ignored'
    })
    expect(result).not.toHaveProperty('extra')
  })

  it('accepts an optional protocol field', () => {
    const flow = { id: 'f1', name: 'API Call', originatorId: 'c1', targetId: 'c2', direction: FlowDirection.Unidirectional, protocol: 'HTTP' }
    expect(FlowSchema.parse(flow).protocol).toBe('HTTP')
  })

  it('accepts an optional encrypted boolean field', () => {
    const flow = { id: 'f1', name: 'Secure', originatorId: 'c1', targetId: 'c2', direction: FlowDirection.Unidirectional, encrypted: true }
    expect(FlowSchema.parse(flow).encrypted).toBe(true)
  })

  it('accepts an optional encryption field', () => {
    const flow = { id: 'f1', name: 'Secure', originatorId: 'c1', targetId: 'c2', direction: FlowDirection.Unidirectional, encrypted: true, encryption: 'TLS' }
    expect(FlowSchema.parse(flow).encryption).toBe('TLS')
  })

  it('allows omitting protocol, encrypted, and encryption (backward compat)', () => {
    const flow = { id: 'f1', name: 'Flow', originatorId: 'c1', targetId: 'c2', direction: FlowDirection.Unidirectional }
    const result = FlowSchema.parse(flow)
    expect(result.protocol).toBeUndefined()
    expect(result.encrypted).toBeUndefined()
    expect(result.encryption).toBeUndefined()
  })
})

describe('Graph', () => {
  const zone = { id: 'z1', name: 'DMZ' }
  const component = { id: 'c1', name: 'Web Server', type: ComponentType.Process, zoneId: 'z1' }
  const flow = { id: 'f1', name: 'HTTPS', originatorId: 'c1', targetId: 'c1', direction: FlowDirection.Unidirectional }

  it('parses a graph with zones, components, and flows', () => {
    const graph = { id: 'g1', name: 'My System', zones: [zone], components: [component], flows: [flow] }
    expect(GraphSchema.parse(graph)).toEqual(graph)
  })

  it('parses an empty graph with no zones, components, or flows', () => {
    const graph = { id: 'g1', name: 'Empty', zones: [], components: [], flows: [] }
    expect(GraphSchema.parse(graph)).toEqual(graph)
  })

  it('throws when id is missing', () => {
    expect(() => GraphSchema.parse({ name: 'My System', zones: [], components: [], flows: [] })).toThrow()
  })

  it('throws when zones is missing', () => {
    expect(() => GraphSchema.parse({ id: 'g1', name: 'My System', components: [], flows: [] })).toThrow()
  })

  it('throws when a nested component has an invalid type', () => {
    const badComponent = { id: 'c1', name: 'X', type: 'rocket', zoneId: 'z1' }
    expect(() =>
      GraphSchema.parse({ id: 'g1', name: 'My System', zones: [zone], components: [badComponent], flows: [] })
    ).toThrow()
  })

  it('strips unknown fields on the graph and nested objects', () => {
    const graph = { id: 'g1', name: 'My System', zones: [], components: [], flows: [], extra: 'ignored' }
    expect(GraphSchema.parse(graph)).not.toHaveProperty('extra')
  })
})

const makeGraph = () => GraphSchema.parse({
  id: 'g1',
  name: 'My System',
  zones: [{ id: 'z1', name: 'DMZ' }],
  components: [{ id: 'c1', name: 'Web Server', type: ComponentType.Process, zoneId: 'z1' }],
  flows: [{ id: 'f1', name: 'HTTPS', originatorId: 'c1', targetId: 'c1', direction: FlowDirection.Unidirectional }]
})

describe('serializeGraph', () => {
  it('produces valid JSON', () => {
    expect(() => JSON.parse(serializeGraph(makeGraph()))).not.toThrow()
  })

  it('preserves all field values (no data loss)', () => {
    const graph = makeGraph()
    const parsed = JSON.parse(serializeGraph(graph))
    expect(parsed).toEqual(graph)
  })

  it('is idempotent: serializing twice gives the same string', () => {
    const graph = makeGraph()
    expect(serializeGraph(graph)).toEqual(serializeGraph(graph))
  })
})

describe('deserializeGraph', () => {
  it('deserializes valid JSON back to a Graph', () => {
    const graph = makeGraph()
    expect(deserializeGraph(serializeGraph(graph))).toEqual(graph)
  })

  it('round-trips cleanly: serialize → deserialize → serialize is stable', () => {
    const graph = makeGraph()
    const once = serializeGraph(graph)
    const twice = serializeGraph(deserializeGraph(once))
    expect(once).toEqual(twice)
  })

  it('throws on invalid JSON string', () => {
    expect(() => deserializeGraph('not json')).toThrow()
  })

  it('throws when JSON does not match Graph schema', () => {
    expect(() => deserializeGraph(JSON.stringify({ id: 'g1' }))).toThrow()
  })

  it('strips unknown top-level keys rather than passing them through', () => {
    const json = JSON.stringify({ id: 'g1', name: 'X', zones: [], components: [], flows: [], surprise: true })
    expect(deserializeGraph(json)).not.toHaveProperty('surprise')
  })
})
