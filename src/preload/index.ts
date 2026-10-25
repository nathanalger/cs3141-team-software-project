import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('desktop', {
   platform: process.platform,
   minimize: () => ipcRenderer.invoke('window:minimize'),
   toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
   close: () => ipcRenderer.invoke('window:close'),
   isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
   testMailConnections: () => ipcRenderer.invoke('mail:test-connections'),
   onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, isMaximized: boolean) => callback(isMaximized)
      ipcRenderer.on('window:maximize-change', listener)
      return () => ipcRenderer.removeListener('window:maximize-change', listener)
   },
})
