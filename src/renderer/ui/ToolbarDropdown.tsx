import { useState, useEffect, useRef } from 'react'
import { useTheme, fonts } from './tokens'
import type { Theme } from './tokens'

export type DropdownItem = {
  label: string
  onClick: () => void
  disabled?: boolean
  shortcut?: string
}

type Props = {
  label: string
  items: DropdownItem[]
  style?: React.CSSProperties
  'aria-label'?: string
}

export default function ToolbarDropdown({ label, items, style, 'aria-label': ariaLabel }: Props): JSX.Element {
  const t = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(prev => !prev)}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        style={{ ...triggerStyle(t), ...style }}
      >
        {label}
        <svg width="9" height="9" viewBox="0 0 9 9" style={{ opacity: 0.6 }}>
          <path d="M1.5 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div role="menu" style={menuStyle(t)}>
          {items.map(item => (
            <button
              key={item.label}
              role="menuitem"
              aria-label={item.label}
              disabled={item.disabled}
              onClick={() => { if (!item.disabled) { item.onClick(); setOpen(false) } }}
              style={item.disabled ? disabledItemStyle(t) : itemStyle(t)}
            >
              <span>{item.label}</span>
              {item.shortcut !== undefined && (
                <span style={{ fontSize: 11, color: t.textDim, marginLeft: 16 }}>{item.shortcut}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const triggerStyle = (t: Theme): React.CSSProperties => ({
  height: 30, padding: '0 11px',
  background: 'transparent', border: '1px solid transparent',
  color: t.text, borderRadius: 6, cursor: 'pointer',
  fontFamily: fonts.sans, fontSize: 13, fontWeight: 450,
  display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', flexShrink: 0,
})

const menuStyle = (t: Theme): React.CSSProperties => ({
  position: 'absolute', top: '100%', left: 0, marginTop: 4,
  background: t.bgAlt, border: `1px solid ${t.border}`,
  borderRadius: 8, padding: '4px 0', zIndex: 300, minWidth: 180,
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
})

const itemStyle = (t: Theme): React.CSSProperties => ({
  display: 'flex', width: '100%', padding: '7px 14px', background: 'none',
  border: 'none', color: t.text, fontSize: 13, textAlign: 'left',
  cursor: 'pointer', fontFamily: 'inherit', alignItems: 'center',
  justifyContent: 'space-between',
})

const disabledItemStyle = (t: Theme): React.CSSProperties => ({
  ...itemStyle(t), color: t.textDim, cursor: 'not-allowed',
})
