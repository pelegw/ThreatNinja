import { AttackThreatSchema } from '../model/attackThreats'
import type { AttackThreat } from '../model/attackThreats'
import type { Graph } from '../model/graph'
import type { Threat } from '../model/threats'
import type { LLMClient, LLMMessage } from './llm'
import { serializeGraphForPrompt } from './strideAnalysis'
import { formatTranscriptForStride } from './interview'
import { nextId } from '../model/ids'
import { extractJsonObjects } from './parseUtils'

export const DEFAULT_MITRE_PROMPT = `You are a security expert performing MITRE ATT&CK threat analysis on a system that has already been STRIDE-analyzed.

Given the system architecture and the existing STRIDE threats, enumerate MITRE ATT&CK techniques the system is exposed to. For each, provide concrete detection guidance and mitigation, and map it back to the STRIDE threat IDs that prompted it.

Use the 14 enterprise tactics:
Reconnaissance, ResourceDevelopment, InitialAccess, Execution, Persistence, PrivilegeEscalation, DefenseEvasion, CredentialAccess, Discovery, LateralMovement, Collection, CommandAndControl, Exfiltration, Impact

Return ATT&CK threats one per line. Each line must be a single valid JSON object matching this schema exactly:
{
  "id": "<unique string, e.g. a1, a2>",
  "tactic": "<one of the 14 tactics above>",
  "techniqueId": "<MITRE technique id, e.g. T1190 or sub-technique T1190.001>",
  "techniqueName": "<the human-readable technique name from MITRE, e.g. Exploit Public-Facing Application>",
  "title": "<short threat label specific to this system>",
  "description": "<why this technique applies to this system, in 1-3 sentences>",
  "affectedId": "<id of the affected component or flow from the diagram>",
  "severity": "<low|medium|high|critical>",
  "mitigation": "<concrete mitigation specific to this system>",
  "detection": "<how to detect this technique: data sources, telemetry signals, log patterns>",
  "relatedThreatIds": ["<STRIDE threat ids that prompted this ATT&CK technique>"]
}

Rules:
- Prefer accurate MITRE technique IDs and names. If you're not sure of a technique, omit it rather than invent.
- Use sub-technique IDs (e.g. T1190.001) when the sub-technique is more accurate.
- relatedThreatIds must reference STRIDE threat IDs that exist in the input.
- severity uses the same 4-tier scale as STRIDE; reserve "critical" for high-impact + realistic exploit path.
- Do not wrap in an array. Do not include any other text. No markdown fences.`

const serializeStrideThreats = (threats: Threat[]): string =>
  threats.map(t => `  - ${t.id}: [${t.category}] "${t.title}" — affects ${t.affectedId}, severity ${t.severity}`).join('\n')

const serializeExistingAttackThreats = (existing: AttackThreat[]): string =>
  existing.map(a => `  - ${a.id}: [${a.tactic} ${a.techniqueId}] "${a.title}" — affects ${a.affectedId}`).join('\n')

export const buildAttackPrompt = (
  graph: Graph,
  threats: Threat[],
  interviewTranscript?: LLMMessage[],
  existingAttackThreats?: AttackThreat[]
): string => {
  let prompt = `${serializeGraphForPrompt(graph)}\n\nSTRIDE threats already identified:\n${serializeStrideThreats(threats)}\n\nEnumerate MITRE ATT&CK techniques relevant to this system, mapping each to the STRIDE threats it relates to.`
  if (interviewTranscript !== undefined && interviewTranscript.length > 1) {
    const transcriptText = formatTranscriptForStride(interviewTranscript)
    if (transcriptText.length > 0) {
      prompt += `\n\nAdditional context from security interview with developers:\n${transcriptText}`
    }
  }
  if (existingAttackThreats !== undefined && existingAttackThreats.length > 0) {
    prompt += `\n\nThe following ATT&CK techniques have already been identified. Do not repeat these — only return NEW techniques:\n${serializeExistingAttackThreats(existingAttackThreats)}`
  }
  return prompt
}

const parseSingleAttackThreat = (line: string, existingIds: readonly string[]): AttackThreat => {
  const raw = JSON.parse(line) as Record<string, unknown>
  if (!('id' in raw) || typeof raw['id'] !== 'string' || raw['id'].length === 0) {
    raw['id'] = nextId('a', existingIds)
  }
  return AttackThreatSchema.parse(raw)
}

export const parseAttackThreatsResponse = (response: string): AttackThreat[] => {
  const trimmed = response.trim()
  if (trimmed.startsWith('[')) {
    try {
      const arr = JSON.parse(trimmed) as unknown[]
      const usedIds: string[] = []
      return arr.flatMap(item => {
        try {
          const a = parseSingleAttackThreat(JSON.stringify(item), usedIds)
          usedIds.push(a.id)
          return [a]
        } catch { return [] }
      })
    } catch { /* fall through */ }
  }
  const [objects] = extractJsonObjects(trimmed)
  const usedIds: string[] = []
  return objects.flatMap(obj => {
    try {
      const a = parseSingleAttackThreat(obj, usedIds)
      usedIds.push(a.id)
      return [a]
    } catch { return [] }
  })
}

const resolvePrompt = (override?: string): string =>
  override !== undefined && override.length > 0 ? override : DEFAULT_MITRE_PROMPT

export const generateAttackThreats = async (
  client: LLMClient,
  graph: Graph,
  threats: Threat[],
  interviewTranscript?: LLMMessage[],
  existingAttackThreats?: AttackThreat[],
  systemPrompt?: string
): Promise<AttackThreat[]> => {
  const response = await client.complete(
    [{ role: 'user', content: buildAttackPrompt(graph, threats, interviewTranscript, existingAttackThreats) }],
    resolvePrompt(systemPrompt)
  )
  return parseAttackThreatsResponse(response)
}

export const generateAttackThreatsStreaming = async (
  client: LLMClient,
  graph: Graph,
  threats: Threat[],
  onAttackThreat: (a: AttackThreat) => void,
  interviewTranscript?: LLMMessage[],
  existingAttackThreats?: AttackThreat[],
  systemPrompt?: string
): Promise<AttackThreat[]> => {
  const prompt = buildAttackPrompt(graph, threats, interviewTranscript, existingAttackThreats)
  const out: AttackThreat[] = []
  const usedIds = (existingAttackThreats ?? []).map(a => a.id)

  if (client.stream !== undefined) {
    let buffer = ''
    await client.stream(
      [{ role: 'user', content: prompt }],
      resolvePrompt(systemPrompt),
      (chunk) => {
        buffer += chunk
        const [objects, remaining] = extractJsonObjects(buffer)
        buffer = remaining
        for (const obj of objects) {
          try {
            const a = parseSingleAttackThreat(obj, usedIds)
            usedIds.push(a.id)
            out.push(a)
            onAttackThreat(a)
          } catch { /* skip invalid */ }
        }
      }
    )
    return out
  }

  const response = await client.complete(
    [{ role: 'user', content: prompt }],
    resolvePrompt(systemPrompt)
  )
  const parsed = parseAttackThreatsResponse(response)
  for (const a of parsed) {
    out.push(a)
    onAttackThreat(a)
  }
  return out
}
