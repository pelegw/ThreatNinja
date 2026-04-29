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
  }
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
  }
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
