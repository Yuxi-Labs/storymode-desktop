import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';
import { parseSource } from '../services/parseSource.js';
import { compileSource } from '../services/compileSource.js';
import type { ParseResponse, CompileResponse } from '@shared/types';

const isDev = process.env.NODE_ENV === 'development';

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  if (isDev) {
    await win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const filePath = url.pathToFileURL(path.join(__dirname, '../../renderer/index.html')).toString();
    await win.loadURL(filePath);
  }
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function registerIpc() {
  ipcMain.handle('file:openDialog', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openFile'] });
    if (result.canceled || result.filePaths.length === 0) return { canceled: true };
    return { canceled: false, path: result.filePaths[0] };
  });

  ipcMain.handle('file:read', async (_e, args: { path: string }) => {
    try {
      const content = await readFile(args.path, 'utf8');
      return { ok: true, content };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('parse:run', async (_e, args: { content: string; filename?: string }) => {
    try {
      const result: ParseResponse = parseSource(args.content, { filename: args.filename, collectTokens: true, collectSceneIndex: true });
      return result;
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('compile:run', async (_e, args: { content: string; filename?: string }) => {
    try {
      const result: CompileResponse = compileSource(args.content, { filename: args.filename });
      return result;
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('app:versionInfo', async () => {
    return {
      coreVersion: getVersion('@yuxilabs/storymode-core'),
      compilerVersion: getVersion('@yuxilabs/storymode-compiler'),
      appVersion: app.getVersion()
    };
  });
}

function getVersion(pkgName: string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require(path.join(process.cwd(), 'node_modules', pkgName, 'package.json'));
    return pkg.version || 'unknown';
  } catch {
    return 'unknown';
  }
}
