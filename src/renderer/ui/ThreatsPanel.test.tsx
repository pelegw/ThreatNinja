// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render as baseRender, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import ThreatsPanel from './ThreatsPanel'
import { StrideCategory } from '../model/threats'
import type { Threat } from '../model/threats'
import { ThemeContext, lightTheme } from './tokens'

const themeWrapper = ({ children }: { children: React.ReactNode }) =>
  <ThemeContext.Provider value={lightTheme}>{children}</ThemeContext.Provider>

const render: typeof baseRender = (ui, options) =>
  baseRender(ui, { wrapper: themeWrapper, ...options })

const sampleThreats: Threat[] = [
  { id: 't1', title: 'SQL Injection', category: StrideCategory.Tampering, description: 'Attacker injects SQL', affectedId: 'c-db', severity: 'high' },
  { id: 't2', title: 'Replay Attack', category: StrideCategory.Spoofing, description: 'Replays auth tokens', affectedId: 'f1', severity: 'medium' }
]

const noop = vi.fn()

describe('ThreatsPanel', () => {
  it('renders a table with the threat titles', () => {
    render(<ThreatsPanel threats={sampleThreats} onClose={noop} />)
    expect(screen.getByDisplayValue('SQL Injection')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Replay Attack')).toBeInTheDocument()
  })

  it('renders the STRIDE category for each threat as a select', () => {
    render(<ThreatsPanel threats={sampleThreats} onClose={noop} />)
    expect(screen.getByDisplayValue(StrideCategory.Tampering)).toBeInTheDocument()
    expect(screen.getByDisplayValue(StrideCategory.Spoofing)).toBeInTheDocument()
  })

  it('renders the severity for each threat as a select', () => {
    render(<ThreatsPanel threats={sampleThreats} onClose={noop} />)
    expect(screen.getByDisplayValue('High')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Medium')).toBeInTheDocument()
  })

  it('offers Critical as the highest severity option in each row dropdown', () => {
    render(<ThreatsPanel threats={sampleThreats} onClose={noop} />)
    const sevSelects = screen.getAllByRole('combobox').filter(s => (s as HTMLSelectElement).value === 'high' || (s as HTMLSelectElement).value === 'medium')
    expect(sevSelects.length).toBeGreaterThan(0)
    sevSelects.forEach(s => expect(s.querySelector('option[value="critical"]')).toBeInTheDocument())
  })

  it('shows a Critical count chip in the header when at least one critical threat exists', () => {
    const withCritical = [{ ...sampleThreats[0]!, severity: 'critical' as const }, sampleThreats[1]!]
    render(<ThreatsPanel threats={withCritical} onClose={noop} />)
    expect(screen.getAllByText(/1 Critical/i).length).toBeGreaterThan(0)
  })

  it('renders the threat description', () => {
    render(<ThreatsPanel threats={sampleThreats} onClose={noop} />)
    expect(screen.getByDisplayValue('Attacker injects SQL')).toBeInTheDocument()
  })

  it('shows a message when there are no threats', () => {
    render(<ThreatsPanel threats={[]} onClose={noop} />)
    expect(screen.getByText(/no threats/i)).toBeInTheDocument()
  })

  it('shows a not-yet-analyzed message when threats is null', () => {
    render(<ThreatsPanel threats={null} />)
    expect(screen.getByText(/run analyze/i)).toBeInTheDocument()
  })

  it('calls onClose when the Close button is clicked', () => {
    const onClose = vi.fn()
    render(<ThreatsPanel threats={sampleThreats} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('does not show a close button when onClose is not provided', () => {
    render(<ThreatsPanel threats={sampleThreats} />)
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument()
  })

  it('shows the count of threats in the heading', () => {
    render(<ThreatsPanel threats={sampleThreats} onClose={noop} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})

describe('ThreatsPanel — analyzing state', () => {
  it('shows an analyzing message when isAnalyzing is true and threats are empty', () => {
    render(<ThreatsPanel threats={[]} isAnalyzing={true} />)
    expect(screen.getByText('Analyzing threats...')).toBeInTheDocument()
  })

  it('shows a progress bar when isAnalyzing is true', () => {
    render(<ThreatsPanel threats={[]} isAnalyzing={true} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows the streaming count when threats arrive during analysis', () => {
    render(<ThreatsPanel threats={sampleThreats} isAnalyzing={true} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('does not show "No threats found" while analyzing', () => {
    render(<ThreatsPanel threats={[]} isAnalyzing={true} />)
    expect(screen.queryByText(/no threats found/i)).not.toBeInTheDocument()
  })
})

describe('ThreatsPanel — mitigation column', () => {
  it('shows a Mitigation column header', () => {
    render(<ThreatsPanel threats={sampleThreats} onClose={noop} />)
    expect(screen.getByText('Mitigation')).toBeInTheDocument()
  })

  it('shows the mitigation text when a threat has one', () => {
    const withMitigation = [{ ...sampleThreats[0]!, mitigation: 'Use parameterised queries' }]
    render(<ThreatsPanel threats={withMitigation} onClose={noop} />)
    expect(screen.getByDisplayValue('Use parameterised queries')).toBeInTheDocument()
  })
})

describe('ThreatsPanel — editing', () => {
  it('allows editing the threat title inline', () => {
    const onThreatsChange = vi.fn()
    render(<ThreatsPanel threats={sampleThreats} onClose={noop} onThreatsChange={onThreatsChange} />)
    fireEvent.change(screen.getByDisplayValue('SQL Injection'), { target: { value: 'SQL Attack' } })
    expect(onThreatsChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 't1', title: 'SQL Attack' })])
    )
  })

  it('shows a delete button for each threat row', () => {
    render(<ThreatsPanel threats={sampleThreats} onClose={noop} />)
    expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(sampleThreats.length)
  })

  it('calls onThreatsChange without the deleted threat when delete is clicked', () => {
    const onThreatsChange = vi.fn()
    render(<ThreatsPanel threats={sampleThreats} onClose={noop} onThreatsChange={onThreatsChange} />)
    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0]!)
    expect(onThreatsChange).toHaveBeenCalledWith(
      expect.not.arrayContaining([expect.objectContaining({ id: 't1' })])
    )
  })

  it('shows an Add Threat button', () => {
    render(<ThreatsPanel threats={sampleThreats} onClose={noop} />)
    expect(screen.getByRole('button', { name: /new threat/i })).toBeInTheDocument()
  })

  it('shows the Add Threat button before any analysis (when threats is null)', () => {
    render(<ThreatsPanel threats={null} onClose={noop} />)
    expect(screen.getByRole('button', { name: /new threat/i })).toBeInTheDocument()
  })

  it('calls onThreatsChange with a single new threat when Add Threat is clicked from null', () => {
    const onThreatsChange = vi.fn()
    render(<ThreatsPanel threats={null} onClose={noop} onThreatsChange={onThreatsChange} />)
    fireEvent.click(screen.getByRole('button', { name: /new threat/i }))
    const [updated] = onThreatsChange.mock.calls[onThreatsChange.mock.calls.length - 1] as [typeof sampleThreats]
    expect(updated).toHaveLength(1)
    expect(updated[0]!.title).toBe('')
  })

  it('calls onThreatsChange with a new empty threat appended when Add Threat is clicked', () => {
    const onThreatsChange = vi.fn()
    render(<ThreatsPanel threats={sampleThreats} onClose={noop} onThreatsChange={onThreatsChange} />)
    fireEvent.click(screen.getByRole('button', { name: /new threat/i }))
    const [updated] = onThreatsChange.mock.calls[onThreatsChange.mock.calls.length - 1] as [typeof sampleThreats]
    expect(updated).toHaveLength(sampleThreats.length + 1)
    expect(updated[updated.length - 1]!.title).toBe('')
  })
})

describe('ThreatsPanel — affected picker', () => {
  const sampleGraph = {
    id: 'g1', name: 'X',
    zones: [{ id: 'z1', name: 'DMZ' }],
    components: [
      { id: 'c-api', name: 'API', type: 'process' as const, zoneId: 'z1' },
      { id: 'c-db', name: 'Database', type: 'datastore' as const, zoneId: 'z1' }
    ],
    flows: [
      { id: 'f1', name: 'API → DB', originatorId: 'c-api', targetId: 'c-db', direction: 'unidirectional' as const }
    ]
  }

  it('renders the Affected cell as a select when graph is provided', () => {
    render(<ThreatsPanel threats={sampleThreats} onClose={noop} graph={sampleGraph} />)
    const selects = screen.getAllByRole('combobox', { name: /affected/i })
    expect(selects.length).toBe(sampleThreats.length)
  })

  it('lists components and flows as options in the Affected select', () => {
    render(<ThreatsPanel threats={sampleThreats} onClose={noop} graph={sampleGraph} />)
    const select = screen.getAllByRole('combobox', { name: /affected/i })[0]!
    expect(select.querySelector('option[value="c-api"]')).toBeInTheDocument()
    expect(select.querySelector('option[value="c-db"]')).toBeInTheDocument()
    expect(select.querySelector('option[value="f1"]')).toBeInTheDocument()
  })

  it('includes an "(unassigned)" option for empty affectedId', () => {
    render(<ThreatsPanel threats={sampleThreats} onClose={noop} graph={sampleGraph} />)
    const select = screen.getAllByRole('combobox', { name: /affected/i })[0]!
    expect(select.querySelector('option[value=""]')).toBeInTheDocument()
  })

  it('calls onThreatsChange when the Affected select changes', () => {
    const onThreatsChange = vi.fn()
    render(<ThreatsPanel threats={sampleThreats} onClose={noop} graph={sampleGraph} onThreatsChange={onThreatsChange} />)
    const select = screen.getAllByRole('combobox', { name: /affected/i })[0]!
    fireEvent.change(select, { target: { value: 'f1' } })
    expect(onThreatsChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 't1', affectedId: 'f1' })])
    )
  })
})

describe('ThreatsPanel — selection', () => {
  it('calls onThreatSelected with the affectedId when a threat row is clicked', () => {
    const onThreatSelected = vi.fn()
    render(<ThreatsPanel threats={sampleThreats} onClose={noop} onThreatSelected={onThreatSelected} />)
    fireEvent.click(screen.getByText('c-db'))
    expect(onThreatSelected).toHaveBeenCalledWith('c-db')
  })

  it('highlights the threat matching selectedId', () => {
    render(<ThreatsPanel threats={sampleThreats} onClose={noop} selectedId="c-db" />)
    const row = screen.getByDisplayValue('SQL Injection').closest('tr')
    expect(row).toHaveAttribute('aria-selected', 'true')
  })

  it('does not mark other rows as selected when selectedId is set', () => {
    render(<ThreatsPanel threats={sampleThreats} onClose={noop} selectedId="c-db" />)
    const otherRow = screen.getByDisplayValue('Replay Attack').closest('tr')
    expect(otherRow).not.toHaveAttribute('aria-selected', 'true')
  })

  it('does not mark any row as selected when selectedId is undefined', () => {
    render(<ThreatsPanel threats={sampleThreats} onClose={noop} />)
    screen.getAllByRole('row').slice(1).forEach(row => {
      expect(row).not.toHaveAttribute('aria-selected', 'true')
    })
  })
})
