import { app, BrowserWindow, ipcMain, Menu, nativeTheme, type IpcMainInvokeEvent } from 'electron';
import { join } from 'node:path';
import * as config from '../config';
import { readSettings, writeSetting } from './settings';
import { testMailConnections } from './mail-service';

app.on('render-process-gone', (_event, _webContents, details) => {
   console.error('[main] Renderer process gone:', details);
});

process.on('uncaughtException', (error) => {
   console.error('[main] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
   console.error('[main] Unhandled rejection:', reason);
});

function getWindowFromEvent(event: IpcMainInvokeEvent) {
   const win = BrowserWindow.fromWebContents(event.sender);
   if (!win) {
      throw new Error('Window controls were called by an unknown renderer');
   }

   return win;
}

ipcMain.handle('window:minimize', (event) => {
   getWindowFromEvent(event).minimize();
});

ipcMain.handle('window:toggle-maximize', (event) => {
   const win = getWindowFromEvent(event);
   if (win.isMaximized()) {
      win.unmaximize();
   } else {
      win.maximize();
   }

   return win.isMaximized();
});

ipcMain.handle('window:is-maximized', (event) => getWindowFromEvent(event).isMaximized());

ipcMain.handle('window:close', (event) => {
   getWindowFromEvent(event).close();
});

ipcMain.handle('settings:get-all', (event) => {
   getWindowFromEvent(event);
   return readSettings();
});

ipcMain.handle('settings:set', (event, key: string, value: unknown) => {
   getWindowFromEvent(event);
   return writeSetting(key, value);
});

ipcMain.handle('mail:test-connections', async (event) => {
   getWindowFromEvent(event);
   return await testMailConnections();
})

function createWindow() {
   const iconPath = app.isPackaged
      ? join(process.resourcesPath, 'desktop_assets', 'icon.ico')
      : join(__dirname, '../../src/main/desktop_assets/icon.ico');

   const win = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      backgroundColor: nativeTheme.shouldUseDarkColors ? '#000000' : '#ffffff',
      frame: false,
      title: config.APP_WINDOW_NAME,
      icon: iconPath,
      show: true,
      webPreferences: {
         preload: join(__dirname, '../preload/index.cjs'),
         contextIsolation: true,
         nodeIntegration: false,
      },
   });

   win.webContents.on('did-fail-load', (_event, code, description, url) => {
      console.error('[main] Failed to load:', { code, description, url });
   });

   win.on('ready-to-show', () => {
      win.show();
   });

   win.on('maximize', () => {
      win.webContents.send('window:maximize-change', true);
   });
   win.on('unmaximize', () => {
      win.webContents.send('window:maximize-change', false);
   });

   Menu.setApplicationMenu(null);

   const rendererUrl = process.env.ELECTRON_RENDERER_URL;

   if (rendererUrl) {
      void win.loadURL(rendererUrl).catch((error) => {
         console.error('[main] loadURL failed:', error);
      });
   } else {
      const htmlPath = join(__dirname, '../renderer/index.html');
      void win.loadFile(htmlPath).catch((error) => {
         console.error('[main] loadFile failed:', error);
      });
   }
}

app.whenReady()
   .then(() => {
      createWindow();

      app.on('activate', () => {
         if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
         }
      });

      nativeTheme.on('updated', () => {
         const backgroundColor = nativeTheme.shouldUseDarkColors ? '#000000' : '#ffffff';
         for (const win of BrowserWindow.getAllWindows()) {
            win.setBackgroundColor(backgroundColor);
         }
      });
   })
   .catch((error) => {
      console.error('[main] App initialization failed:', error);
   });

app.on('window-all-closed', () => {
   if (process.platform !== 'darwin') {
      app.quit();
   }
});
