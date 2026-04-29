import { describe, it, expect, vi } from 'vitest'
import { buildStridePrompt, parseThreatsResponse, generateThreats } from './strideAnalysis'
import { StrideCategory } from '../model/threats'
import { ComponentType, FlowDirection } from '../model/graph'
import type { Graph } from '../model/graph'
import type { LLMClient, LLMMessage } from './llm'

const sampleGraph: Graph = {
  id: 'g1',
  name: 'My System',
  zones: [{ id: 'z1', name: 'Internal' }],
  components: [{ id: 'c1', name: 'API', type: ComponentType.Service, zoneId: 'z1' }],
  flows: [{ id: 'f1', name: 'Call', originatorId: 'c1', targetId: 'c1', direction: FlowDirection.Unidirectional }]
}

const validThreats = [
  { id: 't1', title: 'Spoofing API', category: StrideCategory.Spoofing, description: 'Attacker spoofs identity', affectedId: 'c1', severity: 'high' },
  { id: 't2', title: 'Tamper flow', category: StrideCategory.Tampering, description: 'Data in transit modified', affectedId: 'f1', severity: 'medium' }
]

describe('buildStridePrompt', () => {
  it('includes the graph name in the prompt', () => {
    const prompt = buildStridePrompt(sampleGraph)
    expect(prompt).toContain('My System')
  })

  it('includes zone names in the prompt', () => {
    const prompt = buildStridePrompt(sampleGraph)
    expect(prompt).toContain('Internal')
  })

  it('includes zone ids in the prompt', () => {
    const prompt = buildStridePrompt(sampleGraph)
    expect(prompt).toContain('z1')
  })

  it('includes component names in the prompt', () => {
    const prompt = buildStridePrompt(sampleGraph)
    expect(prompt).toContain('API')
  })

  it('includes component ids in the prompt', () => {
    const prompt = buildStridePrompt(sampleGraph)
    expect(prompt).toContain('c1')
  })

  it('includes component type in the prompt', () => {
    const prompt = buildStridePrompt(sampleGraph)
    expect(prompt).toContain('service')
  })

  it('includes flow names in the prompt', () => {
    const prompt = buildStridePrompt(sampleGraph)
    expect(prompt).toContain('Call')
  })

  it('includes flow ids in the prompt', () => {
    const prompt = buildStridePrompt(sampleGraph)
    expect(prompt).toContain('f1')
  })

  it('includes flow originator id in the prompt', () => {
    const prompt = buildStridePrompt(sampleGraph)
    expect(prompt).toContain('c1')
  })

  it('includes flow direction in the prompt', () => {
    const prompt = buildStridePrompt(sampleGraph)
    expect(prompt).toContain('unidirectional')
  })

  it('mentions STRIDE categories in the prompt', () => {
    const prompt = buildStridePrompt(sampleGraph)
    expect(prompt.toLowerCase()).toContain('stride')
  })

  it('instructs the LLM to return JSON', () => {
    const prompt = buildStridePrompt(sampleGraph)
    expect(prompt.toLowerCase()).toContain('json')
  })
})

describe('buildStridePrompt — with interview transcript', () => {
  const transcript: LLMMessage[] = [
    { role: 'user', content: 'bootstrap' },
    { role: 'assistant', content: 'What auth mechanism do you use?' },
    { role: 'user', content: 'We use JWT tokens signed with RS256' }
  ]

  it('includes interview context when a transcript with Q&A is provided', () => {
    const prompt = buildStridePrompt(sampleGraph, transcript)
    expect(prompt).toContain('What auth mechanism do you use?')
    expect(prompt).toContain('We use JWT tokens signed with RS256')
  })

  it('labels the section as interview context', () => {
    const prompt = buildStridePrompt(sampleGraph, transcript)
    expect(prompt.toLowerCase()).toContain('interview')
  })

  it('does not include interview section when transcript is undefined', () => {
    const prompt = buildStridePrompt(sampleGraph)
    expect(prompt.toLowerCase()).not.toContain('interview')
  })

  it('does not include interview section when transcript has only the bootstrap message', () => {
    const bootstrapOnly: LLMMessage[] = [{ role: 'user', content: 'bootstrap' }]
    const prompt = buildStridePrompt(sampleGraph, bootstrapOnly)
    expect(prompt.toLowerCase()).not.toContain('interview')
  })

  it('does not include the bootstrap message content in the prompt', () => {
    const prompt = buildStridePrompt(sampleGraph, transcript)
    expect(prompt).not.toContain('bootstrap')
  })
})

describe('generateThreats — with interview transcript', () => {
  const transcript: LLMMessage[] = [
    { role: 'user', content: 'bootstrap' },
    { role: 'assistant', content: 'What auth do you use?' },
    { role: 'user', content: 'JWT' }
  ]

  it('includes transcript context in the prompt sent to the LLM', async () => {
    const client: LLMClient = { complete: vi.fn().mockResolvedValue(JSON.stringify(validThreats)) }
    await generateThreats(client, sampleGraph, transcript)
    const [messages] = vi.mocked(client.complete).mock.calls[0]!
    expect(messages[0]!.content).toContain('What auth do you use?')
  })
})

describe('parseThreatsResponse', () => {
  const validJson = JSON.stringify(validThreats)

  it('parses a valid JSON threat list', () => {
    const threats = parseThreatsResponse(validJson)
    expect(threats).toHaveLength(2)
    expect(threats[0]!.category).toBe(StrideCategory.Spoofing)
  })

  it('extracts JSON embedded in markdown code fences', () => {
    const fenced = '```json\n' + validJson + '\n```'
    expect(parseThreatsResponse(fenced)).toHaveLength(2)
  })

  it('extracts JSON embedded in plain code fences', () => {
    const fenced = '```\n' + validJson + '\n```'
    expect(parseThreatsResponse(fenced)).toHaveLength(2)
  })

  it('throws when the response is not valid JSON', () => {
    expect(() => parseThreatsResponse('not json')).toThrow()
  })

  it('throws when the JSON does not match the threat list schema', () => {
    expect(() => parseThreatsResponse(JSON.stringify([{ id: 't1' }]))).toThrow()
  })

  it('parses an empty threat list', () => {
    expect(parseThreatsResponse('[]')).toEqual([])
  })

  it('generates ids for threats missing an id', () => {
    const noId = JSON.stringify([
      { title: 'A', category: StrideCategory.Spoofing, description: 'x', affectedId: 'c1', severity: 'low' }
    ])
    const threats = parseThreatsResponse(noId)
    expect(threats[0]!.id.length).toBeGreaterThan(0)
  })

  it('preserves an existing non-empty string id', () => {
    const withId = JSON.stringify([
      { id: 'my-threat-id', title: 'A', category: StrideCategory.Spoofing, description: 'x', affectedId: 'c1', severity: 'low' }
    ])
    expect(parseThreatsResponse(withId)[0]!.id).toBe('my-threat-id')
  })

  it('generates an id when the LLM provides an empty string id', () => {
    const emptyId = JSON.stringify([
      { id: '', title: 'A', category: StrideCategory.Spoofing, description: 'x', affectedId: 'c1', severity: 'low' }
    ])
    expect(parseThreatsResponse(emptyId)[0]!.id.length).toBeGreaterThan(0)
  })

  it('generates an id when the LLM provides a numeric id', () => {
    const numericId = JSON.stringify([
      { id: 42, title: 'A', category: StrideCategory.Spoofing, description: 'x', affectedId: 'c1', severity: 'low' }
    ])
    expect(parseThreatsResponse(numericId)[0]!.id.length).toBeGreaterThan(0)
  })

  it('preserves the mitigation field when present', () => {
    const withMitigation = JSON.stringify([{
      id: 't1', title: 'A', category: StrideCategory.Spoofing,
      description: 'x', affectedId: 'c1', severity: 'low',
      mitigation: 'Use mTLS'
    }])
    expect(parseThreatsResponse(withMitigation)[0]!.mitigation).toBe('Use mTLS')
  })

  it('parses a threat without a mitigation field', () => {
    const noMitigation = JSON.stringify([{
      id: 't1', title: 'A', category: StrideCategory.Spoofing,
      description: 'x', affectedId: 'c1', severity: 'low'
    }])
    const threats = parseThreatsResponse(noMitigation)
    expect(threats[0]!.mitigation).toBeUndefined()
  })

  it('strips leading and trailing whitespace from unfenced JSON', () => {
    const padded = '  \n' + JSON.stringify(validThreats) + '\n  '
    expect(parseThreatsResponse(padded)).toHaveLength(2)
  })

  it('handles fences with spaces between the language tag and JSON content', () => {
    const spaced = '```json   \n' + JSON.stringify(validThreats) + '\n```'
    expect(parseThreatsResponse(spaced)).toHaveLength(2)
  })
})

describe('generateThreats', () => {
  const makeClient = (response: string): LLMClient => ({
    complete: vi.fn().mockResolvedValue(response)
  })

  it('calls client.complete with graph details as user message', async () => {
    const client = makeClient(JSON.stringify(validThreats))
    await generateThreats(client, sampleGraph)
    const [messages] = vi.mocked(client.complete).mock.calls[0]!
    expect(messages).toEqual([{ role: 'user', content: expect.stringContaining('My System') }])
  })

  it('passes a non-empty system prompt', async () => {
    const client = makeClient(JSON.stringify(validThreats))
    await generateThreats(client, sampleGraph)
    const [, system] = vi.mocked(client.complete).mock.calls[0]!
    expect((system as string).length).toBeGreaterThan(0)
  })

  it('returns parsed threats from the LLM response', async () => {
    const client = makeClient(JSON.stringify(validThreats))
    const threats = await generateThreats(client, sampleGraph)
    expect(threats).toHaveLength(2)
    expect(threats[0]!.title).toBe('Spoofing API')
  })

  it('propagates errors thrown by client.complete', async () => {
    const client: LLMClient = { complete: vi.fn().mockRejectedValue(new Error('API error')) }
    await expect(generateThreats(client, sampleGraph)).rejects.toThrow('API error')
  })
})
