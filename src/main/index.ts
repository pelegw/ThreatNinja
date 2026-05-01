import { app, BrowserWindow, ipcMain, dialog, Menu, safeStorage, shell } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync } from 'fs'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    titleBarStyle: 'hidden',
    icon: join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js')
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle('save-graph', async (_event, payload: string, filePath?: string) => {
  if (typeof filePath === 'string' && filePath.length > 0) {
    writeFileSync(filePath, payload, 'utf-8')
    return { cancelled: false, filePath }
  }
  const result = await dialog.showSaveDialog({
    title: 'Save Diagram',
    defaultPath: 'diagram.tninja',
    filters: [{ name: 'ThreatNinja Diagram', extensions: ['tninja'] }]
  })
  if (result.filePath === undefined) return { cancelled: true }
  writeFileSync(result.filePath, payload, 'utf-8')
  return { cancelled: false, filePath: result.filePath }
})

ipcMain.handle('load-graph', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: 'Open Diagram',
    filters: [{ name: 'ThreatNinja Diagram', extensions: ['tninja'] }],
    properties: ['openFile']
  })
  if (canceled || filePaths.length === 0) return { cancelled: true }
  const content = readFileSync(filePaths[0]!, 'utf-8')
  return { cancelled: false, content, filePath: filePaths[0] }
})

ipcMain.handle('llm-complete', async (_event, { url, headers, body }: { url: string; headers: Record<string, string>; body: string }) => {
  const response = await fetch(url, { method: 'POST', headers, body })
  const data = await response.json()
  return { ok: response.ok, status: response.status, data }
})

ipcMain.handle('llm-stream', async (event, { url, headers, body }: { url: string; headers: Record<string, string>; body: string }) => {
  const response = await fetch(url, { method: 'POST', headers, body })
  if (!response.ok) return { ok: false, status: response.status }
  if (response.body === null) return { ok: true, status: response.status }

  const reader = (response.body as unknown as ReadableStream<Uint8Array>).getReader()
  const decoder = new TextDecoder()

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (!event.sender.isDestroyed()) {
        event.sender.send('llm-stream-chunk', decoder.decode(value, { stream: true }))
      }
    }
  } finally {
    reader.releaseLock()
  }

  return { ok: true, status: response.status }
})

ipcMain.handle('save-settings', async (_event, json: string) => {
  const settingsPath = join(app.getPath('userData'), 'settings.json')
  const settings = JSON.parse(json) as Record<string, unknown>
  if (typeof settings['apiKey'] === 'string' && safeStorage.isEncryptionAvailable()) {
    settings['encryptedApiKey'] = safeStorage.encryptString(settings['apiKey']).toString('base64')
    delete settings['apiKey']
  }
  writeFileSync(settingsPath, JSON.stringify(settings), 'utf-8')
})

ipcMain.handle('load-settings', async () => {
  const settingsPath = join(app.getPath('userData'), 'settings.json')
  try {
    const raw = readFileSync(settingsPath, 'utf-8')
    const settings = JSON.parse(raw) as Record<string, unknown>
    if (typeof settings['encryptedApiKey'] === 'string' && safeStorage.isEncryptionAvailable()) {
      settings['apiKey'] = safeStorage.decryptString(Buffer.from(settings['encryptedApiKey'], 'base64'))
      delete settings['encryptedApiKey']
    }
    return JSON.stringify(settings)
  } catch {
    return null
  }
})

ipcMain.handle('open-external', async (_event, url: string) => {
  if (typeof url !== 'string') return { ok: false, error: 'invalid url' }
  if (!url.startsWith('https://attack.mitre.org/')) return { ok: false, error: 'url not allowlisted' }
  await shell.openExternal(url)
  return { ok: true }
})

ipcMain.on('window-minimize', () => { BrowserWindow.getFocusedWindow()?.minimize() })
ipcMain.on('window-maximize', () => {
  const win = BrowserWindow.getFocusedWindow()
  if (win === null) return
  win.isMaximized() ? win.unmaximize() : win.maximize()
})
ipcMain.on('window-close', () => { BrowserWindow.getFocusedWindow()?.close() })

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
