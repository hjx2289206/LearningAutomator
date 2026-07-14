import { app, BrowserWindow, ipcMain } from 'electron'
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true"
import path from 'path'
import { fileURLToPath } from 'url'
import { BrowserManager } from './automation/browser-manager.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow = null
const isPackaged = app.isPackaged

const manager = new BrowserManager()

function focusMainWindowOnce() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.setAlwaysOnTop(true, 'floating')
  if (process.platform === 'darwin') app.focus({ steal: true })
  mainWindow.focus()
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setAlwaysOnTop(false)
  }, 700)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  mainWindow.on('maximize', () => mainWindow.webContents.send('window-state-changed', 'maximized'))
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window-state-changed', 'restored'))

  if (isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  } else {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  manager.stopAll()
  if (process.platform !== 'darwin') app.quit()
})

// IPC: 浏览器实例
ipcMain.handle('browser:create', (_e, config) => {
  const id = manager.createBrowser(config)
  return { success: true, browser_id: id }
})
ipcMain.handle('browser:start', async (_e, id) => {
  const ok = await manager.startBrowser(id)
  if (!ok) return { success: false }

  const login = await manager.getLoginInfo(id)
  focusMainWindowOnce()
  return { success: true, login }
})
ipcMain.handle('browser:get-login-info', async (_e, id) => {
  const login = await manager.getLoginInfo(id)
  return { success: Boolean(login), login }
})
ipcMain.handle('browser:refresh-login-captcha', async (_e, id) => {
  const captchaImage = await manager.refreshLoginCaptcha(id)
  return { success: Boolean(captchaImage), captcha_image: captchaImage }
})
ipcMain.handle('browser:login', async (_e, id, credentials) => {
  return await manager.submitLogin(id, credentials)
})
ipcMain.handle('browser:stop', async (_e, id) => {
  await manager.stopBrowser(id)
  return { success: true }
})
ipcMain.handle('browser:remove', async (_e, id) => {
  manager.removeBrowser(id)
  return { success: true }
})
ipcMain.handle('browser:stop-all', async () => {
  await manager.stopAll()
  return { success: true }
})
ipcMain.handle('browser:rename', (_e, id, name) => {
  const ok = manager.renameBrowser(id, name)
  return { success: ok }
})
ipcMain.handle('browser:get-all-status', () => {
  const list = manager.getAllStatus()
  return { success: true, browsers: list }
})

// IPC: 配置
ipcMain.handle('config:get', () => {
  return { success: true, config: manager.getConfig() }
})
ipcMain.handle('config:update', (_e, updates) => {
  manager.updateConfig(updates)
  return { success: true, config: manager.getConfig() }
})

// IPC: 窗口
ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize()
})
ipcMain.on('window-close', () => mainWindow?.close())
