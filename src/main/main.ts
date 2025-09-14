import { app, BrowserWindow, ipcMain, dialog, Menu, type MenuItemConstructorOptions } from 'electron';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import url, { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { parseSource } from '../services/parseSource.js';
import { compileSource } from '../services/compileSource.js';
import type { ParseResponse, CompileResponse } from '../shared/types.js';

// ESM replacements for __dirname / require
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const isDev = process.env.NODE_ENV === 'development'; // retained if later we reintroduce dev-only tooling

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
  preload: path.join(__dirname, './preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  if (isDev) {
    // Dev: use Vite dev server for fast HMR
    await win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Prod: load built static files
    const filePath = url.pathToFileURL(path.join(__dirname, '../../../renderer/index.html')).toString();
    await win.loadURL(filePath);
  }

  buildMenu(win);
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
    const pkgPath = path.join(process.cwd(), 'node_modules', pkgName, 'package.json');
    const pkg = require(pkgPath);
    return pkg.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

function buildMenu(win: BrowserWindow) {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open File...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog({ properties: ['openFile'] });
            if (result.canceled || result.filePaths.length === 0) return;
            try {
              const content = await readFile(result.filePaths[0], 'utf8');
              win.webContents.send('file:openResult', { path: result.filePaths[0], content });
            } catch (err: any) {
              // ignore read errors for now
            }
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Build',
      submenu: [
        {
          label: 'Recompile',
          accelerator: 'CmdOrCtrl+Shift+B',
          click: () => win.webContents.send('build:recompile')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        {
          label: 'Toggle Theme',
          accelerator: 'CmdOrCtrl+T',
          click: () => win.webContents.send('ui:toggleTheme')
        }
      ]
    },
    {
      label: 'Panels',
      submenu: [
        { label: 'Diagnostics', click: () => win.webContents.send('ui:setPanel', 'diagnostics') },
        { label: 'AST', click: () => win.webContents.send('ui:setPanel', 'ast') },
        { label: 'Tokens', click: () => win.webContents.send('ui:setPanel', 'tokens') },
        { label: 'IR', click: () => win.webContents.send('ui:setPanel', 'ir') }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
