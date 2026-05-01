import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  saveGraph: (payload: string, filePath?: string) => ipcRenderer.invoke('save-graph', payload, filePath),
  loadGraph: () => ipcRenderer.invoke('load-graph'),
  saveSettings: (json: string) => ipcRenderer.invoke('save-settings', json),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  llmComplete: (params: { url: string; headers: Record<string, string>; body: string }) =>
    ipcRenderer.invoke('llm-complete', params),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  openExternal: (url: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('open-external', url),
  llmStream: (
    params: { url: string; headers: Record<string, string>; body: string },
    onChunk: (chunk: string) => void
  ): Promise<{ ok: boolean; status: number }> => {
    const handler = (_event: Electron.IpcRendererEvent, chunk: string): void => { onChunk(chunk) }
    ipcRenderer.on('llm-stream-chunk', handler)
    return ipcRenderer.invoke('llm-stream', params).then((result: { ok: boolean; status: number }) => {
      ipcRenderer.removeListener('llm-stream-chunk', handler)
      return result
    })
  }
})
