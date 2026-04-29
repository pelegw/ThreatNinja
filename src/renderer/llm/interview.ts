import type { Graph } from '../model/graph'
import type { LLMClient, LLMMessage } from './llm'

const INTERVIEW_SYSTEM_PROMPT = `You are a senior security researcher conducting a pre-threat-modeling interview with software developers. Your goal is to gather context that will improve a STRIDE threat analysis.

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

export const startInterview = async (client: LLMClient, graph: Graph): Promise<LLMMessage[]> => {
  const bootstrap: LLMMessage = { role: 'user', content: buildInterviewStartPrompt(graph) }
  const messages: LLMMessage[] = [bootstrap]
  const firstQuestion = await client.complete(messages, INTERVIEW_SYSTEM_PROMPT)
  return [...messages, { role: 'assistant', content: firstQuestion }]
}

export const continueInterview = async (
  client: LLMClient,
  history: LLMMessage[],
  userAnswer: string
): Promise<LLMMessage[]> => {
  const updated: LLMMessage[] = [...history, { role: 'user', content: userAnswer }]
  const nextQuestion = await client.complete(updated, INTERVIEW_SYSTEM_PROMPT)
  return [...updated, { role: 'assistant', content: nextQuestion }]
}

export const formatTranscriptForStride = (messages: LLMMessage[]): string =>
  messages.slice(1).map(m =>
    m.role === 'assistant' ? `Researcher: ${m.content}` : `Developer: ${m.content}`
  ).join('\n\n')
