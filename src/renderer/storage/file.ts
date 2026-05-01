import { z } from 'zod'
import { GraphSchema } from '../model/graph'
import type { Graph } from '../model/graph'
import { ThreatListSchema } from '../model/threats'
import type { ThreatList } from '../model/threats'
import { AttackThreatListSchema } from '../model/attackThreats'
import type { AttackThreatList } from '../model/attackThreats'
import { LLMMessageSchema } from '../llm/llm'
import type { LLMMessage } from '../llm/llm'

export const FilePayloadSchema = z.object({
  version: z.literal('1'),
  graph: GraphSchema,
  threats: ThreatListSchema.optional(),
  attackThreats: AttackThreatListSchema.optional(),
  interviewTranscript: z.array(LLMMessageSchema).optional()
})

export type FilePayload = z.infer<typeof FilePayloadSchema>

export const buildFilePayload = (
  graph: Graph,
  threats?: ThreatList,
  interviewTranscript?: LLMMessage[],
  attackThreats?: AttackThreatList
): FilePayload => ({
  version: '1',
  graph,
  ...(threats !== undefined ? { threats } : {}),
  ...(attackThreats !== undefined && attackThreats.length > 0 ? { attackThreats } : {}),
  ...(interviewTranscript !== undefined && interviewTranscript.length > 0 ? { interviewTranscript } : {})
})

export const parseFilePayload = (json: string): FilePayload =>
  FilePayloadSchema.parse(JSON.parse(json))

export const extractGraph = (json: string): Graph =>
  parseFilePayload(json).graph

export const extractThreats = (json: string): ThreatList | undefined =>
  parseFilePayload(json).threats

export const extractAttackThreats = (json: string): AttackThreatList | undefined =>
  parseFilePayload(json).attackThreats

export const extractInterviewTranscript = (json: string): LLMMessage[] | undefined =>
  parseFilePayload(json).interviewTranscript
