import { ThreatSchema, ThreatListSchema } from '../model/threats'
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

Return threats one per line. Each line must be a single valid JSON object matching this schema exactly:
{
  "id": "<unique string>",
  "title": "<short threat title>",
  "category": "<Spoofing|Tampering|Repudiation|InformationDisclosure|DenialOfService|ElevationOfPrivilege>",
  "description": "<detailed description of the threat>",
  "affectedId": "<id of the affected component or flow>",
  "severity": "<low|medium|high>",
  "mitigation": "<suggested mitigation or control>"
}

Do not wrap in an array. Do not include any other text.`

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

const parseSingleThreat = (line: string): Threat => {
  const raw = JSON.parse(line) as Record<string, unknown>
  if (!('id' in raw) || typeof raw['id'] !== 'string' || raw['id'].length === 0) {
    raw['id'] = crypto.randomUUID()
  }
  return ThreatSchema.parse(raw)
}

export const parseThreatsResponse = (response: string): Threat[] =>
  response.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .flatMap(line => {
      try { return [parseSingleThreat(line)] } catch { return [] }
    })

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

export const generateThreatsStreaming = async (
  client: LLMClient,
  graph: Graph,
  onThreat: (threat: Threat) => void,
  interviewTranscript?: LLMMessage[]
): Promise<Threat[]> => {
  const prompt = buildStridePrompt(graph, interviewTranscript)
  const threats: Threat[] = []

  if (client.stream !== undefined) {
    let buffer = ''
    await client.stream(
      [{ role: 'user', content: prompt }],
      STRIDE_SYSTEM_PROMPT,
      (chunk) => {
        buffer += chunk
        let newlinePos: number
        while ((newlinePos = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlinePos).trim()
          buffer = buffer.slice(newlinePos + 1)
          if (line.length === 0) continue
          try {
            const threat = parseSingleThreat(line)
            threats.push(threat)
            onThreat(threat)
          } catch { /* skip incomplete/invalid lines */ }
        }
      }
    )
    const remaining = buffer.trim()
    if (remaining.length > 0) {
      try {
        const threat = parseSingleThreat(remaining)
        threats.push(threat)
        onThreat(threat)
      } catch { /* skip */ }
    }
    return threats
  }

  const response = await client.complete(
    [{ role: 'user', content: prompt }],
    STRIDE_SYSTEM_PROMPT
  )
  const parsed = parseThreatsResponse(response)
  for (const threat of parsed) {
    threats.push(threat)
    onThreat(threat)
  }
  return threats
}
