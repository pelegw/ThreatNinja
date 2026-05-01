import { useEffect, useRef } from 'react'
import { useTheme } from './tokens'

type Item = { label: string; onClick: () => void }

type Props = {
  items: Item[]
  position: { x: number; y: number }
  onDismiss: () => void
}

export default function ContextMenu({ items, position, onDismiss }: Props): JSX.Element {
  const t = useTheme()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node) === true) return
      onDismiss()
    }
    document.body.addEventListener('mousedown', handler)
    return () => document.body.removeEventListener('mousedown', handler)
  }, [onDismiss])

  return (
    <div ref={menuRef} style={{
      position: 'fixed', background: t.bgAlt, border: `1px solid ${t.border}`,
      borderRadius: 6, padding: '4px 0', zIndex: 300, minWidth: 160,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      left: position.x, top: position.y,
    }}>
      {items.map(item => (
        <button
          key={item.label}
          style={{
            display: 'block', width: '100%', padding: '7px 14px', background: 'none',
            border: 'none', color: t.text, fontSize: 13, textAlign: 'left',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
          onClick={() => { item.onClick(); onDismiss() }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
