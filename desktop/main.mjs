import { app, BrowserWindow, dialog, shell } from 'electron';
import { dirname, resolve } from 'node:path';
import { createApp } from '../server/index.mjs';
import { readDesktopConfig } from './config.mjs';

let server;
let mainWindow;
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow?.isMinimized()) mainWindow.restore();
    mainWindow?.focus();
  });
  app.whenReady().then(async () => {
    const directory = app.isPackaged
      ? process.env.PORTABLE_EXECUTABLE_DIR || dirname(process.execPath)
      : resolve(import.meta.dirname, '..');
    server = createApp({
      config: readDesktopConfig(directory),
      staticDir: resolve(import.meta.dirname, '../dist'),
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(18787, '127.0.0.1', resolve);
    });
    const origin = 'http://127.0.0.1:18787';
    mainWindow = new BrowserWindow({
      width: 1440, height: 960, minWidth: 960, minHeight: 680,
      title: 'MuseIntelligent · 博物馆智能导览',
      icon: resolve(import.meta.dirname, 'icon.png'),
      backgroundColor: '#eeeee7', show: false, autoHideMenuBar: true,
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
    });
    const openExternal = url => {
      if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    };
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      openExternal(url);
      return { action: 'deny' };
    });
    mainWindow.webContents.on('will-navigate', (event, url) => {
      if (new URL(url).origin !== origin) { event.preventDefault(); openExternal(url); }
    });
    mainWindow.once('ready-to-show', () => mainWindow.show());
    await mainWindow.loadURL(origin);
  }).catch(error => {
    dialog.showErrorBox('MuseIntelligent 启动失败', error.code === 'EADDRINUSE'
      ? '本地端口 18787 已被占用，请关闭占用该端口的程序后重试。'
      : error.message);
    app.quit();
  });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => server?.close());
}
