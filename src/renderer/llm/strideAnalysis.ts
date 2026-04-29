import { ThreatListSchema } from '../model/threats'
import type { Threat } from '../model/threats'
import type { Graph } from '../model/graph'
import type { LLMClient, LLMMessage } from './llm'
import { formatTranscriptForStride } from './interview'

const STRIDE_SYSTEM_PROMPT = `You are a security expert performing STRIDE threat modeling.

Given a system architecture, identify security threats using the STRIDE framework:
- Spoofing: impersonating something or someone else
- Tampering: modifying data or code
- Repudiation: claiming to have not performed an action
- InformationDisclosure: exposing information to unauthorized users
- DenialOfService: denying or degrading service to users
- ElevationOfPrivilege: gaining capabilities without authorization

Return ONLY a valid JSON array of threats matching this schema exactly:
[{
  "id": "<unique string>",
  "title": "<short threat title>",
  "category": "<Spoofing|Tampering|Repudiation|InformationDisclosure|DenialOfService|ElevationOfPrivilege>",
  "description": "<detailed description of the threat>",
  "affectedId": "<id of the affected component or flow>",
  "severity": "<low|medium|high>",
  "mitigation": "<suggested mitigation or control>"
}]

Return only JSON — no prose, no markdown fences.`

const serializeGraphForPrompt = (graph: Graph): string => {
  const zones = graph.zones.map(z => `  Zone: ${z.name} (id: ${z.id})`).join('\n')
  const components = graph.components.map(c => `  Component: ${c.name} (id: ${c.id}, type: ${c.type}, zone: ${c.zoneId})`).join('\n')
  const flows = graph.flows.map(f => `  Flow: ${f.name} (id: ${f.id}, from: ${f.originatorId}, to: ${f.targetId}, direction: ${f.direction})`).join('\n')
  return `System: ${graph.name}\n\nZones:\n${zones}\n\nComponents:\n${components}\n\nFlows:\n${flows}`
}

export const buildStridePrompt = (graph: Graph, interviewTranscript?: LLMMessage[]): string => {
  const base = `${serializeGraphForPrompt(graph)}\n\nPerform STRIDE threat analysis on this system. Return a JSON array of threats.`
  if (interviewTranscript === undefined || interviewTranscript.length <= 1) return base
  const transcriptText = formatTranscriptForStride(interviewTranscript)
  if (transcriptText.length === 0) return base
  return `${base}\n\nAdditional context from security interview with developers:\n${transcriptText}`
}

const extractJson = (text: string): string => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  return fenced !== null ? fenced[1]!.trim() : text.trim()
}

export const parseThreatsResponse = (response: string): Threat[] => {
  const json = extractJson(response)
  const raw = JSON.parse(json) as unknown[]
  const withIds = raw.map(item => {
    const t = item as Record<string, unknown>
    if (!('id' in t) || typeof t['id'] !== 'string' || t['id'].length === 0) {
      return { ...t, id: crypto.randomUUID() }
    }
    return t
  })
  return ThreatListSchema.parse(withIds)
}

export const generateThreats = async (
  client: LLMClient,
  graph: Graph,
  interviewTranscript?: LLMMessage[]
): Promise<Threat[]> => {
  const response = await client.complete(
    [{ role: 'user', content: buildStridePrompt(graph, interviewTranscript) }],
    STRIDE_SYSTEM_PROMPT
  )
  return parseThreatsResponse(response)
}
