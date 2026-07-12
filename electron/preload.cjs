const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  createBrowser: (config) => ipcRenderer.invoke('browser:create', config),
  startBrowser: (id) => ipcRenderer.invoke('browser:start', id),
  stopBrowser: (id) => ipcRenderer.invoke('browser:stop', id),
  removeBrowser: (id) => ipcRenderer.invoke('browser:remove', id),
  stopAllBrowsers: () => ipcRenderer.invoke('browser:stop-all'),
  getBrowsersStatus: () => ipcRenderer.invoke('browser:get-all-status'),
  getConfig: () => ipcRenderer.invoke('config:get'),
  updateConfig: (updates) => ipcRenderer.invoke('config:update', updates),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
})
