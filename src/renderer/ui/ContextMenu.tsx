import { useEffect } from 'react'

type Item = { label: string; onClick: () => void }

type Props = {
  items: Item[]
  position: { x: number; y: number }
  onDismiss: () => void
}

export default function ContextMenu({ items, position, onDismiss }: Props): JSX.Element {
  useEffect(() => {
    const handler = () => onDismiss()
    document.body.addEventListener('mousedown', handler)
    return () => document.body.removeEventListener('mousedown', handler)
  }, [onDismiss])

  return (
    <div style={{ ...menuStyle, left: position.x, top: position.y }}>
      {items.map(item => (
        <button
          key={item.label}
          style={itemStyle}
          onClick={() => { item.onClick(); onDismiss() }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

const menuStyle: React.CSSProperties = {
  position: 'fixed', background: '#1a1a2e', border: '1px solid #4a4a7e',
  borderRadius: '4px', padding: '4px 0', zIndex: 300, minWidth: '160px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
}

const itemStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '7px 14px', background: 'none',
  border: 'none', color: '#e0e0ff', fontSize: '13px', textAlign: 'left',
  cursor: 'pointer'
}
