import { app, BrowserWindow, Menu } from 'electron'
import { join } from 'node:path'
import * as config from '../config'
import { init as initDb } from './db'
import { init as initMailStore } from './email-filesystem'

app.on('render-process-gone', (_event, _webContents, details) => {
   console.error('[main] Renderer process gone:', details)
})

process.on('uncaughtException', (error) => {
   console.error('[main] Uncaught exception:', error)
})

process.on('unhandledRejection', (reason) => {
   console.error('[main] Unhandled rejection:', reason)
})

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
      show: true,
      webPreferences: {
         preload: join(__dirname, '../preload/index.cjs'),
         contextIsolation: true,
         nodeIntegration: false,
      },
   })

   win.webContents.on('did-fail-load', (_event, code, description, url) => {
      console.error('[main] Failed to load:', { code, description, url })
   })

   win.on('ready-to-show', () => {
      win.show()
   })

   Menu.setApplicationMenu(null)

   const rendererUrl = process.env.ELECTRON_RENDERER_URL

   if (rendererUrl) {
      void win.loadURL(rendererUrl).catch((error) => {
         console.error('[main] loadURL failed:', error)
      })
   } else {
      const htmlPath = join(__dirname, '../renderer/index.html')
      void win.loadFile(htmlPath).catch((error) => {
         console.error('[main] loadFile failed:', error)
      })
   }
}

app.whenReady()
   .then(() => {
      initDb()
      initMailStore()
      createWindow()

      app.on('activate', () => {
         if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
         }
      })
   })
   .catch((error) => {
      console.error('[main] App initialization failed:', error)
   })

app.on('window-all-closed', () => {
   if (process.platform !== 'darwin') {
      app.quit()
   }
})
