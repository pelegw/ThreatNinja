import { describe, it, expect } from 'vitest'
import { toElements } from './elements'
import { ComponentType, FlowDirection, GraphSchema } from '../model/graph'

const makeGraph = (overrides = {}) =>
  GraphSchema.parse({
    id: 'g1',
    name: 'Test System',
    zones: [],
    components: [],
    flows: [],
    ...overrides
  })

describe('toElements', () => {
  it('returns empty array for an empty graph', () => {
    expect(toElements(makeGraph())).toEqual([])
  })

  it('maps each zone to a compound parent node', () => {
    const graph = makeGraph({ zones: [{ id: 'z1', name: 'DMZ' }] })
    const elements = toElements(graph)
    expect(elements).toHaveLength(1)
    expect(elements[0]).toMatchObject({
      group: 'nodes',
      data: { id: 'z1', label: 'DMZ' }
    })
    expect(elements[0]?.data).not.toHaveProperty('parent')
  })

  it('sets parent on a zone that has a parentId', () => {
    const graph = makeGraph({
      zones: [
        { id: 'z1', name: 'Outer' },
        { id: 'z2', name: 'Inner', parentId: 'z1' }
      ]
    })
    const inner = toElements(graph).find(el => el.data.id === 'z2')
    expect(inner?.data).toMatchObject({ parent: 'z1' })
  })

  it('does not set parent on a zone without a parentId', () => {
    const graph = makeGraph({ zones: [{ id: 'z1', name: 'Outer' }] })
    const outer = toElements(graph).find(el => el.data.id === 'z1')
    expect(outer?.data).not.toHaveProperty('parent')
  })

  it('preserves zone description in node data when present', () => {
    const graph = makeGraph({ zones: [{ id: 'z1', name: 'DMZ', description: 'Outer zone' }] })
    const [zone] = toElements(graph)
    expect(zone?.data).toMatchObject({ description: 'Outer zone' })
  })

  it('omits description key from zone node data when zone has no description', () => {
    const graph = makeGraph({ zones: [{ id: 'z1', name: 'DMZ' }] })
    const [zone] = toElements(graph)
    expect(zone?.data).not.toHaveProperty('description')
  })

  it('maps each component to a child node with parent set to its zoneId', () => {
    const graph = makeGraph({
      zones: [{ id: 'z1', name: 'DMZ' }],
      components: [{ id: 'c1', name: 'Web Server', type: ComponentType.Server, zoneId: 'z1' }]
    })
    const elements = toElements(graph)
    const componentEl = elements.find(el => el.data.id === 'c1')
    expect(componentEl).toMatchObject({
      group: 'nodes',
      data: { id: 'c1', label: 'Web Server', parent: 'z1', type: ComponentType.Server }
    })
  })

  it('maps a unidirectional flow to an edge', () => {
    const graph = makeGraph({
      flows: [{
        id: 'f1', name: 'HTTPS', originatorId: 'c1', targetId: 'c2',
        direction: FlowDirection.Unidirectional
      }]
    })
    const elements = toElements(graph)
    expect(elements[0]).toMatchObject({
      group: 'edges',
      data: { id: 'f1', label: 'HTTPS', source: 'c1', target: 'c2', direction: FlowDirection.Unidirectional }
    })
  })

  it('maps a bidirectional flow to an edge with bidirectional direction', () => {
    const graph = makeGraph({
      flows: [{
        id: 'f1', name: 'DB Sync', originatorId: 'c1', targetId: 'c2',
        direction: FlowDirection.Bidirectional
      }]
    })
    const [edge] = toElements(graph)
    expect(edge?.data).toMatchObject({ direction: FlowDirection.Bidirectional })
  })

  it('allows multiple flows between the same pair of components', () => {
    const graph = makeGraph({
      flows: [
        { id: 'f1', name: 'Request', originatorId: 'c1', targetId: 'c2', direction: FlowDirection.Unidirectional },
        { id: 'f2', name: 'Response', originatorId: 'c2', targetId: 'c1', direction: FlowDirection.Unidirectional }
      ]
    })
    expect(toElements(graph)).toHaveLength(2)
  })

  it('includes position in zone node element when zone has a position', () => {
    const graph = makeGraph({ zones: [{ id: 'z1', name: 'DMZ', position: { x: 100, y: 200 } }] })
    const el = toElements(graph).find(e => e.data.id === 'z1')
    expect(el?.position).toEqual({ x: 100, y: 200 })
  })

  it('omits position from zone node element when zone has no position', () => {
    const graph = makeGraph({ zones: [{ id: 'z1', name: 'DMZ' }] })
    const el = toElements(graph).find(e => e.data.id === 'z1')
    expect(el).not.toHaveProperty('position')
  })

  it('includes position in component node element when component has a position', () => {
    const graph = makeGraph({
      zones: [{ id: 'z1', name: 'DMZ' }],
      components: [{ id: 'c1', name: 'Web Server', type: ComponentType.Server, zoneId: 'z1', position: { x: 50, y: 75 } }]
    })
    const el = toElements(graph).find(e => e.data.id === 'c1')
    expect(el?.position).toEqual({ x: 50, y: 75 })
  })

  it('omits position from component node element when component has no position', () => {
    const graph = makeGraph({
      zones: [{ id: 'z1', name: 'DMZ' }],
      components: [{ id: 'c1', name: 'Web Server', type: ComponentType.Server, zoneId: 'z1' }]
    })
    const el = toElements(graph).find(e => e.data.id === 'c1')
    expect(el).not.toHaveProperty('position')
  })

  it('gives zone elements the "zone" class', () => {
    const graph = makeGraph({ zones: [{ id: 'z1', name: 'DMZ' }] })
    const el = toElements(graph).find(e => e.data.id === 'z1')
    expect((el as { classes?: string }).classes).toBe('zone')
  })

  it('gives an encrypted flow the "encrypted" class', () => {
    const graph = makeGraph({ flows: [{ id: 'f1', name: 'Call', originatorId: 'c1', targetId: 'c2', direction: FlowDirection.Unidirectional, encrypted: true }] })
    const el = toElements(graph).find(e => e.data.id === 'f1')
    expect((el as { classes?: string }).classes).toBe('encrypted')
  })

  it('gives a plaintext flow the "plaintext" class', () => {
    const graph = makeGraph({ flows: [{ id: 'f1', name: 'Call', originatorId: 'c1', targetId: 'c2', direction: FlowDirection.Unidirectional, encrypted: false }] })
    const el = toElements(graph).find(e => e.data.id === 'f1')
    expect((el as { classes?: string }).classes).toBe('plaintext')
  })

  it('gives a flow with no encryption setting no class', () => {
    const graph = makeGraph({ flows: [{ id: 'f1', name: 'Call', originatorId: 'c1', targetId: 'c2', direction: FlowDirection.Unidirectional }] })
    const el = toElements(graph).find(e => e.data.id === 'f1')
    expect((el as { classes?: string }).classes).toBeUndefined()
  })

  it('includes protocol in edge data when set', () => {
    const graph = makeGraph({ flows: [{ id: 'f1', name: 'Call', originatorId: 'c1', targetId: 'c2', direction: FlowDirection.Unidirectional, protocol: 'gRPC' }] })
    const el = toElements(graph).find(e => e.data.id === 'f1')
    expect(el?.data.protocol).toBe('gRPC')
  })

  it('includes encryption in edge data when set', () => {
    const graph = makeGraph({ flows: [{ id: 'f1', name: 'Call', originatorId: 'c1', targetId: 'c2', direction: FlowDirection.Unidirectional, encrypted: true, encryption: 'mTLS' }] })
    const el = toElements(graph).find(e => e.data.id === 'f1')
    expect(el?.data.encryption).toBe('mTLS')
  })

  it('produces nodes before edges (zones + components first, flows last)', () => {
    const graph = makeGraph({
      zones: [{ id: 'z1', name: 'DMZ' }],
      components: [{ id: 'c1', name: 'Web Server', type: ComponentType.Server, zoneId: 'z1' }],
      flows: [{ id: 'f1', name: 'HTTPS', originatorId: 'c1', targetId: 'c1', direction: FlowDirection.Unidirectional }]
    })
    const elements = toElements(graph)
    const nodeIndices = elements.flatMap((el, i) => el.group === 'nodes' ? [i] : [])
    const edgeIndices = elements.flatMap((el, i) => el.group === 'edges' ? [i] : [])
    expect(Math.max(...nodeIndices)).toBeLessThan(Math.min(...edgeIndices))
  })
})
