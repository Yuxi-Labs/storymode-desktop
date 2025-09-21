import { app, BrowserWindow, ipcMain, dialog, Menu, type MenuItemConstructorOptions } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseSource } from '../services/parseSource.js';
import { compileSource } from '../services/compileSource.js';
import type { ParseResponse, CompileResponse } from '../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development'; // retained if later we reintroduce dev-only tooling

async function createWindow() {
  console.log('[main] createWindow start');
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(process.cwd(), 'assets', 'images', 'icons', 'favicon.ico'),
    webPreferences: {
      // Dev: tsc outputs preload to dist/preload/preload.js (separate build); Prod: relative structure remains same.
      preload: isDev
        ? path.join(process.cwd(), 'dist', 'preload', 'main', 'preload', 'preload.js')
        : path.join(__dirname, 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  win.webContents.on('did-finish-load', () => console.log('[main] win did-finish-load'));
  win.webContents.on('did-fail-load', (e, errorCode, errorDescription) => console.error('[main] win did-fail-load', errorCode, errorDescription));

  if (isDev) {
    // Dev: use Vite dev server for fast HMR
    await win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Prod: load built static files
    const filePath = pathToFileURL(path.join(__dirname, '../../renderer/index.html')).toString();
    console.log('[main] loading file url', filePath);
    await win.loadURL(filePath);
  }

  console.log('[main] createWindow complete');


  ipcMain.handle('compile:run', async (_e, args: { content: string; filename?: string }) => {
    try {
      const result: CompileResponse = await compileSource(args.content, { filename: args.filename });
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

  ipcMain.handle('file:write', async (_e, args: { path: string; content: string }) => {
    try {
      await writeFile(args.path, args.content, 'utf8');
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('file:saveAsDialog', async () => {
    const result = await dialog.showSaveDialog({});
    if (result.canceled || !result.filePath) return { canceled: true };
    return { canceled: false, path: result.filePath };
  });
}

function getVersion(pkgName: string): string {
  try {
    const pkgPath = path.join(process.cwd(), 'node_modules', pkgName, 'package.json');
    const text = readFileSync(pkgPath, 'utf8');
    const mod = JSON.parse(text);
    return typeof mod.version === 'string' ? mod.version : 'unknown';
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
          label: 'New File',
          accelerator: 'CmdOrCtrl+N',
          click: () => win.webContents.send('file:new')
        },
        {
          label: 'Open File...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog({ properties: ['openFile'] });
            if (result.canceled || result.filePaths.length === 0) return;
            try {
              const content = await readFile(result.filePaths[0], 'utf8');
              win.webContents.send('file:openResult', { path: result.filePaths[0], content });
            } catch {/* ignore */}
          }
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => win.webContents.send('file:save')
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => win.webContents.send('file:saveAs')
        },
        // Export removed per updated spec; writers focus on print/PDF
        { type: 'separator' },
        {
          label: 'Print Preview',
          accelerator: 'CmdOrCtrl+P',
          click: () => win.webContents.send('ui:print')
        },
        { type: 'separator' },
        {
          label: 'Close File',
          accelerator: 'CmdOrCtrl+W',
          click: () => win.webContents.send('file:close')
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
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
        },
        // Sidebar & preview toggles removed (sidebar always visible; preview in right panel)
        {
          label: 'Recompile',
          accelerator: 'CmdOrCtrl+Shift+B',
          click: () => win.webContents.send('build:recompile')
        },
        { type: 'separator' },
        { type: 'separator' },
        { label: 'Preview', accelerator: 'Alt+1', click: () => win.webContents.send('ui:setPanel', 'preview') },
        { label: 'Metadata', accelerator: 'Alt+2', click: () => win.webContents.send('ui:setPanel', 'info') },
        { label: 'Diagnostics', accelerator: 'Alt+3', click: () => win.webContents.send('ui:setPanel', 'diagnostics') }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Help', click: () => win.webContents.send('ui:help') },
        { type: 'separator' },
        {
          label: 'About StoryMode',
          click: () => {
            const parent = BrowserWindow.getAllWindows()[0];
            const aboutWin = new BrowserWindow({
              width: 520,
              height: 360,
              useContentSize: true,
              resizable: false,
              minimizable: false,
              maximizable: false,
              fullscreenable: false,
              title: 'About StoryMode',
              frame: false,
              modal: !!parent,
              parent: parent || undefined,
              skipTaskbar: true,
              movable: true,
              show: false,
              backgroundColor: '#0b0f14',
              webPreferences: {
                contextIsolation: true,
                nodeIntegration: false
              }
            });

            // Remove the menu from the about window
            aboutWin.setMenu(null);

            const candidate1 = path.join(__dirname, '../../assets/ui/about.html');
            const candidate2 = path.join(process.cwd(), 'assets', 'ui', 'about.html');
            const candidate3 = process.resourcesPath ? path.join(process.resourcesPath, 'assets', 'ui', 'about.html') : candidate2;
            let aboutPath = candidate1;
            if (!existsSync(aboutPath) && existsSync(candidate2)) aboutPath = candidate2;
            if (!existsSync(aboutPath) && existsSync(candidate3)) aboutPath = candidate3;

            if (!existsSync(aboutPath)) {
              console.error('[main] about.html not found at any candidate path:', candidate1, candidate2, candidate3);
              dialog.showMessageBox({
                type: 'info',
                title: 'About StoryMode',
                message: `StoryMode\nVersion: ${app.getVersion()}`
              });
              return;
            }

            aboutWin.loadFile(aboutPath, {
              query: {
                app: app.getVersion(),
                core: getVersion('@yuxilabs/storymode-core'),
                compiler: getVersion('@yuxilabs/storymode-compiler')
              }
            }).catch(err => console.error('[main] failed to load about.html', err));

            // Show the About window only after it's ready to avoid white flash.
            aboutWin.once('ready-to-show', () => {
              try {
                if (parent) {
                  const pBounds = parent.getBounds();
                  const aBounds = aboutWin.getBounds();
                  const x = pBounds.x + Math.round((pBounds.width - aBounds.width) / 2);
                  const y = pBounds.y + Math.round((pBounds.height - aBounds.height) / 2);
                  aboutWin.setPosition(x, y);
                } else {
                  aboutWin.center();
                }
              } catch (err) {
                // ignore positioning errors
              }
              aboutWin.show();
            });
          }
        }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App lifecycle: ensure windows are created on ready and app quits appropriately.
app.on('ready', async () => {
  try {
    await createWindow();
    // Build menu for the focused window
    const focused = BrowserWindow.getAllWindows()[0];
    if (focused) buildMenu(focused);
  } catch (err) {
    console.error('Error creating window:', err);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
    const focused = BrowserWindow.getAllWindows()[0];
    if (focused) buildMenu(focused);
  }
});
