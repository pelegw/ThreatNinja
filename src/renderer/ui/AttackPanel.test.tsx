// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render as baseRender, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import AttackPanel from './AttackPanel'
import { AttackTactic } from '../model/attackThreats'
import type { AttackThreat } from '../model/attackThreats'
import type { Graph } from '../model/graph'
import { ThemeContext, lightTheme } from './tokens'

const themeWrapper = ({ children }: { children: React.ReactNode }) =>
  <ThemeContext.Provider value={lightTheme}>{children}</ThemeContext.Provider>

const render: typeof baseRender = (ui, options) =>
  baseRender(ui, { wrapper: themeWrapper, ...options })

const sample: AttackThreat[] = [
  {
    id: 'a1', tactic: AttackTactic.InitialAccess, techniqueId: 'T1190',
    techniqueName: 'Exploit Public-Facing Application', title: 'Exploit unpatched API',
    description: 'd', affectedId: 'c1', severity: 'high',
    mitigation: 'Patch promptly.', detection: 'Monitor WAF.',
    relatedThreatIds: ['t1']
  }
]

const sampleGraph: Graph = {
  id: 'g1', name: 'X',
  zones: [{ id: 'z1', name: 'DMZ' }],
  components: [{ id: 'c1', name: 'API', type: 'process', zoneId: 'z1' }],
  flows: []
}

const noop = vi.fn()

describe('AttackPanel', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows the not-yet-analyzed message when attackThreats is null', () => {
    render(<AttackPanel attackThreats={null} />)
    expect(screen.getByText(/run stride first/i)).toBeInTheDocument()
  })

  it('renders the technique ID and name in the row', () => {
    render(<AttackPanel attackThreats={sample} />)
    expect(screen.getByText('T1190')).toBeInTheDocument()
    expect(screen.getByText('Exploit Public-Facing Application')).toBeInTheDocument()
  })

  it('renders the tactic chip', () => {
    render(<AttackPanel attackThreats={sample} />)
    expect(screen.getByText('InitialAccess')).toBeInTheDocument()
  })

  it('shows + New ATT&CK threat button always', () => {
    render(<AttackPanel attackThreats={null} />)
    expect(screen.getByRole('button', { name: /new att&ck threat/i })).toBeInTheDocument()
  })

  it('expands the row to show description, mitigation, and detection on click', () => {
    render(<AttackPanel attackThreats={sample} />)
    const titleInput = screen.getByDisplayValue('Exploit unpatched API')
    fireEvent.click(titleInput.closest('tr')!)
    expect(screen.getByDisplayValue('Patch promptly.')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Monitor WAF.')).toBeInTheDocument()
  })

  it('opens the MITRE technique URL via electronAPI when the technique ID is clicked', () => {
    const openExternal = vi.fn().mockResolvedValue({ ok: true })
    Object.defineProperty(window, 'electronAPI', {
      value: { openExternal }, writable: true, configurable: true
    })
    render(<AttackPanel attackThreats={sample} />)
    fireEvent.click(screen.getByText('T1190'))
    expect(openExternal).toHaveBeenCalledWith('https://attack.mitre.org/techniques/T1190/')
  })

  it('renders Affected as a select when graph is provided', () => {
    render(<AttackPanel attackThreats={sample} graph={sampleGraph} />)
    const select = screen.getByRole('combobox', { name: /affected/i })
    expect(select).toHaveValue('c1')
  })

  it('appends a new ATT&CK threat when + New ATT&CK threat is clicked', () => {
    const onChange = vi.fn()
    render(<AttackPanel attackThreats={sample} onAttackThreatsChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /new att&ck threat/i }))
    const [updated] = onChange.mock.calls[0]! as [AttackThreat[]]
    expect(updated).toHaveLength(2)
    expect(updated[1]!.title).toBe('')
  })
})
