import type { Graph } from '../model/graph'
import type { LLMClient, LLMMessage } from './llm'

export const DEFAULT_INTERVIEW_PROMPT = `You are a senior security researcher conducting a pre-threat-modeling interview with software developers. Your goal is to gather context that will improve a STRIDE threat analysis.

Ask one focused question at a time about topics such as:
- Authentication and authorization mechanisms
- Trust boundaries and access controls
- Sensitive data types and storage locations
- External integrations and third-party dependencies
- Network segmentation and data flow protection
- Logging, monitoring, and incident response capabilities

Keep questions concise. Build each question on previous answers to go deeper into areas of security concern.`

const serializeGraphForInterview = (graph: Graph): string => {
  const zones = graph.zones.map(z => `  Zone: ${z.name} (id: ${z.id})`).join('\n')
  const components = graph.components.map(c =>
    `  Component: ${c.name} (id: ${c.id}, type: ${c.type}, zone: ${c.zoneId})`
  ).join('\n')
  const flows = graph.flows.map(f => {
    const enc = f.encrypted === true
      ? `, encrypted: yes${f.encryption !== undefined ? ` (${f.encryption})` : ''}`
      : f.encrypted === false ? ', encrypted: no' : ''
    const proto = f.protocol !== undefined ? `, protocol: ${f.protocol}` : ''
    return `  Flow: ${f.name} (id: ${f.id}, from: ${f.originatorId}, to: ${f.targetId}, direction: ${f.direction}${proto}${enc})`
  }).join('\n')
  return `System: ${graph.name}\n\nZones:\n${zones}\n\nComponents:\n${components}\n\nFlows:\n${flows}`
}

export const buildInterviewStartPrompt = (graph: Graph): string =>
  `${serializeGraphForInterview(graph)}\n\nI'd like you to interview me about this system to help with threat modeling. Please ask me one focused security-related question to start.`

const completeOrStream = async (
  client: LLMClient,
  messages: LLMMessage[],
  system: string,
  onChunk: (chunk: string) => void
): Promise<string> => {
  if (client.stream !== undefined) {
    return client.stream(messages, system, onChunk)
  }
  const text = await client.complete(messages, system)
  onChunk(text)
  return text
}

const resolvePrompt = (override?: string): string =>
  override !== undefined && override.length > 0 ? override : DEFAULT_INTERVIEW_PROMPT

export const startInterview = async (client: LLMClient, graph: Graph, systemPrompt?: string): Promise<LLMMessage[]> => {
  const bootstrap: LLMMessage = { role: 'user', content: buildInterviewStartPrompt(graph) }
  const messages: LLMMessage[] = [bootstrap]
  const firstQuestion = await client.complete(messages, resolvePrompt(systemPrompt))
  return [...messages, { role: 'assistant', content: firstQuestion }]
}

export const continueInterview = async (
  client: LLMClient,
  history: LLMMessage[],
  userAnswer: string,
  systemPrompt?: string
): Promise<LLMMessage[]> => {
  const updated: LLMMessage[] = [...history, { role: 'user', content: userAnswer }]
  const nextQuestion = await client.complete(updated, resolvePrompt(systemPrompt))
  return [...updated, { role: 'assistant', content: nextQuestion }]
}

export const startInterviewStreaming = async (
  client: LLMClient,
  graph: Graph,
  onChunk: (chunk: string) => void,
  systemPrompt?: string
): Promise<LLMMessage[]> => {
  const bootstrap: LLMMessage = { role: 'user', content: buildInterviewStartPrompt(graph) }
  const messages: LLMMessage[] = [bootstrap]
  const text = await completeOrStream(client, messages, resolvePrompt(systemPrompt), onChunk)
  return [...messages, { role: 'assistant', content: text }]
}

export const continueInterviewStreaming = async (
  client: LLMClient,
  history: LLMMessage[],
  userAnswer: string,
  onChunk: (chunk: string) => void,
  systemPrompt?: string
): Promise<LLMMessage[]> => {
  const updated: LLMMessage[] = [...history, { role: 'user', content: userAnswer }]
  const text = await completeOrStream(client, updated, resolvePrompt(systemPrompt), onChunk)
  return [...updated, { role: 'assistant', content: text }]
}

export const formatTranscriptForStride = (messages: LLMMessage[]): string =>
  messages.slice(1).map(m =>
    m.role === 'assistant' ? `Researcher: ${m.content}` : `Developer: ${m.content}`
  ).join('\n\n')
