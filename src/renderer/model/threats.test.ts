import { describe, it, expect } from 'vitest'
import { ThreatSchema, StrideCategory, ThreatListSchema } from './threats'

describe('ThreatSchema', () => {
  it('parses a valid threat', () => {
    const threat = {
      id: 't1',
      title: 'SQL Injection',
      category: StrideCategory.Tampering,
      description: 'Attacker injects SQL into the query',
      affectedId: 'c-db',
      severity: 'high'
    }
    expect(ThreatSchema.parse(threat)).toEqual(threat)
  })

  it('rejects a threat with unknown category', () => {
    expect(() => ThreatSchema.parse({
      id: 't1', title: 'x', category: 'Unknown', description: 'x', affectedId: 'c1', severity: 'high'
    })).toThrow()
  })

  it('rejects a threat with unknown severity', () => {
    expect(() => ThreatSchema.parse({
      id: 't1', title: 'x', category: StrideCategory.Spoofing, description: 'x', affectedId: 'c1', severity: 'critical'
    })).toThrow()
  })

  it('rejects a threat missing required fields', () => {
    expect(() => ThreatSchema.parse({ id: 't1' })).toThrow()
  })
})

describe('ThreatListSchema', () => {
  it('parses an empty threat list', () => {
    expect(ThreatListSchema.parse([])).toEqual([])
  })

  it('parses a list with multiple threats', () => {
    const threats = [
      { id: 't1', title: 'A', category: StrideCategory.Spoofing, description: 'x', affectedId: 'c1', severity: 'low' },
      { id: 't2', title: 'B', category: StrideCategory.Repudiation, description: 'y', affectedId: 'f1', severity: 'medium' }
    ]
    const parsed = ThreatListSchema.parse(threats)
    expect(parsed).toHaveLength(2)
    expect(parsed[0]!.category).toBe(StrideCategory.Spoofing)
    expect(parsed[1]!.severity).toBe('medium')
  })
})

describe('StrideCategory', () => {
  it('has all six STRIDE values', () => {
    expect(Object.values(StrideCategory)).toHaveLength(6)
    expect(StrideCategory.Spoofing).toBeDefined()
    expect(StrideCategory.Tampering).toBeDefined()
    expect(StrideCategory.Repudiation).toBeDefined()
    expect(StrideCategory.InformationDisclosure).toBeDefined()
    expect(StrideCategory.DenialOfService).toBeDefined()
    expect(StrideCategory.ElevationOfPrivilege).toBeDefined()
  })
})
