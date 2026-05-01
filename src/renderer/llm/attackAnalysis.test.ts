import { describe, it, expect, vi } from 'vitest'
import {
  buildAttackPrompt,
  parseAttackThreatsResponse,
  generateAttackThreats,
  generateAttackThreatsStreaming,
  DEFAULT_MITRE_PROMPT,
} from './attackAnalysis'
import { AttackTactic } from '../model/attackThreats'
import type { AttackThreat } from '../model/attackThreats'
import { ComponentType, FlowDirection } from '../model/graph'
import type { Graph } from '../model/graph'
import { StrideCategory } from '../model/threats'
import type { Threat } from '../model/threats'
import type { LLMClient } from './llm'

const sampleGraph: Graph = {
  id: 'g1',
  name: 'Demo',
  zones: [{ id: 'z1', name: 'Internal' }],
  components: [{ id: 'c1', name: 'API', type: ComponentType.Process, zoneId: 'z1' }],
  flows: [{ id: 'f1', name: 'Call', originatorId: 'c1', targetId: 'c1', direction: FlowDirection.Unidirectional }],
}

const strideThreats: Threat[] = [
  { id: 't1', title: 'Spoof API caller', category: StrideCategory.Spoofing, description: 'x', affectedId: 'c1', severity: 'high' },
  { id: 't2', title: 'Tamper response', category: StrideCategory.Tampering, description: 'y', affectedId: 'f1', severity: 'medium' },
]

const validAttackJsonl = [
  JSON.stringify({
    id: 'a1', tactic: AttackTactic.InitialAccess, techniqueId: 'T1190',
    techniqueName: 'Exploit Public-Facing Application', title: 'Exploit unpatched API',
    description: 'd', affectedId: 'c1', severity: 'high',
    relatedThreatIds: ['t1'],
  }),
  JSON.stringify({
    id: 'a2', tactic: AttackTactic.CredentialAccess, techniqueId: 'T1110',
    techniqueName: 'Brute Force', title: 'Credential brute force',
    description: 'd', affectedId: 'c1', severity: 'medium',
  }),
].join('\n')

describe('buildAttackPrompt', () => {
  it('includes the graph name', () => {
    expect(buildAttackPrompt(sampleGraph, strideThreats)).toContain('Demo')
  })

  it('includes the STRIDE threat IDs so the LLM can map back', () => {
    const prompt = buildAttackPrompt(sampleGraph, strideThreats)
    expect(prompt).toContain('t1')
    expect(prompt).toContain('t2')
  })

  it('includes the STRIDE category names so the LLM has context', () => {
    const prompt = buildAttackPrompt(sampleGraph, strideThreats)
    expect(prompt).toContain('Spoofing')
    expect(prompt).toContain('Tampering')
  })

  it('appends interview transcript text when provided with at least one assistant turn', () => {
    const prompt = buildAttackPrompt(sampleGraph, strideThreats, [
      { role: 'user', content: 'bootstrap' },
      { role: 'assistant', content: 'What auth mechanism do you use?' },
    ])
    expect(prompt).toContain('What auth mechanism do you use?')
  })

  it('omits the interview section when transcript is empty', () => {
    expect(buildAttackPrompt(sampleGraph, strideThreats, [])).not.toContain('Additional context')
  })

  it('lists existing ATT&CK threats as do-not-repeat when provided', () => {
    const existing: AttackThreat[] = [
      { id: 'a1', tactic: AttackTactic.InitialAccess, techniqueId: 'T1190', techniqueName: 'X', title: 'Y', description: 'd', affectedId: 'c1', severity: 'high' },
    ]
    const prompt = buildAttackPrompt(sampleGraph, strideThreats, undefined, existing)
    expect(prompt).toContain('Do not repeat')
    expect(prompt).toContain('T1190')
  })
})

describe('parseAttackThreatsResponse', () => {
  it('parses valid JSONL into AttackThreat objects', () => {
    const parsed = parseAttackThreatsResponse(validAttackJsonl)
    expect(parsed).toHaveLength(2)
    expect(parsed[0]!.techniqueId).toBe('T1190')
    expect(parsed[1]!.tactic).toBe(AttackTactic.CredentialAccess)
  })

  it('skips invalid lines and keeps the valid ones', () => {
    const mixed = [
      validAttackJsonl.split('\n')[0]!,
      'not json at all',
      '{"id":"a3"}', // schema-invalid (missing required)
      validAttackJsonl.split('\n')[1]!,
    ].join('\n')
    expect(parseAttackThreatsResponse(mixed)).toHaveLength(2)
  })

  it('synthesises an id when an LLM line omits it', () => {
    const noId = JSON.stringify({
      tactic: AttackTactic.InitialAccess, techniqueId: 'T1190',
      techniqueName: 'X', title: 'Y', description: 'd', affectedId: 'c1', severity: 'high',
    })
    const parsed = parseAttackThreatsResponse(noId)
    expect(parsed[0]!.id.length).toBeGreaterThan(0)
  })
})

describe('generateAttackThreats', () => {
  it('calls client.complete with the built prompt and the default system prompt', async () => {
    const client: LLMClient = { complete: vi.fn().mockResolvedValue(validAttackJsonl) }
    await generateAttackThreats(client, sampleGraph, strideThreats)
    const [messages, systemPrompt] = vi.mocked(client.complete).mock.calls[0]!
    expect(messages[0]!.content).toContain('Demo')
    expect(systemPrompt).toBe(DEFAULT_MITRE_PROMPT)
  })

  it('uses a custom system prompt when provided', async () => {
    const client: LLMClient = { complete: vi.fn().mockResolvedValue(validAttackJsonl) }
    await generateAttackThreats(client, sampleGraph, strideThreats, undefined, undefined, 'CUSTOM')
    const [, systemPrompt] = vi.mocked(client.complete).mock.calls[0]!
    expect(systemPrompt).toBe('CUSTOM')
  })

  it('returns the parsed ATT&CK threats from the LLM response', async () => {
    const client: LLMClient = { complete: vi.fn().mockResolvedValue(validAttackJsonl) }
    const result = await generateAttackThreats(client, sampleGraph, strideThreats)
    expect(result).toHaveLength(2)
  })
})

describe('generateAttackThreatsStreaming', () => {
  it('emits each ATT&CK threat through onAttackThreat as lines arrive', async () => {
    const onAttack = vi.fn()
    const client: LLMClient = {
      complete: vi.fn(),
      stream: vi.fn(async (_msgs, _sys, onChunk) => {
        for (const line of validAttackJsonl.split('\n')) onChunk(line + '\n')
        return validAttackJsonl
      }),
    }
    const result = await generateAttackThreatsStreaming(client, sampleGraph, strideThreats, onAttack)
    expect(result).toHaveLength(2)
    expect(onAttack).toHaveBeenCalledTimes(2)
  })

  it('falls back to non-streaming complete when client.stream is undefined', async () => {
    const onAttack = vi.fn()
    const client: LLMClient = { complete: vi.fn().mockResolvedValue(validAttackJsonl) }
    const result = await generateAttackThreatsStreaming(client, sampleGraph, strideThreats, onAttack)
    expect(result).toHaveLength(2)
    expect(onAttack).toHaveBeenCalledTimes(2)
  })
})
