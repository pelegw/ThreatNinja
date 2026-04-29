import type { LayoutOptions } from 'cytoscape'

export const layoutOptions = (): LayoutOptions =>
  ({
    name: 'cose-bilkent',
    animate: false,
    padding: 40,
    nodeDimensionsIncludeLabels: true,
    idealEdgeLength: 100,
    nodeRepulsion: 8000,
    edgeElasticity: 0.45,
    nestingFactor: 0.1,
    gravity: 0.25,
    numIter: 2500,
    tile: true,
    randomize: false
  }) as LayoutOptions
