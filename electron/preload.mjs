import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getBackendPort: () => ipcRenderer.invoke('get-backend-port'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  onWindowStateChange: (callback) => {
    ipcRenderer.on('window-state-changed', callback)
    return () => ipcRenderer.removeListener('window-state-changed', callback)
  },
})
