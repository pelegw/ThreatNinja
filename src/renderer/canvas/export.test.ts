import { describe, it, expect, vi } from 'vitest'
import { exportToPng, exportToSvg, exportToJson, exportThreatsToCsv } from './export'
import type { Threat } from '../model/threats'

const makeCy = (overrides = {}) => ({
  png: vi.fn().mockReturnValue('data:image/png;base64,abc'),
  svg: vi.fn().mockReturnValue('<svg></svg>'),
  ...overrides
})

describe('exportToPng', () => {
  it('calls cy.png with scale and white background', () => {
    const cy = makeCy()
    exportToPng(cy as never)
    expect(cy.png).toHaveBeenCalledWith(expect.objectContaining({ scale: 2, bg: '#ffffff' }))
  })

  it('returns the data URL from cy.png', () => {
    const cy = makeCy()
    const result = exportToPng(cy as never)
    expect(result).toBe('data:image/png;base64,abc')
  })
})

describe('exportToSvg', () => {
  it('calls cy.svg', () => {
    const cy = makeCy()
    exportToSvg(cy as never)
    expect(cy.svg).toHaveBeenCalled()
  })

  it('returns the SVG string from cy.svg', () => {
    const cy = makeCy()
    const result = exportToSvg(cy as never)
    expect(result).toBe('<svg></svg>')
  })
})

describe('exportToJson', () => {
  it('returns a JSON string of the graph', () => {
    const graph = { id: 'g1', name: 'Test', zones: [], components: [], flows: [] }
    const json = exportToJson(graph as never)
    expect(JSON.parse(json)).toMatchObject({ id: 'g1', name: 'Test' })
  })
})

const makeThreat = (overrides: Partial<Threat> = {}): Threat => ({
  id: 't1',
  title: 'XSS Attack',
  category: 'Tampering',
  description: 'Injected scripts in user input',
  affectedId: 'c-browser',
  severity: 'high',
  ...overrides
})

describe('exportThreatsToCsv', () => {
  it('returns a header row with all threat fields', () => {
    const csv = exportThreatsToCsv([])
    const header = csv.split('\n')[0]
    expect(header).toBe('ID,Title,Category,Severity,Description,Mitigation,Affected Element')
  })

  it('returns one data row per threat', () => {
    const threats = [makeThreat(), makeThreat({ id: 't2', title: 'CSRF' })]
    const lines = exportThreatsToCsv(threats).split('\n')
    expect(lines).toHaveLength(3)
  })

  it('includes threat field values in the correct column order', () => {
    const csv = exportThreatsToCsv([makeThreat()])
    const row = csv.split('\n')[1]
    expect(row).toBe('t1,XSS Attack,Tampering,high,Injected scripts in user input,,c-browser')
  })

  it('uses empty string for missing mitigation', () => {
    const csv = exportThreatsToCsv([makeThreat({ mitigation: undefined })])
    const row = csv.split('\n')[1]
    const columns = row.split(',')
    expect(columns[5]).toBe('')
  })

  it('includes mitigation when present', () => {
    const csv = exportThreatsToCsv([makeThreat({ mitigation: 'Sanitize inputs' })])
    const row = csv.split('\n')[1]
    const columns = row.split(',')
    expect(columns[5]).toBe('Sanitize inputs')
  })

  it('escapes fields containing commas by wrapping in double quotes', () => {
    const csv = exportThreatsToCsv([makeThreat({ description: 'first, second' })])
    const row = csv.split('\n')[1]
    expect(row).toContain('"first, second"')
  })

  it('escapes fields containing double quotes by doubling them', () => {
    const csv = exportThreatsToCsv([makeThreat({ title: 'Say "hello"' })])
    const row = csv.split('\n')[1]
    expect(row).toContain('"Say ""hello"""')
  })

  it('escapes fields containing newlines by wrapping in double quotes', () => {
    const csv = exportThreatsToCsv([makeThreat({ description: 'line1\nline2' })])
    expect(csv).toContain('"line1\nline2"')
  })
})
