import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { spawn, ChildProcess } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';

let win: BrowserWindow | null = null;
let backendProc: ChildProcess | null = null;
let apiBase = process.env.API_BASE_URL || 'http://127.0.0.1:4000';

const isDev = !!process.env.VITE_DEV_SERVER_URL;

function waitForHealth(url: string, timeoutMs = 20000): Promise<void> {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(`${url}/health`, (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          res.resume();
          resolve();
        } else {
          res.resume();
          setTimeout(next, 500);
        }
      });
      req.on('error', () => setTimeout(next, 500));
      req.setTimeout(2000, () => {
        req.destroy();
        setTimeout(next, 500);
      });
    };
    const next = () => {
      if (Date.now() - started > timeoutMs) {
        reject(new Error('Backend did not become healthy in time'));
        return;
      }
      tick();
    };
    tick();
  });
}

function getSharedDBPath(): string {
  if (process.platform === 'win32') {
    const pub = process.env.PUBLIC || 'C:\\Users\\Public';
    const dir = path.join(pub, 'Desktop', 'AYHERDB');
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
    return path.join(dir, 'AYHERDB.db');
  }
  // Fallback for non-Windows: use a shared-like location
  const dir = path.join('/', 'Users', 'Shared', 'AYHERDB');
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  return path.join(dir, 'AYHERDB.db');
}

async function startBackend() {
  // Backend folder relative to frontend root (process.cwd is frontend root in dev)
  const backendCwd = path.resolve(process.cwd(), '../backend-ts-sqlite-jwt');
  // Shared DB on Desktop for all users (Windows: C:\\Users\\Public\\Desktop\\AYHERDB\\AYHERDB.db)
  const dbPath = getSharedDBPath();

  // Ensure DB exists: copy from packaged template if available
  try {
    if (!fs.existsSync(dbPath)) {
      const templateDb = isDev
        ? path.join(backendCwd, 'dist', 'ayher.db')
        : path.join(process.resourcesPath, 'backend', 'ayher.db');
      if (fs.existsSync(templateDb)) {
        fs.copyFileSync(templateDb, dbPath);
      } else {
        fs.writeFileSync(dbPath, '');
      }
    }
  } catch (e) {
    console.warn('[electron] could not prepare DB file:', (e as any)?.message);
  }

  if (isDev) {
    // Dev: spawn `npm run dev` (ts-node-dev)
    backendProc = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev'], {
      cwd: backendCwd,
      env: { ...process.env, PORT: '4000', DATABASE_URL: `file:${dbPath}` },
      stdio: 'inherit',
      shell: false,
    });
    apiBase = 'http://127.0.0.1:4000';
  } else {
    // Prod: start built server.js shipped in extraResources/backend
    const backendEntry = path.join(process.resourcesPath, 'backend', 'src', 'server.js');
    backendProc = spawn(process.execPath, [backendEntry], {
      cwd: process.resourcesPath,
      env: { ...process.env, PORT: '4000', NODE_ENV: 'production', DATABASE_URL: `file:${dbPath}` },
      stdio: 'ignore',
      detached: true,
    });
    apiBase = 'http://127.0.0.1:4000';
  }

  backendProc.on('exit', (code) => {
    console.log('[electron] backend exited with code', code);
  });

  await waitForHealth(apiBase).catch((e) => {
    console.warn('[electron] backend health check failed:', e.message);
  });
}

async function createWindow() {
  // compute preload and index paths that work both in dev and packaged app
  const preloadPath = isDev
    ? path.join(__dirname, 'preload.js')
    : path.join(process.resourcesPath, 'dist-electron', 'preload.js');

  win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      preload: preloadPath,
    },
  });

  if (isDev) {
    const url = process.env.VITE_DEV_SERVER_URL as string;
    await win.loadURL(url);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // When packaged, index.html is placed under resources as defined in build.files
    const indexPath = path.join(process.resourcesPath, 'dist-electron', 'index.html');
    await win.loadFile(indexPath);
  }
}

app.whenReady().then(async () => {
  ipcMain.handle('ayher:get-api-base', async () => apiBase);

  await startBackend();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  try {
    if (backendProc) {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(backendProc.pid), '/f', '/t']);
      } else {
        process.kill(-Number(backendProc.pid || 0));
      }
    }
  } catch {}
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
