import { describe, it, expect, vi } from 'vitest'
import { buildNlToGraphPrompt, parseGraphResponse, generateGraphFromDescription } from './nlToGraph'
import { ComponentType, FlowDirection } from '../model/graph'
import type { LLMClient } from './llm'

describe('buildNlToGraphPrompt', () => {
  it('includes the user description in the prompt', () => {
    const prompt = buildNlToGraphPrompt('A web app with a database')
    expect(prompt).toContain('A web app with a database')
  })

  it('instructs the LLM to return JSON', () => {
    const prompt = buildNlToGraphPrompt('anything')
    expect(prompt.toLowerCase()).toContain('json')
  })

  it('mentions zones, components, and flows in the prompt', () => {
    const prompt = buildNlToGraphPrompt('anything')
    expect(prompt).toContain('zones')
    expect(prompt).toContain('components')
    expect(prompt).toContain('flows')
  })
})

describe('parseGraphResponse', () => {
  const validResponse = JSON.stringify({
    id: 'g1',
    name: 'My System',
    zones: [{ id: 'z1', name: 'Internal' }],
    components: [{ id: 'c1', name: 'API', type: ComponentType.Service, zoneId: 'z1' }],
    flows: [{ id: 'f1', name: 'Call', originatorId: 'c1', targetId: 'c1', direction: FlowDirection.Unidirectional }]
  })

  it('parses a valid JSON graph response', () => {
    const graph = parseGraphResponse(validResponse)
    expect(graph.name).toBe('My System')
    expect(graph.zones).toHaveLength(1)
    expect(graph.components).toHaveLength(1)
    expect(graph.flows).toHaveLength(1)
  })

  it('extracts JSON embedded in markdown code fences', () => {
    const fenced = '```json\n' + validResponse + '\n```'
    const graph = parseGraphResponse(fenced)
    expect(graph.name).toBe('My System')
  })

  it('extracts JSON embedded in plain code fences', () => {
    const fenced = '```\n' + validResponse + '\n```'
    const graph = parseGraphResponse(fenced)
    expect(graph.name).toBe('My System')
  })

  it('throws when the response is not valid JSON', () => {
    expect(() => parseGraphResponse('not json')).toThrow()
  })

  it('throws when the JSON does not match the Graph schema', () => {
    expect(() => parseGraphResponse(JSON.stringify({ id: 'g1' }))).toThrow()
  })

  it('generates an id when the LLM omits it', () => {
    const noId = JSON.stringify({ name: 'My System', zones: [], components: [], flows: [] })
    const graph = parseGraphResponse(noId)
    expect(graph.id.length).toBeGreaterThan(0)
  })

  it('preserves the id when the LLM provides a valid non-empty string id', () => {
    const withId = JSON.stringify({ id: 'my-system-id', name: 'My System', zones: [], components: [], flows: [] })
    expect(parseGraphResponse(withId).id).toBe('my-system-id')
  })

  it('generates an id when the LLM provides an empty string id', () => {
    const emptyId = JSON.stringify({ id: '', name: 'My System', zones: [], components: [], flows: [] })
    expect(parseGraphResponse(emptyId).id.length).toBeGreaterThan(0)
  })

  it('generates an id when the LLM provides a numeric id', () => {
    const numericId = JSON.stringify({ id: 42, name: 'My System', zones: [], components: [], flows: [] })
    expect(parseGraphResponse(numericId).id.length).toBeGreaterThan(0)
  })

  it('strips leading and trailing whitespace from unfenced JSON', () => {
    const padded = '  \n' + validResponse + '\n  '
    expect(() => parseGraphResponse(padded)).not.toThrow()
    expect(parseGraphResponse(padded).name).toBe('My System')
  })

  it('handles fences with spaces between the language tag and JSON content', () => {
    const spaced = '```json   \n' + validResponse + '\n```'
    expect(parseGraphResponse(spaced).name).toBe('My System')
  })
})

describe('generateGraphFromDescription', () => {
  const graphJson = JSON.stringify({
    id: 'g1', name: 'My System', zones: [], components: [], flows: []
  })

  const makeClient = (response: string): LLMClient => ({
    complete: vi.fn().mockResolvedValue(response)
  })

  it('calls client.complete with the description as user message', async () => {
    const client = makeClient(graphJson)
    await generateGraphFromDescription(client, 'a web app')
    expect(client.complete).toHaveBeenCalledWith(
      [{ role: 'user', content: 'a web app' }],
      expect.any(String)
    )
  })

  it('passes a non-empty system prompt to client.complete', async () => {
    const client = makeClient(graphJson)
    await generateGraphFromDescription(client, 'x')
    const [, system] = vi.mocked(client.complete).mock.calls[0]!
    expect(typeof system).toBe('string')
    expect((system as string).length).toBeGreaterThan(0)
  })

  it('returns the parsed graph from the LLM response', async () => {
    const client = makeClient(graphJson)
    const graph = await generateGraphFromDescription(client, 'a web app')
    expect(graph.name).toBe('My System')
    expect(graph.id).toBe('g1')
  })

  it('propagates errors thrown by client.complete', async () => {
    const client: LLMClient = { complete: vi.fn().mockRejectedValue(new Error('API error')) }
    await expect(generateGraphFromDescription(client, 'x')).rejects.toThrow('API error')
  })

  it('throws when the LLM returns invalid graph JSON', async () => {
    const client = makeClient(JSON.stringify({ invalid: true }))
    await expect(generateGraphFromDescription(client, 'x')).rejects.toThrow()
  })
})
