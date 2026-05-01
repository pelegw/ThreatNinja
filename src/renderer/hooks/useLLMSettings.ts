import { useState, useCallback, useEffect } from 'react'
import { LLMProvider, LLMSettingsSchema } from '../llm/llm'
import type { LLMSettings } from '../llm/llm'

const defaultSettings: LLMSettings = { provider: LLMProvider.Anthropic }

export const useLLMSettings = () => {
  const [settings, setSettings] = useState<LLMSettings>(defaultSettings)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    window.electronAPI.loadSettings().then(json => {
      if (json === null) return
      try {
        setSettings(LLMSettingsSchema.parse(JSON.parse(json)))
      } catch { /* ignore corrupt settings */ }
    })
  }, [])

  const save = useCallback(async (updated: LLMSettings) => {
    setSettings(updated)
    setShowSettings(false)
    await window.electronAPI.saveSettings(JSON.stringify(updated))
  }, [])

  const openSettings = useCallback(() => setShowSettings(true), [])
  const closeSettings = useCallback(() => setShowSettings(false), [])

  return { settings, showSettings, save, openSettings, closeSettings }
}
