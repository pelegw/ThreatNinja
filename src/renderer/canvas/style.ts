import type { StylesheetStyle } from 'cytoscape'
import type { Theme } from '../ui/tokens'
import { fonts } from '../ui/tokens'

export const cytoscapeStyle = (theme: Theme): StylesheetStyle[] => [
  {
    selector: 'node',
    style: {
      'background-color': theme.nodeFill,
      'border-color': theme.nodeStroke,
      'border-width': 1.5,
      label: 'data(label)',
      color: theme.nodeText,
      'font-family': fonts.sans,
      'font-size': 13,
      'font-weight': 600,
      'text-valign': 'center',
      'text-halign': 'center',
      'text-wrap': 'wrap',
      'text-max-width': '120px',
    }
  },
  {
    selector: 'node[cyShape = "circle"]',
    style: { shape: 'ellipse', width: 140, height: 140 }
  },
  {
    selector: 'node[cyShape = "rect"]',
    style: { shape: 'rectangle', width: 170, height: 76 }
  },
  {
    selector: 'node[cyShape = "open"]',
    style: {
      shape: 'rectangle', width: 180, height: 70,
      'border-width': 0,
    }
  },
  {
    selector: 'node[cyShape = "pipe"]',
    style: { shape: 'round-rectangle', width: 190, height: 60, 'corner-radius': 30 }
  },
  {
    selector: ':parent',
    style: {
      'background-opacity': 0,
      'border-style': 'dashed',
      'border-color': theme.edgeUntrusted,
      'border-width': 1.25,
      'corner-radius': 6,
      label: 'data(label)',
      'text-valign': 'top',
      'text-halign': 'left',
      'text-margin-y': -8,
      'font-family': fonts.mono,
      'font-size': 11,
      'font-weight': 500,
      color: theme.edgeUntrusted,
      'text-transform': 'uppercase',
    }
  },
  {
    selector: 'edge',
    style: {
      label: 'data(label)',
      'text-wrap': 'wrap',
      'curve-style': 'bezier',
      width: 1.5,
      'target-arrow-shape': 'triangle',
      'target-arrow-fill': 'filled',
      'arrow-scale': 0.9,
      'line-color': theme.edgeCrossing,
      'target-arrow-color': theme.edgeCrossing,
      'font-family': fonts.mono,
      'font-size': 12,
      'font-weight': 500,
      color: theme.text,
      'text-outline-color': theme.bgAlt,
      'text-outline-width': 3,
      'text-outline-opacity': 1,
    }
  },
  {
    selector: 'edge[direction = "bidirectional"]',
    style: {
      'source-arrow-shape': 'triangle',
      'source-arrow-color': theme.edgeCrossing
    }
  },
  {
    selector: 'edge.encrypted',
    style: {
      'line-color': theme.edgeTrusted,
      'target-arrow-color': theme.edgeTrusted,
      'source-arrow-color': theme.edgeTrusted,
      color: theme.text,
    }
  },
  {
    selector: 'edge.plaintext',
    style: {
      'line-color': theme.edgeUntrusted,
      'target-arrow-color': theme.edgeUntrusted,
      'source-arrow-color': theme.edgeUntrusted,
      color: theme.text,
    }
  },
  {
    selector: 'node:selected',
    style: { 'border-color': theme.accent, 'border-width': 2 }
  },
  {
    selector: 'edge.rewiring',
    style: { opacity: 0.25 }
  },
]
