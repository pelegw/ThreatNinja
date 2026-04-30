import { app, BrowserWindow, ipcMain, dialog, Menu, safeStorage } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync } from 'fs'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle('save-graph', async (_event, payload: string) => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Save Diagram',
    defaultPath: 'diagram.tninja',
    filters: [{ name: 'ThreatNinja Diagram', extensions: ['tninja'] }]
  })
  if (filePath === undefined) return { cancelled: true }
  writeFileSync(filePath, payload, 'utf-8')
  return { cancelled: false, filePath }
})

ipcMain.handle('load-graph', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: 'Open Diagram',
    filters: [{ name: 'ThreatNinja Diagram', extensions: ['tninja'] }],
    properties: ['openFile']
  })
  if (canceled || filePaths.length === 0) return { cancelled: true }
  const content = readFileSync(filePaths[0]!, 'utf-8')
  return { cancelled: false, content }
})

ipcMain.handle('llm-complete', async (_event, { url, headers, body }: { url: string; headers: Record<string, string>; body: string }) => {
  const response = await fetch(url, { method: 'POST', headers, body })
  const data = await response.json()
  return { ok: response.ok, status: response.status, data }
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
