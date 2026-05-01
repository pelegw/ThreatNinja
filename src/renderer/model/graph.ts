import { z } from 'zod'

const PositionSchema = z.object({ x: z.number(), y: z.number() })

export const ZoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  parentId: z.string().optional(),
  position: PositionSchema.optional(),
  shape: z.enum(['rect', 'line']).optional(),
  endPosition: PositionSchema.optional(),
  midPosition: PositionSchema.optional()
})

export type Zone = z.infer<typeof ZoneSchema>

export const ComponentType = {
  Process: 'process',
  External: 'external',
  DataStore: 'datastore',
  Queue: 'queue',
} as const

export type ComponentType = (typeof ComponentType)[keyof typeof ComponentType]

export const ComponentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.nativeEnum(ComponentType),
  zoneId: z.string(),
  icon: z.string().optional(),
  position: PositionSchema.optional()
})

export type Component = z.infer<typeof ComponentSchema>

export const FlowDirection = {
  Unidirectional: 'unidirectional',
  Bidirectional: 'bidirectional'
} as const

export type FlowDirection = (typeof FlowDirection)[keyof typeof FlowDirection]

export const FlowSchema = z.object({
  id: z.string(),
  name: z.string(),
  originatorId: z.string(),
  targetId: z.string(),
  direction: z.nativeEnum(FlowDirection),
  protocol: z.string().optional(),
  encrypted: z.boolean().optional(),
  encryption: z.string().optional()
})

export type Flow = z.infer<typeof FlowSchema>

export const GraphSchema = z.object({
  id: z.string(),
  name: z.string(),
  zones: z.array(ZoneSchema),
  components: z.array(ComponentSchema),
  flows: z.array(FlowSchema)
})

export type Graph = z.infer<typeof GraphSchema>

export const serializeGraph = (graph: Graph): string => JSON.stringify(graph)

export const deserializeGraph = (json: string): Graph => GraphSchema.parse(JSON.parse(json))
