import { contextBridge, ipcRenderer } from 'electron'
import type { SettingValue, SettingsValues } from '../types/settings'

contextBridge.exposeInMainWorld('desktop', {
   platform: process.platform,
   minimize: () => ipcRenderer.invoke('window:minimize'),
   toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
   close: () => ipcRenderer.invoke('window:close'),
   isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
   getSettings: (): Promise<SettingsValues> => ipcRenderer.invoke('settings:get-all'),
   setSetting: (key: string, value: SettingValue): Promise<SettingsValues> =>
      ipcRenderer.invoke('settings:set', key, value),
   onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, isMaximized: boolean) => callback(isMaximized)
      ipcRenderer.on('window:maximize-change', listener)

      return () => ipcRenderer.removeListener('window:maximize-change', listener)
   },
})
