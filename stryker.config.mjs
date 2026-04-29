/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  vitest: {
    configFile: 'vitest.config.ts'
  },
  mutate: [
    'src/renderer/model/graph.ts',
    'src/renderer/model/threats.ts',
    'src/renderer/canvas/elements.ts',
    'src/renderer/canvas/export.ts',
    'src/renderer/storage/file.ts',
    'src/renderer/llm/llm.ts',
    'src/renderer/llm/nlToGraph.ts',
    'src/renderer/llm/strideAnalysis.ts'
  ],
  reporters: ['clear-text', 'progress', 'json'],
  coverageAnalysis: 'perTest'
}
