import type { ElementDefinition } from 'cytoscape'
import type { Graph } from '../model/graph'

export const toElements = (graph: Graph): ElementDefinition[] => [
  ...graph.zones.map(zone => ({
    group: 'nodes' as const,
    classes: 'zone',
    data: {
      id: zone.id,
      label: zone.name,
      ...(zone.description !== undefined ? { description: zone.description } : {}),
      ...(zone.parentId !== undefined ? { parent: zone.parentId } : {})
    },
    ...(zone.position !== undefined ? { position: zone.position } : {})
  })),
  ...graph.components.map(component => ({
    group: 'nodes' as const,
    data: {
      id: component.id,
      label: component.name,
      parent: component.zoneId,
      type: component.type
    },
    ...(component.position !== undefined ? { position: component.position } : {})
  })),
  ...graph.flows.map(flow => ({
    group: 'edges' as const,
    ...(flow.encrypted === true ? { classes: 'encrypted' } : flow.encrypted === false ? { classes: 'plaintext' } : {}),
    data: {
      id: flow.id,
      label: flow.name,
      source: flow.originatorId,
      target: flow.targetId,
      direction: flow.direction,
      ...(flow.protocol !== undefined ? { protocol: flow.protocol } : {}),
      ...(flow.encryption !== undefined ? { encryption: flow.encryption } : {})
    }
  }))
]
