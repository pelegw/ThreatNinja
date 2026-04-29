import type cytoscape from 'cytoscape'
import type { Graph } from '../model/graph'

export const exportToPng = (cy: cytoscape.Core): string =>
  cy.png({ scale: 2, full: true } as Parameters<typeof cy.png>[0]) as string

export const exportToSvg = (cy: cytoscape.Core): string =>
  (cy as cytoscape.Core & { svg: () => string }).svg()

export const exportToJson = (graph: Graph): string => JSON.stringify(graph, null, 2)
