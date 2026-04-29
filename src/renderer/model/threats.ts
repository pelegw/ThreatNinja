import { z } from 'zod'

export const StrideCategory = {
  Spoofing: 'Spoofing',
  Tampering: 'Tampering',
  Repudiation: 'Repudiation',
  InformationDisclosure: 'InformationDisclosure',
  DenialOfService: 'DenialOfService',
  ElevationOfPrivilege: 'ElevationOfPrivilege'
} as const

export type StrideCategory = (typeof StrideCategory)[keyof typeof StrideCategory]

const SeveritySchema = z.enum(['low', 'medium', 'high'])

export const ThreatSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.nativeEnum(StrideCategory),
  description: z.string(),
  affectedId: z.string(),
  severity: SeveritySchema,
  mitigation: z.string().optional()
})

export type Threat = z.infer<typeof ThreatSchema>

export const ThreatListSchema = z.array(ThreatSchema)

export type ThreatList = z.infer<typeof ThreatListSchema>
