import { GraphSchema } from '../model/graph'
import type { Graph } from '../model/graph'
import type { LLMClient } from './llm'

const SYSTEM_PROMPT = `You are a system architecture assistant. Parse the user's description into a structured data flow diagram.

Return ONLY valid JSON matching this schema exactly:
{
  "id": "<unique string>",
  "name": "<system name>",
  "zones": [{ "id": "<string>", "name": "<string>", "description": "<optional string>" }],
  "components": [{ "id": "<string>", "name": "<string>", "type": "<server|desktop|database|service|fileStore|objectStorage|externalEntity>", "zoneId": "<zone id>" }],
  "flows": [{ "id": "<string>", "name": "<string>", "originatorId": "<component id>", "targetId": "<component id>", "direction": "<unidirectional|bidirectional>" }]
}

Rules:
- Group components into logical zones (e.g. Internet, DMZ, Internal Network, Database Tier)
- Every component must belong to an existing zone
- Every flow must reference existing component ids
- Use short kebab-case ids (e.g. "z-internet", "c-api-server", "f-https")
- Return only JSON — no prose, no markdown fences`

export const buildNlToGraphPrompt = (description: string): string =>
  `${SYSTEM_PROMPT}\n\nSystem description:\n${description}`

const extractJson = (text: string): string => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  return fenced !== null ? fenced[1]!.trim() : text.trim()
}

export const generateGraphFromDescription = async (
  client: LLMClient,
  description: string
): Promise<Graph> => {
  const response = await client.complete([{ role: 'user', content: description }], SYSTEM_PROMPT)
  return parseGraphResponse(response)
}

export const parseGraphResponse = (response: string): Graph => {
  const json = extractJson(response)
  const raw = JSON.parse(json) as Record<string, unknown>
  if (!('id' in raw) || typeof raw['id'] !== 'string' || raw['id'].length === 0) {
    raw['id'] = crypto.randomUUID()
  }
  return GraphSchema.parse(raw)
}
