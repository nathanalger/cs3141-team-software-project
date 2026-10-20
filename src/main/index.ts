import { app, BrowserWindow, Menu } from 'electron'
import { join } from 'node:path'
import * as config from '../config'

function createWindow() {
   const iconPath = app.isPackaged
      ? join(process.resourcesPath, 'desktop_assets', 'icon.ico')
      : join(__dirname, '../../src/main/desktop_assets/icon.ico')

   const win = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      title: config.APP_WINDOW_NAME,
      icon: iconPath,
      webPreferences: {
         preload: join(__dirname, '../preload/index.cjs'),
         contextIsolation: true,
         nodeIntegration: false,
      },
   })

   Menu.setApplicationMenu(null)

   if (process.env.ELECTRON_RENDERER_URL) {
      void win.loadURL(process.env.ELECTRON_RENDERER_URL)
   } else {
      void win.loadFile(join(__dirname, '../renderer/index.html'))
   }
}

app.whenReady().then(() => {
   createWindow()

   app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
         createWindow()
      }
   })
})

app.on('window-all-closed', () => {
   if (process.platform !== 'darwin') {
      app.quit()
   }
})
