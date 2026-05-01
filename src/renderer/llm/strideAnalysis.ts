import { ThreatSchema, ThreatListSchema } from '../model/threats'
import type { Threat } from '../model/threats'
import type { Graph } from '../model/graph'
import type { LLMClient, LLMMessage } from './llm'
import { formatTranscriptForStride } from './interview'
import { nextId } from '../model/ids'

export const DEFAULT_STRIDE_PROMPT = `You are a security expert performing STRIDE threat modeling.

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
  "severity": "<low|medium|high|critical>",
  "mitigation": "<suggested mitigation or control>"
}

Use "critical" only for threats that combine high impact with a realistic exploitation path; otherwise prefer high/medium/low.

Do not wrap in an array. Do not include any other text.`

export const serializeGraphForPrompt = (graph: Graph): string => {
  const zones = graph.zones.map(z => `  Zone: ${z.name} (id: ${z.id})`).join('\n')
  const components = graph.components.map(c => `  Component: ${c.name} (id: ${c.id}, type: ${c.type}, zone: ${c.zoneId})`).join('\n')
  const flows = graph.flows.map(f => `  Flow: ${f.name} (id: ${f.id}, from: ${f.originatorId}, to: ${f.targetId}, direction: ${f.direction})`).join('\n')
  return `System: ${graph.name}\n\nZones:\n${zones}\n\nComponents:\n${components}\n\nFlows:\n${flows}`
}

const serializeExistingThreats = (threats: Threat[]): string =>
  threats.map(t => `  - [${t.category}] "${t.title}" (affects: ${t.affectedId}, severity: ${t.severity})`).join('\n')

export const buildStridePrompt = (graph: Graph, interviewTranscript?: LLMMessage[], existingThreats?: Threat[]): string => {
  let prompt = `${serializeGraphForPrompt(graph)}\n\nPerform STRIDE threat analysis on this system. Return a JSON array of threats.`
  if (interviewTranscript !== undefined && interviewTranscript.length > 1) {
    const transcriptText = formatTranscriptForStride(interviewTranscript)
    if (transcriptText.length > 0) {
      prompt += `\n\nAdditional context from security interview with developers:\n${transcriptText}`
    }
  }
  if (existingThreats !== undefined && existingThreats.length > 0) {
    prompt += `\n\nThe following threats have already been identified. Do not repeat these — only return NEW threats:\n${serializeExistingThreats(existingThreats)}`
  }
  return prompt
}

const parseSingleThreat = (line: string, existingIds: readonly string[]): Threat => {
  const raw = JSON.parse(line) as Record<string, unknown>
  if (!('id' in raw) || typeof raw['id'] !== 'string' || raw['id'].length === 0) {
    raw['id'] = nextId('t', existingIds)
  }
  return ThreatSchema.parse(raw)
}

export const parseThreatsResponse = (response: string): Threat[] => {
  const usedIds: string[] = []
  return response.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .flatMap(line => {
      try {
        const threat = parseSingleThreat(line, usedIds)
        usedIds.push(threat.id)
        return [threat]
      } catch { return [] }
    })
}

const resolveStridePrompt = (override?: string): string =>
  override !== undefined && override.length > 0 ? override : DEFAULT_STRIDE_PROMPT

export const generateThreats = async (
  client: LLMClient,
  graph: Graph,
  interviewTranscript?: LLMMessage[],
  existingThreats?: Threat[],
  systemPrompt?: string
): Promise<Threat[]> => {
  const response = await client.complete(
    [{ role: 'user', content: buildStridePrompt(graph, interviewTranscript, existingThreats) }],
    resolveStridePrompt(systemPrompt)
  )
  return parseThreatsResponse(response)
}

export const generateThreatsStreaming = async (
  client: LLMClient,
  graph: Graph,
  onThreat: (threat: Threat) => void,
  interviewTranscript?: LLMMessage[],
  existingThreats?: Threat[],
  systemPrompt?: string
): Promise<Threat[]> => {
  const prompt = buildStridePrompt(graph, interviewTranscript, existingThreats)
  const threats: Threat[] = []
  const usedIds = (existingThreats ?? []).map(t => t.id)

  if (client.stream !== undefined) {
    let buffer = ''
    await client.stream(
      [{ role: 'user', content: prompt }],
      resolveStridePrompt(systemPrompt),
      (chunk) => {
        buffer += chunk
        let newlinePos: number
        while ((newlinePos = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlinePos).trim()
          buffer = buffer.slice(newlinePos + 1)
          if (line.length === 0) continue
          try {
            const threat = parseSingleThreat(line, usedIds)
            usedIds.push(threat.id)
            threats.push(threat)
            onThreat(threat)
          } catch { /* skip incomplete/invalid lines */ }
        }
      }
    )
    const remaining = buffer.trim()
    if (remaining.length > 0) {
      try {
        const threat = parseSingleThreat(remaining, usedIds)
        usedIds.push(threat.id)
        threats.push(threat)
        onThreat(threat)
      } catch { /* skip */ }
    }
    return threats
  }

  const response = await client.complete(
    [{ role: 'user', content: prompt }],
    resolveStridePrompt(systemPrompt)
  )
  const parsed = parseThreatsResponse(response)
  for (const threat of parsed) {
    threats.push(threat)
    onThreat(threat)
  }
  return threats
}
