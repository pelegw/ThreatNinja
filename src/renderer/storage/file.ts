import { z } from 'zod'
import { GraphSchema } from '../model/graph'
import type { Graph } from '../model/graph'
import { ThreatListSchema } from '../model/threats'
import type { ThreatList } from '../model/threats'
import { LLMMessageSchema } from '../llm/llm'
import type { LLMMessage } from '../llm/llm'

export const FilePayloadSchema = z.object({
  version: z.literal('1'),
  graph: GraphSchema,
  threats: ThreatListSchema.optional(),
  interviewTranscript: z.array(LLMMessageSchema).optional()
})

export type FilePayload = z.infer<typeof FilePayloadSchema>

export const buildFilePayload = (graph: Graph, threats?: ThreatList, interviewTranscript?: LLMMessage[]): FilePayload => ({
  version: '1',
  graph,
  ...(threats !== undefined ? { threats } : {}),
  ...(interviewTranscript !== undefined && interviewTranscript.length > 0 ? { interviewTranscript } : {})
})

export const extractGraph = (json: string): Graph =>
  FilePayloadSchema.parse(JSON.parse(json)).graph

export const extractThreats = (json: string): ThreatList | undefined =>
  FilePayloadSchema.parse(JSON.parse(json)).threats

export const extractInterviewTranscript = (json: string): LLMMessage[] | undefined =>
  FilePayloadSchema.parse(JSON.parse(json)).interviewTranscript
