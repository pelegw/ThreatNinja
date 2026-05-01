import { z } from 'zod'
import { SeveritySchema } from './threats'

export const AttackTactic = {
  Reconnaissance: 'Reconnaissance',
  ResourceDevelopment: 'ResourceDevelopment',
  InitialAccess: 'InitialAccess',
  Execution: 'Execution',
  Persistence: 'Persistence',
  PrivilegeEscalation: 'PrivilegeEscalation',
  DefenseEvasion: 'DefenseEvasion',
  CredentialAccess: 'CredentialAccess',
  Discovery: 'Discovery',
  LateralMovement: 'LateralMovement',
  Collection: 'Collection',
  CommandAndControl: 'CommandAndControl',
  Exfiltration: 'Exfiltration',
  Impact: 'Impact',
} as const

export type AttackTactic = (typeof AttackTactic)[keyof typeof AttackTactic]

export const AttackThreatSchema = z.object({
  id: z.string(),
  tactic: z.nativeEnum(AttackTactic),
  techniqueId: z.string(),
  techniqueName: z.string(),
  title: z.string(),
  description: z.string(),
  affectedId: z.string(),
  severity: SeveritySchema,
  mitigation: z.string().optional(),
  detection: z.string().optional(),
  relatedThreatIds: z.array(z.string()).optional(),
})

export type AttackThreat = z.infer<typeof AttackThreatSchema>

export const AttackThreatListSchema = z.array(AttackThreatSchema)
export type AttackThreatList = z.infer<typeof AttackThreatListSchema>
