import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';

let win: BrowserWindow | null = null;

const isDev = process.env.VITE_DEV_SERVER_URL != null;
const API_BASE_FALLBACK = process.env.API_BASE_URL || 'http://127.0.0.1:4000';

async function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    const url = process.env.VITE_DEV_SERVER_URL as string;
    await win.loadURL(url);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    await win.loadFile(path.join(__dirname, '../index.html'));
  }
}

app.whenReady().then(() => {
  // Simple config endpoint for renderer
  ipcMain.handle('ayher:get-api-base', async () => API_BASE_FALLBACK);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

