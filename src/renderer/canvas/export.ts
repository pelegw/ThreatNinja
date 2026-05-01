import type cytoscape from 'cytoscape'
import type { Graph } from '../model/graph'
import type { Threat } from '../model/threats'

export const exportToPng = (cy: cytoscape.Core): string =>
  cy.png({ scale: 2, full: true, bg: '#ffffff' } as Parameters<typeof cy.png>[0]) as string

export const exportToSvg = (cy: cytoscape.Core): string =>
  (cy as cytoscape.Core & { svg: () => string }).svg()

export const exportToJson = (graph: Graph): string => JSON.stringify(graph, null, 2)

const csvEscape = (value: string): string =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value

const CSV_HEADER = 'ID,Title,Category,Severity,Description,Mitigation,Affected Element'

export const exportThreatsToCsv = (threats: readonly Threat[]): string => {
  const rows = threats.map(t =>
    [t.id, t.title, t.category, t.severity, t.description, t.mitigation ?? '', t.affectedId]
      .map(csvEscape)
      .join(',')
  )
  return [CSV_HEADER, ...rows].join('\n')
}
