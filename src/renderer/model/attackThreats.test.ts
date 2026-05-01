import { describe, it, expect } from 'vitest'
import { AttackThreatSchema, AttackThreatListSchema, AttackTactic } from './attackThreats'

const baseAttack = {
  id: 'a1',
  tactic: AttackTactic.InitialAccess,
  techniqueId: 'T1190',
  techniqueName: 'Exploit Public-Facing Application',
  title: 'Exploit unpatched API',
  description: 'Attacker exploits a CVE in the public API to gain initial access.',
  affectedId: 'c-api',
  severity: 'high',
}

describe('AttackThreatSchema', () => {
  it('parses a minimally valid ATT&CK threat', () => {
    expect(AttackThreatSchema.parse(baseAttack)).toEqual(baseAttack)
  })

  it('exposes the 14 enterprise tactics', () => {
    expect(Object.values(AttackTactic)).toHaveLength(14)
  })

  it('accepts severity "critical" (4-tier shared with STRIDE threats)', () => {
    const parsed = AttackThreatSchema.parse({ ...baseAttack, severity: 'critical' })
    expect(parsed.severity).toBe('critical')
  })

  it('rejects an unknown tactic', () => {
    expect(() => AttackThreatSchema.parse({ ...baseAttack, tactic: 'TimeTravel' })).toThrow()
  })

  it('accepts an optional mitigation', () => {
    const parsed = AttackThreatSchema.parse({ ...baseAttack, mitigation: 'Patch promptly; restrict ingress.' })
    expect(parsed.mitigation).toContain('Patch')
  })

  it('accepts an optional detection guidance string', () => {
    const parsed = AttackThreatSchema.parse({ ...baseAttack, detection: 'Monitor WAF for known CVE signatures.' })
    expect(parsed.detection).toContain('WAF')
  })

  it('accepts an optional relatedThreatIds array', () => {
    const parsed = AttackThreatSchema.parse({ ...baseAttack, relatedThreatIds: ['t1', 't3'] })
    expect(parsed.relatedThreatIds).toEqual(['t1', 't3'])
  })

  it('accepts a sub-technique identifier in techniqueId', () => {
    const parsed = AttackThreatSchema.parse({ ...baseAttack, techniqueId: 'T1190.001' })
    expect(parsed.techniqueId).toBe('T1190.001')
  })

  it('rejects a threat missing required fields', () => {
    expect(() => AttackThreatSchema.parse({ id: 'a1' })).toThrow()
  })

  it('strips unknown fields', () => {
    const parsed = AttackThreatSchema.parse({ ...baseAttack, surprise: true })
    expect(parsed).not.toHaveProperty('surprise')
  })
})

describe('AttackThreatListSchema', () => {
  it('parses an empty list', () => {
    expect(AttackThreatListSchema.parse([])).toEqual([])
  })

  it('parses a list of multiple ATT&CK threats', () => {
    const list = [baseAttack, { ...baseAttack, id: 'a2', tactic: AttackTactic.Exfiltration, techniqueId: 'T1041' }]
    expect(AttackThreatListSchema.parse(list)).toHaveLength(2)
  })
})
