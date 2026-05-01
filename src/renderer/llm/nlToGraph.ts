import { GraphSchema } from '../model/graph'
import type { Graph } from '../model/graph'
import type { LLMClient } from './llm'
import { nextId } from '../model/ids'

export const DEFAULT_NL_TO_GRAPH_PROMPT = `You are a system architecture assistant. Parse the user's description into a structured data flow diagram.

Return ONLY valid JSON matching this schema exactly:
{
  "id": "<unique string>",
  "name": "<system name>",
  "zones": [{
    "id": "<string>",
    "name": "<string>",
    "description": "<optional string>",
    "shape": "<optional 'rect' | 'line'>",
    "parentId": "<optional id of an enclosing zone>"
  }],
  "components": [{
    "id": "<string>",
    "name": "<string>",
    "type": "<process|external|datastore|queue>",
    "zoneId": "<zone id>",
    "icon": "<optional icon id>"
  }],
  "flows": [{
    "id": "<string>",
    "name": "<string>",
    "originatorId": "<component id>",
    "targetId": "<component id>",
    "direction": "<unidirectional|bidirectional>",
    "protocol": "<optional, e.g. HTTPS, gRPC, SQL, AMQP, TCP>",
    "encrypted": "<optional boolean — true if the channel is encrypted/authenticated, false if plaintext>",
    "encryption": "<optional, e.g. TLS, mTLS — only when encrypted is true>"
  }]
}

Component types (DFD node classes):
- process: anything that computes — APIs, functions, workers, services
- external: actors outside the system — browsers, users, third-party APIs
- datastore: persistent data — relational DBs, document DBs, caches, object stores
- queue: messaging infrastructure — queues, topics, streams (SQS, Kafka, Pub/Sub)

Optional icon ids (use only when the subclass is clear; omit if unknown):
- process: server, cog, worker
- external: browser, user, cloud
- datastore: database, document, bolt, folder
- queue: list, radio, activity

Zone shapes:
- "rect" (default): a regular containing zone like Internet, DMZ, Internal Network
- "line": a thin trust boundary that separates two regions without containing components — useful for explicit trust boundaries (e.g. "Internet ↔ DMZ"). Components keep their zoneId pointing to a normal rect zone; line zones are visual annotations only.

Rules:
- Group components into logical containing zones (e.g. Internet, DMZ, Internal Network, Database Tier)
- Every component's zoneId must reference an existing rect zone (do not assign components to line zones)
- Use parentId when one zone visibly contains another (e.g. "Database Tier" inside "Internal Network")
- Every flow must reference existing component ids
- Set "encrypted" whenever the description implies trust: HTTPS/TLS/mTLS/SSH/signed/authenticated → true; HTTP/plaintext/cleartext/unauthenticated → false. Omit only when unknown.
- Set "protocol" whenever the description names one (HTTPS, gRPC, SQL, AMQP, etc.)
- Use short sequential ids with a prefix (e.g. "z1", "z2" for zones, "c1", "c2" for components, "f1", "f2" for flows)
- Return only JSON — no prose, no markdown fences`

export const buildNlToGraphPrompt = (description: string): string =>
  `${DEFAULT_NL_TO_GRAPH_PROMPT}\n\nSystem description:\n${description}`

const extractJson = (text: string): string => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  return fenced !== null ? fenced[1]!.trim() : text.trim()
}

export const generateGraphFromDescription = async (
  client: LLMClient,
  description: string,
  systemPrompt?: string
): Promise<Graph> => {
  const prompt = systemPrompt !== undefined && systemPrompt.length > 0 ? systemPrompt : DEFAULT_NL_TO_GRAPH_PROMPT
  const response = await client.complete([{ role: 'user', content: description }], prompt)
  return parseGraphResponse(response)
}

export const parseGraphResponse = (response: string): Graph => {
  const json = extractJson(response)
  const raw = JSON.parse(json) as Record<string, unknown>
  if (!('id' in raw) || typeof raw['id'] !== 'string' || raw['id'].length === 0) {
    raw['id'] = nextId('g', [])
  }
  return GraphSchema.parse(raw)
}
