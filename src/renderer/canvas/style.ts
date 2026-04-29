import type { StylesheetStyle } from 'cytoscape'

export const cytoscapeStyle = (): StylesheetStyle[] => [
  {
    selector: 'node',
    style: {
      label: 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': '12px',
      color: '#333333'
    }
  },
  {
    selector: 'node:childless[!parent]',
    style: {
      'background-color': '#e8f0fe',
      'border-color': '#4285f4',
      'border-width': 2,
      shape: 'round-rectangle',
      padding: '20px',
      'text-valign': 'top',
      'font-weight': 'bold'
    }
  },
  {
    selector: 'node[parent]',
    style: {
      'background-color': '#ffffff',
      'border-color': '#666666',
      'border-width': 1,
      shape: 'round-rectangle',
      width: 120,
      height: 40
    }
  },
  {
    selector: '$node > node',
    style: {
      'padding-top': '10px',
      'padding-left': '10px',
      'padding-bottom': '10px',
      'padding-right': '10px',
      'text-valign': 'top',
      'text-halign': 'center',
      'background-color': '#f0f4ff',
      'border-color': '#4285f4',
      'border-width': 2
    }
  },
  {
    selector: 'edge',
    style: {
      label: 'data(label)',
      'curve-style': 'bezier',
      'target-arrow-shape': 'triangle',
      'arrow-scale': 1.2,
      'line-color': '#666666',
      'target-arrow-color': '#666666',
      'font-size': '10px',
      'text-rotation': 'autorotate',
      'text-background-color': '#ffffff',
      'text-background-opacity': 1,
      'text-background-padding': '2px'
    }
  },
  { selector: 'node[parent][type = "database"]', style: { shape: 'barrel' } },
  { selector: 'node[parent][type = "service"]', style: { shape: 'ellipse' } },
  { selector: 'node[parent][type = "server"]', style: { shape: 'rectangle' } },
  { selector: 'node[parent][type = "desktop"]', style: { shape: 'round-rectangle' } },
  { selector: 'node[parent][type = "fileStore"]', style: { shape: 'tag' } },
  { selector: 'node[parent][type = "objectStorage"]', style: { shape: 'hexagon' } },
  { selector: 'node[parent][type = "externalEntity"]', style: { shape: 'diamond' } },
  {
    selector: 'edge[direction = "bidirectional"]',
    style: {
      'source-arrow-shape': 'triangle',
      'source-arrow-color': '#666666'
    }
  },
  {
    selector: 'node.zone',
    style: {
      'border-style': 'dashed',
      'border-color': '#cc2222',
      'border-width': 2
    }
  },
  {
    selector: 'edge.encrypted',
    style: {
      'line-color': '#4caf50',
      'target-arrow-color': '#4caf50',
      'source-arrow-color': '#4caf50'
    }
  },
  {
    selector: 'edge.plaintext',
    style: {
      'line-color': '#ef5350',
      'target-arrow-color': '#ef5350',
      'source-arrow-color': '#ef5350'
    }
  }
]
