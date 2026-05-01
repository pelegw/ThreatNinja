import { describe, it, expect } from 'vitest'
import { buildFilePayload, extractGraph, extractThreats, extractAttackThreats, extractInterviewTranscript, FilePayloadSchema } from './file'
import { ComponentType, FlowDirection, GraphSchema } from '../model/graph'
import { StrideCategory } from '../model/threats'
import type { Threat } from '../model/threats'
import type { LLMMessage } from '../llm/llm'

const makeGraph = () =>
  GraphSchema.parse({
    id: 'g1', name: 'My System',
    zones: [{ id: 'z1', name: 'DMZ' }],
    components: [{ id: 'c1', name: 'Server', type: ComponentType.Process, zoneId: 'z1' }],
    flows: [{ id: 'f1', name: 'HTTPS', originatorId: 'c1', targetId: 'c1', direction: FlowDirection.Unidirectional }]
  })

describe('FilePayloadSchema', () => {
  it('parses a valid payload', () => {
    const payload = { version: '1', graph: makeGraph() }
    expect(FilePayloadSchema.parse(payload)).toEqual(payload)
  })

  it('throws when version is missing', () => {
    expect(() => FilePayloadSchema.parse({ graph: makeGraph() })).toThrow()
  })

  it('throws when graph is missing', () => {
    expect(() => FilePayloadSchema.parse({ version: '1' })).toThrow()
  })

  it('throws when embedded graph is invalid', () => {
    expect(() => FilePayloadSchema.parse({ version: '1', graph: { id: 'g1' } })).toThrow()
  })
})

describe('buildFilePayload', () => {
  it('wraps the graph with version 1', () => {
    const payload = buildFilePayload(makeGraph())
    expect(payload.version).toBe('1')
    expect(payload.graph).toEqual(makeGraph())
  })

  it('produces a payload that round-trips through FilePayloadSchema', () => {
    const graph = makeGraph()
    expect(FilePayloadSchema.parse(buildFilePayload(graph)).graph).toEqual(graph)
  })
})

const sampleThreats: Threat[] = [
  { id: 't1', title: 'SQL Injection', category: StrideCategory.Tampering, description: 'desc', affectedId: 'c1', severity: 'high' }
]

describe('buildFilePayload — with threats', () => {
  it('includes threats when provided', () => {
    const payload = buildFilePayload(makeGraph(), sampleThreats)
    expect(payload.threats).toEqual(sampleThreats)
  })

  it('omits threats when not provided', () => {
    const payload = buildFilePayload(makeGraph())
    expect(payload.threats).toBeUndefined()
  })
})

describe('extractThreats', () => {
  it('returns threats from a file that includes them', () => {
    const json = JSON.stringify(buildFilePayload(makeGraph(), sampleThreats))
    expect(extractThreats(json)).toEqual(sampleThreats)
  })

  it('returns undefined for a file with no threats', () => {
    const json = JSON.stringify(buildFilePayload(makeGraph()))
    expect(extractThreats(json)).toBeUndefined()
  })
})

const sampleTranscript: LLMMessage[] = [
  { role: 'user', content: 'bootstrap prompt' },
  { role: 'assistant', content: 'What auth do you use?' },
  { role: 'user', content: 'JWT tokens' }
]

describe('buildFilePayload — with interview transcript', () => {
  it('includes the transcript when provided', () => {
    const payload = buildFilePayload(makeGraph(), undefined, sampleTranscript)
    expect(payload.interviewTranscript).toEqual(sampleTranscript)
  })

  it('omits the transcript when not provided', () => {
    const payload = buildFilePayload(makeGraph())
    expect(payload.interviewTranscript).toBeUndefined()
  })

  it('omits the transcript when provided as an empty array', () => {
    const payload = buildFilePayload(makeGraph(), undefined, [])
    expect(payload.interviewTranscript).toBeUndefined()
  })

  it('round-trips the transcript through FilePayloadSchema', () => {
    const payload = buildFilePayload(makeGraph(), undefined, sampleTranscript)
    expect(FilePayloadSchema.parse(payload).interviewTranscript).toEqual(sampleTranscript)
  })
})

describe('extractInterviewTranscript', () => {
  it('returns the transcript from a file that includes one', () => {
    const json = JSON.stringify(buildFilePayload(makeGraph(), undefined, sampleTranscript))
    expect(extractInterviewTranscript(json)).toEqual(sampleTranscript)
  })

  it('returns undefined for a file with no transcript', () => {
    const json = JSON.stringify(buildFilePayload(makeGraph()))
    expect(extractInterviewTranscript(json)).toBeUndefined()
  })
})

describe('FilePayloadSchema — interviewTranscript field', () => {
  it('parses a payload with a valid transcript', () => {
    const payload = { version: '1', graph: makeGraph(), interviewTranscript: sampleTranscript }
    expect(FilePayloadSchema.parse(payload).interviewTranscript).toEqual(sampleTranscript)
  })

  it('parses a payload without a transcript (backward compatible)', () => {
    const payload = { version: '1', graph: makeGraph() }
    expect(FilePayloadSchema.parse(payload).interviewTranscript).toBeUndefined()
  })

  it('throws when transcript contains a message with an invalid role', () => {
    const bad = { version: '1', graph: makeGraph(), interviewTranscript: [{ role: 'system', content: 'x' }] }
    expect(() => FilePayloadSchema.parse(bad)).toThrow()
  })
})

describe('extractAttackThreats', () => {
  it('returns attack threats from a file that includes them', async () => {
    const { AttackTactic } = await import('../model/attackThreats')
    const sample = [{
      id: 'a1', tactic: AttackTactic.InitialAccess, techniqueId: 'T1190',
      techniqueName: 'Exploit Public-Facing Application', title: 'X', description: 'd',
      affectedId: 'c1', severity: 'high' as const,
    }]
    const json = JSON.stringify(buildFilePayload(makeGraph(), undefined, undefined, sample))
    expect(extractAttackThreats(json)).toEqual(sample)
  })

  it('returns undefined for a file without attack threats (backward compatible)', () => {
    const json = JSON.stringify(buildFilePayload(makeGraph()))
    expect(extractAttackThreats(json)).toBeUndefined()
  })
})

describe('extractGraph', () => {
  it('extracts the graph from a valid JSON payload string', () => {
    const json = JSON.stringify(buildFilePayload(makeGraph()))
    expect(extractGraph(json)).toEqual(makeGraph())
  })

  it('throws on invalid JSON', () => {
    expect(() => extractGraph('not json')).toThrow()
  })

  it('throws when the JSON does not match the payload schema', () => {
    expect(() => extractGraph(JSON.stringify({ version: '1' }))).toThrow()
  })

  it('throws when the embedded graph has an invalid component type', () => {
    const bad = { version: '1', graph: { id: 'g1', name: 'X', zones: [], components: [{ id: 'c1', name: 'X', type: 'rocket', zoneId: 'z1' }], flows: [] } }
    expect(() => extractGraph(JSON.stringify(bad))).toThrow()
  })
})
