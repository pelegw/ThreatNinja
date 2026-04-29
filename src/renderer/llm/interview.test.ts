import { describe, it, expect, vi } from 'vitest'
import { buildInterviewStartPrompt, startInterview, continueInterview, formatTranscriptForStride } from './interview'
import type { LLMClient, LLMMessage } from './llm'
import { ComponentType, FlowDirection, GraphSchema } from '../model/graph'

const sampleGraph = GraphSchema.parse({
  id: 'g1', name: 'My System',
  zones: [{ id: 'z1', name: 'Internal' }],
  components: [{ id: 'c1', name: 'API', type: ComponentType.Service, zoneId: 'z1' }],
  flows: [{ id: 'f1', name: 'Call', originatorId: 'c1', targetId: 'c1', direction: FlowDirection.Unidirectional }]
})

const makeClient = (response: string): LLMClient => ({
  complete: vi.fn().mockResolvedValue(response)
})

describe('buildInterviewStartPrompt', () => {
  it('includes the system name', () => {
    expect(buildInterviewStartPrompt(sampleGraph)).toContain('My System')
  })

  it('includes component names', () => {
    expect(buildInterviewStartPrompt(sampleGraph)).toContain('API')
  })

  it('includes flow names', () => {
    expect(buildInterviewStartPrompt(sampleGraph)).toContain('Call')
  })

  it('includes zone names', () => {
    expect(buildInterviewStartPrompt(sampleGraph)).toContain('Internal')
  })
})

describe('startInterview', () => {
  it('returns a 2-message history: bootstrap user message then first assistant question', async () => {
    const client = makeClient('What authentication mechanism do you use?')
    const history = await startInterview(client, sampleGraph)
    expect(history).toHaveLength(2)
    expect(history[0]!.role).toBe('user')
    expect(history[1]!.role).toBe('assistant')
    expect(history[1]!.content).toBe('What authentication mechanism do you use?')
  })

  it('calls client.complete with a single user message containing the bootstrap prompt', async () => {
    const client = makeClient('Question?')
    await startInterview(client, sampleGraph)
    const [messages] = vi.mocked(client.complete).mock.calls[0]!
    expect(messages).toHaveLength(1)
    expect(messages[0]!.role).toBe('user')
    expect(messages[0]!.content).toContain('My System')
  })

  it('passes a non-empty system prompt to client.complete', async () => {
    const client = makeClient('Q?')
    await startInterview(client, sampleGraph)
    const [, system] = vi.mocked(client.complete).mock.calls[0]!
    expect((system as string).length).toBeGreaterThan(0)
  })

  it('propagates errors thrown by client.complete', async () => {
    const client: LLMClient = { complete: vi.fn().mockRejectedValue(new Error('API error')) }
    await expect(startInterview(client, sampleGraph)).rejects.toThrow('API error')
  })
})

describe('continueInterview', () => {
  const seedHistory: LLMMessage[] = [
    { role: 'user', content: 'bootstrap prompt' },
    { role: 'assistant', content: 'First question?' }
  ]

  it('appends the user answer and follow-up question to the history', async () => {
    const client = makeClient('Follow-up question?')
    const updated = await continueInterview(client, seedHistory, 'My answer')
    expect(updated).toHaveLength(4)
    expect(updated[2]!).toEqual({ role: 'user', content: 'My answer' })
    expect(updated[3]!).toEqual({ role: 'assistant', content: 'Follow-up question?' })
  })

  it('passes the full history including the new user answer to client.complete', async () => {
    const client = makeClient('Next?')
    await continueInterview(client, seedHistory, 'My answer')
    const [messages] = vi.mocked(client.complete).mock.calls[0]!
    expect(messages).toHaveLength(3)
    expect(messages[2]!).toEqual({ role: 'user', content: 'My answer' })
  })

  it('does not mutate the original history array', async () => {
    const client = makeClient('Q?')
    await continueInterview(client, seedHistory, 'Answer')
    expect(seedHistory).toHaveLength(2)
  })

  it('propagates errors thrown by client.complete', async () => {
    const client: LLMClient = { complete: vi.fn().mockRejectedValue(new Error('Network error')) }
    await expect(continueInterview(client, seedHistory, 'Answer')).rejects.toThrow('Network error')
  })
})

describe('formatTranscriptForStride', () => {
  it('skips the bootstrap message at index 0', () => {
    const messages: LLMMessage[] = [
      { role: 'user', content: 'bootstrap prompt with graph data' },
      { role: 'assistant', content: 'What auth do you use?' }
    ]
    expect(formatTranscriptForStride(messages)).not.toContain('bootstrap prompt with graph data')
  })

  it('labels assistant messages as Researcher', () => {
    const messages: LLMMessage[] = [
      { role: 'user', content: 'bootstrap' },
      { role: 'assistant', content: 'What auth do you use?' }
    ]
    expect(formatTranscriptForStride(messages)).toContain('Researcher: What auth do you use?')
  })

  it('labels user messages at index > 0 as Developer', () => {
    const messages: LLMMessage[] = [
      { role: 'user', content: 'bootstrap' },
      { role: 'assistant', content: 'Question?' },
      { role: 'user', content: 'We use JWT' }
    ]
    expect(formatTranscriptForStride(messages)).toContain('Developer: We use JWT')
  })

  it('returns empty string for a transcript with only the bootstrap message', () => {
    const messages: LLMMessage[] = [{ role: 'user', content: 'bootstrap' }]
    expect(formatTranscriptForStride(messages)).toBe('')
  })

  it('returns empty string for an empty transcript', () => {
    expect(formatTranscriptForStride([])).toBe('')
  })

  it('formats a multi-turn exchange correctly', () => {
    const messages: LLMMessage[] = [
      { role: 'user', content: 'bootstrap' },
      { role: 'assistant', content: 'Q1?' },
      { role: 'user', content: 'A1' },
      { role: 'assistant', content: 'Q2?' }
    ]
    const result = formatTranscriptForStride(messages)
    expect(result).toContain('Researcher: Q1?')
    expect(result).toContain('Developer: A1')
    expect(result).toContain('Researcher: Q2?')
  })
})
