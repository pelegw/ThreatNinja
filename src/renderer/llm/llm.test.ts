import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  LLMSettingsSchema, LLMProvider,
  createLLMClient,
  formatAnthropicRequest, formatOpenAIRequest
} from './llm'

describe('LLMSettingsSchema', () => {
  it('parses valid Anthropic settings', () => {
    const s = { provider: LLMProvider.Anthropic, apiKey: 'sk-ant-123', model: 'claude-sonnet-4-6' }
    expect(LLMSettingsSchema.parse(s)).toEqual(s)
  })

  it('parses valid OpenAI settings', () => {
    const s = { provider: LLMProvider.OpenAI, apiKey: 'sk-openai-123', model: 'gpt-4o' }
    expect(LLMSettingsSchema.parse(s)).toEqual(s)
  })

  it('parses valid local endpoint settings (no apiKey required)', () => {
    const s = { provider: LLMProvider.Local, endpoint: 'http://localhost:11434/v1', model: 'llama3' }
    expect(LLMSettingsSchema.parse(s)).toEqual(s)
  })

  it('throws on unknown provider', () => {
    expect(() => LLMSettingsSchema.parse({ provider: 'palm' })).toThrow()
  })

  it('strips unknown fields', () => {
    const s = { provider: LLMProvider.Anthropic, apiKey: 'k', extra: true }
    expect(LLMSettingsSchema.parse(s)).not.toHaveProperty('extra')
  })
})

describe('formatAnthropicRequest', () => {
  it('produces the expected Anthropic messages API shape', () => {
    const req = formatAnthropicRequest({
      messages: [{ role: 'user', content: 'hello' }],
      system: 'you are helpful',
      model: 'claude-sonnet-4-6'
    })
    expect(req.model).toBe('claude-sonnet-4-6')
    expect(req.system).toBe('you are helpful')
    expect(req.messages).toEqual([{ role: 'user', content: 'hello' }])
    expect(req.max_tokens).toBeGreaterThan(0)
  })

  it('uses a default model when none provided', () => {
    const req = formatAnthropicRequest({ messages: [], system: '' })
    expect(typeof req.model).toBe('string')
    expect(req.model.length).toBeGreaterThan(0)
  })
})

describe('formatOpenAIRequest', () => {
  it('produces the expected OpenAI chat completions shape', () => {
    const req = formatOpenAIRequest({
      messages: [{ role: 'user', content: 'hello' }],
      system: 'you are helpful',
      model: 'gpt-4o'
    })
    expect(req.model).toBe('gpt-4o')
    expect(req.messages[0]).toEqual({ role: 'system', content: 'you are helpful' })
    expect(req.messages[1]).toEqual({ role: 'user', content: 'hello' })
  })

  it('uses a non-empty default model when none provided', () => {
    const req = formatOpenAIRequest({ messages: [], system: '' })
    expect(req.model.length).toBeGreaterThan(0)
  })

  it('includes max_tokens so local models produce complete responses', () => {
    const req = formatOpenAIRequest({ messages: [], system: '' })
    expect(req.max_tokens).toBeGreaterThan(0)
  })
})

describe('createLLMClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('calls the Anthropic messages endpoint for Anthropic provider', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ text: 'response' }] })
    } as Response)

    const client = createLLMClient({ provider: LLMProvider.Anthropic, apiKey: 'sk-ant' })
    await client.complete([{ role: 'user', content: 'hi' }], 'system')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('anthropic.com'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('calls the OpenAI chat completions endpoint for OpenAI provider', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'response' } }] })
    } as Response)

    const client = createLLMClient({ provider: LLMProvider.OpenAI, apiKey: 'sk-oai' })
    await client.complete([{ role: 'user', content: 'hi' }], 'system')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('openai.com'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('calls the configured local endpoint for Local provider', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'response' } }] })
    } as Response)

    const client = createLLMClient({ provider: LLMProvider.Local, endpoint: 'http://localhost:11434/v1' })
    await client.complete([{ role: 'user', content: 'hi' }], 'system')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('localhost:11434'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('throws when the Anthropic API returns a non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 401, text: async () => 'Unauthorized' } as Response)
    const client = createLLMClient({ provider: LLMProvider.Anthropic, apiKey: 'bad-key' })
    await expect(client.complete([{ role: 'user', content: 'hi' }], '')).rejects.toThrow('401')
  })

  it('throws when the OpenAI-compatible API returns a non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500, text: async () => 'Error' } as Response)
    const client = createLLMClient({ provider: LLMProvider.OpenAI, apiKey: 'sk' })
    await expect(client.complete([], '')).rejects.toThrow('500')
  })

  it('sends Content-Type application/json and messages in the Anthropic request body', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ content: [{ text: 'ok' }] }) } as Response)
    const client = createLLMClient({ provider: LLMProvider.Anthropic, apiKey: 'sk-ant' })
    await client.complete([{ role: 'user', content: 'ping' }], 'be helpful')

    const [, init] = vi.mocked(fetch).mock.calls[0]!
    const headers = (init as RequestInit).headers as Record<string, string>
    const body = JSON.parse((init as RequestInit).body as string)

    expect(headers['Content-Type']).toBe('application/json')
    expect(headers['anthropic-version']).toBe('2023-06-01')
    expect(body.messages).toEqual([{ role: 'user', content: 'ping' }])
    expect(body.system).toBe('be helpful')
  })

  it('sends Content-Type and messages in the OpenAI request body', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) } as Response)
    const client = createLLMClient({ provider: LLMProvider.OpenAI, apiKey: 'sk-oai' })
    await client.complete([{ role: 'user', content: 'ping' }], 'be helpful')

    const [, init] = vi.mocked(fetch).mock.calls[0]!
    const headers = (init as RequestInit).headers as Record<string, string>
    const body = JSON.parse((init as RequestInit).body as string)

    expect(headers['Content-Type']).toBe('application/json')
    expect(body.messages).toContainEqual({ role: 'user', content: 'ping' })
    expect(body.messages[0]).toEqual({ role: 'system', content: 'be helpful' })
  })

  it('includes Authorization header when apiKey is provided for OpenAI', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: '' } }] }) } as Response)
    const client = createLLMClient({ provider: LLMProvider.OpenAI, apiKey: 'sk-test' })
    await client.complete([], '')

    const [, init] = vi.mocked(fetch).mock.calls[0]!
    const headers = (init as RequestInit).headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer sk-test')
  })

  it('omits Authorization header when no apiKey is set for Local provider', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: '' } }] }) } as Response)
    const client = createLLMClient({ provider: LLMProvider.Local, endpoint: 'http://localhost:11434/v1' })
    await client.complete([], '')

    const [, init] = vi.mocked(fetch).mock.calls[0]!
    const headers = (init as RequestInit).headers as Record<string, string>
    expect(headers).not.toHaveProperty('Authorization')
  })

  it('returns empty string when Anthropic response has no content items', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ content: [] }) } as Response)
    const client = createLLMClient({ provider: LLMProvider.Anthropic, apiKey: 'sk' })
    expect(await client.complete([], '')).toBe('')
  })

  it('returns empty string when OpenAI response has no choices', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ choices: [] }) } as Response)
    const client = createLLMClient({ provider: LLMProvider.OpenAI, apiKey: 'sk' })
    expect(await client.complete([], '')).toBe('')
  })

  it('returns the text from the first Anthropic content item', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ content: [{ text: 'hello world' }] }) } as Response)
    const client = createLLMClient({ provider: LLMProvider.Anthropic, apiKey: 'sk' })
    expect(await client.complete([], '')).toBe('hello world')
  })

  it('returns the content from the first OpenAI choice', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: 'hello world' } }] }) } as Response)
    const client = createLLMClient({ provider: LLMProvider.OpenAI, apiKey: 'sk' })
    expect(await client.complete([], '')).toBe('hello world')
  })

  it('sends x-api-key as empty string when Anthropic apiKey is undefined', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ content: [{ text: '' }] }) } as Response)
    const client = createLLMClient({ provider: LLMProvider.Anthropic })
    await client.complete([], '')

    const [, init] = vi.mocked(fetch).mock.calls[0]!
    const headers = (init as RequestInit).headers as Record<string, string>
    expect(headers['x-api-key']).toBe('')
  })

  it('uses default localhost endpoint when Local provider has no endpoint set', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: '' } }] }) } as Response)
    const client = createLLMClient({ provider: LLMProvider.Local })
    await client.complete([], '')

    const [url] = vi.mocked(fetch).mock.calls[0]!
    expect(url as string).toContain('localhost:11434')
  })

  it('uses the specified model in the Anthropic request body when provided', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ content: [{ text: '' }] }) } as Response)
    const client = createLLMClient({ provider: LLMProvider.Anthropic, apiKey: 'sk', model: 'claude-opus-4-7' })
    await client.complete([], '')

    const [, init] = vi.mocked(fetch).mock.calls[0]!
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.model).toBe('claude-opus-4-7')
  })

  it('uses the default model in the Anthropic request body when none specified', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ content: [{ text: '' }] }) } as Response)
    const client = createLLMClient({ provider: LLMProvider.Anthropic, apiKey: 'sk' })
    await client.complete([], '')

    const [, init] = vi.mocked(fetch).mock.calls[0]!
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.model).toBe('claude-sonnet-4-6')
  })

  it('uses the specified model in the OpenAI request body when provided', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: '' } }] }) } as Response)
    const client = createLLMClient({ provider: LLMProvider.OpenAI, apiKey: 'sk', model: 'gpt-4-turbo' })
    await client.complete([], '')

    const [, init] = vi.mocked(fetch).mock.calls[0]!
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.model).toBe('gpt-4-turbo')
  })

  it('uses the default model in the OpenAI request body when none specified', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: '' } }] }) } as Response)
    const client = createLLMClient({ provider: LLMProvider.OpenAI, apiKey: 'sk' })
    await client.complete([], '')

    const [, init] = vi.mocked(fetch).mock.calls[0]!
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.model).toBe('gpt-4o')
  })
})

describe('createLLMClient — Electron IPC path', () => {
  const llmComplete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    vi.stubGlobal('window', { electronAPI: { llmComplete } })
    llmComplete.mockResolvedValue({ ok: true, status: 200, data: { choices: [{ message: { content: 'ipc-response' } }] } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls window.electronAPI.llmComplete instead of fetch when available', async () => {
    const client = createLLMClient({ provider: LLMProvider.Local, endpoint: 'http://localhost:11434/v1' })
    await client.complete([{ role: 'user', content: 'hi' }], 'system')

    expect(llmComplete).toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('passes the correct URL to llmComplete for the local endpoint', async () => {
    const client = createLLMClient({ provider: LLMProvider.Local, endpoint: 'http://localhost:11434/v1' })
    await client.complete([], '')

    expect(llmComplete).toHaveBeenCalledWith(expect.objectContaining({
      url: 'http://localhost:11434/v1/chat/completions'
    }))
  })

  it('passes the OpenAI-format body to llmComplete', async () => {
    const client = createLLMClient({ provider: LLMProvider.Local, endpoint: 'http://localhost:11434/v1', model: 'llama3' })
    await client.complete([{ role: 'user', content: 'hello' }], 'be helpful')

    const { body } = llmComplete.mock.calls[0]![0] as { body: string }
    const parsed = JSON.parse(body) as { model: string; messages: unknown[] }
    expect(parsed.model).toBe('llama3')
    expect(parsed.messages[0]).toEqual({ role: 'system', content: 'be helpful' })
    expect(parsed.messages[1]).toEqual({ role: 'user', content: 'hello' })
  })

  it('returns the response content from llmComplete', async () => {
    const client = createLLMClient({ provider: LLMProvider.Local, endpoint: 'http://localhost:11434/v1' })
    const result = await client.complete([], '')
    expect(result).toBe('ipc-response')
  })

  it('throws when llmComplete returns a non-ok response', async () => {
    llmComplete.mockResolvedValue({ ok: false, status: 500, data: {} })
    const client = createLLMClient({ provider: LLMProvider.Local, endpoint: 'http://localhost:11434/v1' })
    await expect(client.complete([], '')).rejects.toThrow('500')
  })

  it('also uses llmComplete for the Anthropic provider when in Electron', async () => {
    llmComplete.mockResolvedValue({ ok: true, status: 200, data: { content: [{ text: 'ant-response' }] } })
    const client = createLLMClient({ provider: LLMProvider.Anthropic, apiKey: 'sk-ant' })
    await client.complete([], '')

    expect(llmComplete).toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })
})
