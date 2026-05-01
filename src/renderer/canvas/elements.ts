import type { ElementDefinition } from 'cytoscape'
import type { Graph } from '../model/graph'
import { cyShapeFor } from './shapes'

export const toElements = (graph: Graph): ElementDefinition[] => {
  const lineZoneIds = new Set(graph.zones.filter(z => z.shape === 'line').map(z => z.id))
  return [
    ...graph.zones.filter(z => z.shape !== 'line').map(zone => ({
      group: 'nodes' as const,
      classes: 'zone',
      data: {
        id: zone.id,
        label: `${zone.name}\n${zone.id}`,
        ...(zone.description !== undefined ? { description: zone.description } : {}),
        ...(zone.parentId !== undefined ? { parent: zone.parentId } : {})
      },
      ...(zone.position !== undefined ? { position: zone.position } : {})
    })),
    ...graph.components.map(component => ({
      group: 'nodes' as const,
      data: {
        id: component.id,
        label: `${component.name}\n${component.id}`,
        ...(lineZoneIds.has(component.zoneId) ? {} : { parent: component.zoneId }),
        type: component.type,
        cyShape: cyShapeFor(component.type),
        ...(component.icon !== undefined ? { icon: component.icon } : {})
      },
      ...(component.position !== undefined ? { position: component.position } : {})
    })),
    ...graph.flows.map(flow => ({
      group: 'edges' as const,
      ...(flow.encrypted === true ? { classes: 'encrypted' } : flow.encrypted === false ? { classes: 'plaintext' } : {}),
      data: {
        id: flow.id,
        label: `${flow.name}\n${flow.id}`,
        source: flow.originatorId,
        target: flow.targetId,
        direction: flow.direction,
        ...(flow.protocol !== undefined ? { protocol: flow.protocol } : {}),
        ...(flow.encryption !== undefined ? { encryption: flow.encryption } : {})
      }
    }))
  ]
}
