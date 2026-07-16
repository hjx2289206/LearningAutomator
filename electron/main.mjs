import { app, BrowserWindow, ipcMain, safeStorage } from 'electron'
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true"
import path from 'path'
import { fileURLToPath } from 'url'
import { BrowserManager } from './automation/browser-manager.js'
import { CredentialStore } from './storage/credential-store.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow = null
let manager = null
let credentialStore = null
const isPackaged = app.isPackaged

function getManager() {
  if (!manager) throw new Error('应用数据尚未初始化')
  return manager
}

function getCredentialStore() {
  if (!credentialStore) throw new Error('登录档案尚未初始化')
  return credentialStore
}

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
  const dataDir = app.getPath('userData')
  credentialStore = new CredentialStore({ dataDir, encryption: safeStorage })
  manager = new BrowserManager({
    dataDir,
    legacyDataDir: path.join(__dirname, '..'),
    onIdentityChange: (browserId, realName) => {
      credentialStore.updateNameForBrowser(browserId, realName)
    },
  })
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  manager?.stopAll()
  if (process.platform !== 'darwin') app.quit()
})

// IPC: 浏览器实例
ipcMain.handle('browser:create', (_e, config) => {
  const id = getManager().createBrowser(config)
  return { success: true, browser_id: id }
})
ipcMain.handle('browser:start', async (_e, id) => {
  const currentManager = getManager()
  const ok = await currentManager.startBrowser(id)
  if (!ok) return { success: false }

  const login = await currentManager.getLoginInfo(id)
  focusMainWindowOnce()
  return { success: true, login }
})
ipcMain.handle('browser:get-login-info', async (_e, id) => {
  const login = await getManager().getLoginInfo(id)
  return { success: Boolean(login), login }
})
ipcMain.handle('browser:refresh-login-captcha', async (_e, id) => {
  const captchaImage = await getManager().refreshLoginCaptcha(id)
  return { success: Boolean(captchaImage), captcha_image: captchaImage }
})
ipcMain.handle('browser:login', async (_e, id, credentials) => {
  const currentManager = getManager()
  const result = await currentManager.submitLogin(id, credentials)
  if (!result?.success) return result

  try {
    const status = currentManager.getBrowserStatus(id)
    getCredentialStore().save({
      account: credentials?.account,
      password: credentials?.password,
      browserId: id,
      name: status?.real_name,
    })
    return { ...result, credentials_saved: true }
  } catch (error) {
    console.error('保存登录档案失败', error)
    return { ...result, credentials_saved: false, credentials_warning: error.message }
  }
})
ipcMain.handle('browser:stop', async (_e, id) => {
  await getManager().stopBrowser(id)
  return { success: true }
})
ipcMain.handle('browser:remove', async (_e, id) => {
  getManager().removeBrowser(id)
  return { success: true }
})
ipcMain.handle('browser:stop-all', async () => {
  await getManager().stopAll()
  return { success: true }
})
ipcMain.handle('browser:rename', (_e, id, name) => {
  const ok = getManager().renameBrowser(id, name)
  return { success: ok }
})
ipcMain.handle('browser:get-all-status', () => {
  const list = getManager().getAllStatus()
  return { success: true, browsers: list }
})

// IPC: 加密登录档案
ipcMain.handle('credentials:list', (_e, browserId) => {
  return { success: true, profiles: getCredentialStore().list(browserId) }
})
ipcMain.handle('credentials:get', (_e, account) => {
  return { success: true, credential: getCredentialStore().get(account) }
})
ipcMain.handle('credentials:remove', (_e, account) => {
  return { success: getCredentialStore().remove(account) }
})

// IPC: 配置
ipcMain.handle('config:get', () => {
  return { success: true, config: getManager().getConfig() }
})
ipcMain.handle('config:update', (_e, updates) => {
  const currentManager = getManager()
  currentManager.updateConfig(updates)
  return { success: true, config: currentManager.getConfig() }
})

// IPC: 窗口
ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize()
})
ipcMain.on('window-close', () => mainWindow?.close())
