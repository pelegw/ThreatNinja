import { z } from 'zod'

export const LLMProvider = {
  Anthropic: 'anthropic',
  OpenAI: 'openai',
  Local: 'local'
} as const

export type LLMProvider = (typeof LLMProvider)[keyof typeof LLMProvider]

export const LLMSettingsSchema = z.object({
  provider: z.nativeEnum(LLMProvider),
  apiKey: z.string().optional(),
  endpoint: z.string().optional(),
  model: z.string().optional()
})

export type LLMSettings = z.infer<typeof LLMSettingsSchema>

export const LLMMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string()
})

export type LLMMessage = z.infer<typeof LLMMessageSchema>

export type LLMClient = {
  complete: (messages: LLMMessage[], system: string) => Promise<string>
  stream?: (messages: LLMMessage[], system: string, onChunk: (chunk: string) => void) => Promise<string>
}

type RequestInput = { messages: LLMMessage[]; system: string; model?: string }

const ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-4-6'
const OPENAI_DEFAULT_MODEL = 'gpt-4o'
const DEFAULT_MAX_TOKENS = 4096

export const formatAnthropicRequest = ({ messages, system, model }: RequestInput) => ({
  model: model ?? ANTHROPIC_DEFAULT_MODEL,
  system,
  messages,
  max_tokens: DEFAULT_MAX_TOKENS
})

export const formatOpenAIRequest = ({ messages, system, model }: RequestInput) => ({
  model: model ?? OPENAI_DEFAULT_MODEL,
  messages: [{ role: 'system', content: system }, ...messages],
  max_tokens: DEFAULT_MAX_TOKENS
})

const getElectronLLMComplete = (): ((params: { url: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; status: number; data: unknown }>) | undefined => {
  if (typeof window !== 'undefined' && 'electronAPI' in window && typeof window.electronAPI?.llmComplete === 'function') {
    return window.electronAPI.llmComplete.bind(window.electronAPI)
  }
  return undefined
}

const httpPost = async (url: string, headers: Record<string, string>, body: string): Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }> => {
  const electronComplete = getElectronLLMComplete()
  if (electronComplete !== undefined) {
    const result = await electronComplete({ url, headers, body })
    return { ok: result.ok, status: result.status, json: () => Promise.resolve(result.data) }
  }
  return fetch(url, { method: 'POST', headers, body })
}

const extractAnthropicText = (data: unknown): string | null => {
  const d = data as { type?: string; delta?: { type?: string; text?: string } }
  if (d.type !== 'content_block_delta' || d.delta?.type !== 'text_delta') return null
  return d.delta.text ?? null
}

const extractOpenAIText = (data: unknown): string | null => {
  const d = data as { choices?: { delta?: { content?: string | null } }[] }
  const content = d.choices?.[0]?.delta?.content
  return typeof content === 'string' ? content : null
}

const readSSEStream = async (
  url: string,
  headers: Record<string, string>,
  body: string,
  extractText: (data: unknown) => string | null,
  onChunk: (text: string) => void
): Promise<string> => {
  const response = await fetch(url, { method: 'POST', headers, body })
  if (!response.ok) throw new Error(`LLM API error: ${response.status}`)
  if (response.body === null) return ''

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let accumulated = ''
  let buffer = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let newlinePos: number
    while ((newlinePos = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlinePos)
      buffer = buffer.slice(newlinePos + 1)
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim()
      if (payload === '[DONE]') continue
      try {
        const text = extractText(JSON.parse(payload) as unknown)
        if (text !== null) {
          accumulated += text
          onChunk(text)
        }
      } catch { /* skip malformed */ }
    }
  }

  return accumulated
}

const anthropicClient = (apiKey: string, model?: string): LLMClient => ({
  complete: async (messages, system) => {
    const response = await httpPost(
      'https://api.anthropic.com/v1/messages',
      { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      JSON.stringify(formatAnthropicRequest({ messages, system, ...(model !== undefined ? { model } : {}) }))
    )
    if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`)
    const data = await response.json() as { content: { text: string }[] }
    return data.content[0]?.text ?? ''
  },
  stream: (messages, system, onChunk) =>
    readSSEStream(
      'https://api.anthropic.com/v1/messages',
      { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      JSON.stringify({ ...formatAnthropicRequest({ messages, system, ...(model !== undefined ? { model } : {}) }), stream: true }),
      extractAnthropicText,
      onChunk
    )
})

const openAICompatibleClient = (apiKey: string | undefined, endpoint: string, model?: string): LLMClient => ({
  complete: async (messages, system) => {
    const response = await httpPost(
      `${endpoint}/chat/completions`,
      { 'Content-Type': 'application/json', ...(apiKey !== undefined ? { Authorization: `Bearer ${apiKey}` } : {}) },
      JSON.stringify(formatOpenAIRequest({ messages, system, ...(model !== undefined ? { model } : {}) }))
    )
    if (!response.ok) throw new Error(`LLM API error: ${response.status}`)
    const data = await response.json() as { choices: { message: { content: string } }[] }
    return data.choices[0]?.message.content ?? ''
  },
  stream: (messages, system, onChunk) =>
    readSSEStream(
      `${endpoint}/chat/completions`,
      { 'Content-Type': 'application/json', ...(apiKey !== undefined ? { Authorization: `Bearer ${apiKey}` } : {}) },
      JSON.stringify({ ...formatOpenAIRequest({ messages, system, ...(model !== undefined ? { model } : {}) }), stream: true }),
      extractOpenAIText,
      onChunk
    )
})

export const createLLMClient = (settings: LLMSettings): LLMClient => {
  if (settings.provider === LLMProvider.Anthropic) {
    return anthropicClient(settings.apiKey ?? '', settings.model)
  }
  if (settings.provider === LLMProvider.OpenAI) {
    return openAICompatibleClient(settings.apiKey, 'https://api.openai.com/v1', settings.model)
  }
  return openAICompatibleClient(settings.apiKey, settings.endpoint ?? 'http://localhost:11434/v1', settings.model)
}
