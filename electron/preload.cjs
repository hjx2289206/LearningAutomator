const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  createBrowser: (config) => ipcRenderer.invoke('browser:create', config),
  startBrowser: (id) => ipcRenderer.invoke('browser:start', id),
  getLoginInfo: (id) => ipcRenderer.invoke('browser:get-login-info', id),
  refreshLoginCaptcha: (id) => ipcRenderer.invoke('browser:refresh-login-captcha', id),
  loginBrowser: (id, credentials) => ipcRenderer.invoke('browser:login', id, credentials),
  stopBrowser: (id) => ipcRenderer.invoke('browser:stop', id),
  removeBrowser: (id) => ipcRenderer.invoke('browser:remove', id),
  stopAllBrowsers: () => ipcRenderer.invoke('browser:stop-all'),
  renameBrowser: (id, name) => ipcRenderer.invoke("browser:rename", id, name),
  getBrowsersStatus: () => ipcRenderer.invoke('browser:get-all-status'),
  getConfig: () => ipcRenderer.invoke('config:get'),
  updateConfig: (updates) => ipcRenderer.invoke('config:update', updates),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
})
