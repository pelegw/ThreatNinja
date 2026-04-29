import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  saveGraph: (payload: string) => ipcRenderer.invoke('save-graph', payload),
  loadGraph: () => ipcRenderer.invoke('load-graph'),
  saveSettings: (json: string) => ipcRenderer.invoke('save-settings', json),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  llmComplete: (params: { url: string; headers: Record<string, string>; body: string }) =>
    ipcRenderer.invoke('llm-complete', params)
})
