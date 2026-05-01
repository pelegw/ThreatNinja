import { createContext, useContext } from 'react'

export type Theme = {
  bg: string
  bgAlt: string
  bgPanel: string
  bgInset: string
  border: string
  borderStrong: string
  text: string
  textMuted: string
  textDim: string
  accent: string
  accentDim: string
  accentBg: string
  gridColor: string
  boundaryStroke: string
  boundaryLabel: string
  nodeFill: string
  nodeStroke: string
  nodeText: string
  iconColor: string
  chipBg: string
  edgeTrusted: string
  edgeCrossing: string
  edgeUntrusted: string
  warning: string
  sevCritical: string
  sevHigh: string
  sevMed: string
  sevLow: string
}

export const lightTheme: Theme = {
  bg: '#fbfbfa',
  bgAlt: '#ffffff',
  bgPanel: '#ffffff',
  bgInset: '#f6f6f4',
  border: '#e8e8e4',
  borderStrong: '#d8d8d2',
  text: '#1a1a17',
  textMuted: '#5e5e57',
  textDim: '#9a9a92',
  accent: '#0891b2',
  accentDim: '#0e7490',
  accentBg: 'rgba(8,145,178,0.08)',
  gridColor: 'rgba(0,0,0,0.05)',
  boundaryStroke: 'rgba(80,80,72,0.7)',
  boundaryLabel: 'rgba(80,80,72,0.85)',
  nodeFill: '#ffffff',
  nodeStroke: '#1a1a17',
  nodeText: '#1a1a17',
  iconColor: '#5e5e57',
  chipBg: '#ffffff',
  edgeTrusted: '#15803d',
  edgeCrossing: '#c2410c',
  edgeUntrusted: '#b91c1c',
  warning: '#b91c1c',
  sevCritical: '#9f1239',
  sevHigh: '#dc2626',
  sevMed: '#d97706',
  sevLow: '#2563eb',
}

export const darkTheme: Theme = {
  bg: '#0e0f12',
  bgAlt: '#15171c',
  bgPanel: '#15171c',
  bgInset: '#1c1f25',
  border: '#262932',
  borderStrong: '#363a45',
  text: '#e8eaed',
  textMuted: '#9aa0ab',
  textDim: '#5d626d',
  accent: '#06b6d4',
  accentDim: '#0891b2',
  accentBg: 'rgba(6,182,212,0.12)',
  gridColor: 'rgba(255,255,255,0.05)',
  boundaryStroke: 'rgba(170,185,210,0.5)',
  boundaryLabel: 'rgba(200,210,225,0.8)',
  nodeFill: '#15171c',
  nodeStroke: '#cfd3da',
  nodeText: '#e8eaed',
  iconColor: '#9aa0ab',
  chipBg: '#15171c',
  edgeTrusted: '#34d399',
  edgeCrossing: '#fbbf24',
  edgeUntrusted: '#f87171',
  warning: '#f87171',
  sevCritical: '#fb7185',
  sevHigh: '#f87171',
  sevMed: '#fbbf24',
  sevLow: '#60a5fa',
}

export const fonts = {
  sans: '"Inter", ui-sans-serif, -apple-system, system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
}

export const ThemeContext = createContext<Theme>(lightTheme)
export const useTheme = (): Theme => useContext(ThemeContext)

export const colors = lightTheme

export const overlayStyle = (t: Theme): React.CSSProperties => ({
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
})

export const primaryBtnStyle = (t: Theme): React.CSSProperties => ({
  padding: '6px 16px', background: t.accent, color: '#fff',
  border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit'
})

export const disabledPrimaryBtnStyle = (t: Theme): React.CSSProperties => ({
  ...primaryBtnStyle(t), background: t.bgInset, color: t.textDim, cursor: 'not-allowed'
})

export const secondaryBtnStyle = (t: Theme): React.CSSProperties => ({
  padding: '6px 16px', background: t.bgInset, color: t.text,
  border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit'
})

export const inputStyle = (t: Theme): React.CSSProperties => ({
  padding: '6px 8px', background: t.bgInset, color: t.text,
  border: `1px solid ${t.border}`, borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit'
})

export const closeBtnStyle = (t: Theme): React.CSSProperties => ({
  background: 'none', border: 'none', color: t.textDim, cursor: 'pointer', fontSize: '16px', padding: '0 4px'
})

export const panelHeaderStyle = (t: Theme): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '16px 20px 14px', borderBottom: `1px solid ${t.border}`, flexShrink: 0
})

export const sectionTitleStyle = (t: Theme): React.CSSProperties => ({
  fontSize: '14px', fontWeight: 600, color: t.text, letterSpacing: '-0.2px'
})
