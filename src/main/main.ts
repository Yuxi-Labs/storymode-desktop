import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  Menu,
  shell,
  type MenuItemConstructorOptions,
} from "electron";
import { readFile, writeFile, stat } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import url from "node:url";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseSource } from "../services/parseSource.js";
import { compileSource } from "../services/compileSource.js";
import { initTelemetry } from './telemetry.js';
import { createRemoteUploader } from './telemetryUploader.js';
import { readFile as fsReadFile } from 'node:fs/promises';
import type {
  ParseResponse,
  CompileResponse,
  FileKind,
} from "../shared/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === "development"; // retained if later we reintroduce dev-only tooling

type ShellMenuState = {
  previewVisible: boolean;
  inspectorVisible: boolean;
  statusBarVisible: boolean;
  sidebarCollapsed: boolean;
  themeMode: "light" | "dark" | "auto";
  themeId: string | null;
};

let shellState: ShellMenuState = {
  previewVisible: false,
  inspectorVisible: false,
  statusBarVisible: true,
  sidebarCollapsed: false,
  themeMode: "dark",
  themeId: "storymode-dark",
};

let recentStories: string[] = [];
type TelemetryHandle = { track: (e: string, props?: Record<string, any>) => void } | null;
let telemetry: TelemetryHandle = null;
// Lightweight indirection so we can safely call track() before telemetry init completes.
let track: (event: string, props?: Record<string, any>) => void = () => {};

// ---------------- Localization (main process) ----------------
let currentLocale: 'en' | 'zh-CN' = 'en';
const menuI18n: Record<'en'|'zh-CN', Record<string,string>> = {
  en: {
    'menu.file': 'File',
    'menu.file.new': 'New Story',
    'menu.file.open': 'Open Story…',
    'menu.file.openRecent': 'Open Recent',
    'menu.file.noRecent': 'No recent stories',
    'menu.file.save': 'Save Story',
    'menu.file.saveAs': 'Save Story As…',
    'menu.file.preview': 'Preview Story',
    'menu.file.print': 'Print Script…',
    'menu.file.settings': 'Settings…',
    'menu.file.close': 'Close Story',
    'menu.edit': 'Edit',
    'menu.edit.undo': 'Undo',
    'menu.edit.redo': 'Redo',
    'menu.edit.cut': 'Cut',
    'menu.edit.copy': 'Copy',
    'menu.edit.paste': 'Paste',
    'menu.edit.selectAll': 'Select All',
    'menu.edit.selectLine': 'Select Line',
    'menu.edit.selectBlock': 'Select Block',
    'menu.edit.toggleComment': 'Toggle Comment',
    'menu.view': 'View',
    'menu.view.themes': 'Themes',
    'menu.view.themes.auto': 'Auto',
    'menu.view.themes.light': 'Light Mode',
    'menu.view.themes.dark': 'Dark Mode',
    'menu.view.panels': 'Panels',
    'menu.view.panels.sidebar': 'Sidebar',
    'menu.view.panels.details': 'Details Panel',
    'menu.view.panels.statusBar': 'Status Bar',
    'menu.view.window': 'Window',
    'menu.view.window.minimize': 'Minimize',
    'menu.view.window.maximize': 'Maximize',
    'menu.view.devtools': 'Toggle Developer Tools',
    'menu.help': 'Help',
    'menu.help.docs': 'StoryMode Documentation',
    'menu.help.language': 'Narrative Language Help',
    'menu.help.cheatsheet': 'Cheat Sheet',
    'menu.help.requestSupport': 'Request Support…',
    'menu.help.reportBug': 'Report a Bug…',
    'menu.help.requestFeature': 'Request a Feature…',
    'menu.help.about': 'About StoryMode',
  'menu.help.openTelemetry': 'Open Telemetry Folder',
    'ctx.rename': 'Rename',
    'ctx.addNarrative': 'Add Narrative',
    'ctx.addScene': 'Add Scene',
    'ctx.deleteNarrative': 'Delete Narrative',
    'ctx.deleteScene': 'Delete Scene',
  },
  'zh-CN': {
    'menu.file': '文件',
    'menu.file.new': '新建故事',
    'menu.file.open': '打开故事…',
    'menu.file.openRecent': '打开最近',
    'menu.file.noRecent': '最近没有故事',
    'menu.file.save': '保存故事',
    'menu.file.saveAs': '另存故事为…',
    'menu.file.preview': '预览故事',
    'menu.file.print': '打印脚本…',
    'menu.file.settings': '设置…',
    'menu.file.close': '关闭故事',
    'menu.edit': '编辑',
    'menu.edit.undo': '撤销',
    'menu.edit.redo': '重做',
    'menu.edit.cut': '剪切',
    'menu.edit.copy': '复制',
    'menu.edit.paste': '粘贴',
    'menu.edit.selectAll': '全选',
    'menu.edit.selectLine': '选择行',
    'menu.edit.selectBlock': '选择块',
    'menu.edit.toggleComment': '切换注释',
    'menu.view': '视图',
    'menu.view.themes': '主题',
    'menu.view.themes.auto': '自动',
    'menu.view.themes.light': '浅色模式',
    'menu.view.themes.dark': '深色模式',
    'menu.view.panels': '面板',
    'menu.view.panels.sidebar': '侧边栏',
    'menu.view.panels.details': '详情面板',
    'menu.view.panels.statusBar': '状态栏',
    'menu.view.window': '窗口',
    'menu.view.window.minimize': '最小化',
    'menu.view.window.maximize': '最大化',
    'menu.view.devtools': '切换开发者工具',
    'menu.help': '帮助',
    'menu.help.docs': 'StoryMode 文档',
    'menu.help.language': '叙事语言帮助',
    'menu.help.cheatsheet': '速查表',
    'menu.help.requestSupport': '请求支持…',
    'menu.help.reportBug': '报告问题…',
    'menu.help.requestFeature': '功能建议…',
    'menu.help.about': '关于 StoryMode',
  'menu.help.openTelemetry': '打开遥测文件夹',
    'ctx.rename': '重命名',
    'ctx.addNarrative': '添加叙事',
    'ctx.addScene': '添加场景',
    'ctx.deleteNarrative': '删除叙事',
    'ctx.deleteScene': '删除场景',
  }
};
const tr = (k: string) => menuI18n[currentLocale][k] || menuI18n.en[k] || k;

const addRecentStory = (filePath: string) => {
  recentStories = [filePath, ...recentStories.filter((item) => item !== filePath)].slice(0, 8);
};

function detectEncoding(buffer: Buffer): { encoding: string; text: string } {
  // 1. BOM checks (authoritative)
  if (buffer.length >= 4) {
    if (buffer[0] === 0xFF && buffer[1] === 0xFE && buffer[2] === 0x00 && buffer[3] === 0x00) {
      // UTF-32 LE BOM
      const u16 = Buffer.alloc((buffer.length - 4) / 2);
      for (let i = 4, j = 0; i + 1 < buffer.length; i += 4, j += 2) {
        u16[j] = buffer[i];
        u16[j + 1] = buffer[i + 1];
      }
      return { encoding: 'utf-32le-bom', text: u16.toString('utf16le') };
    }
    if (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0xFE && buffer[3] === 0xFF) {
      // UTF-32 BE BOM
      const u16 = Buffer.alloc((buffer.length - 4) / 2);
      for (let i = 4, j = 0; i + 3 < buffer.length; i += 4, j += 2) {
        u16[j] = buffer[i + 2];
        u16[j + 1] = buffer[i + 3];
      }
      return { encoding: 'utf-32be-bom', text: u16.toString('utf16le') };
    }
  }
  if (buffer.length >= 3) {
    if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      return { encoding: 'utf-8-bom', text: buffer.slice(3).toString('utf8') };
    }
  }
  if (buffer.length >= 2) {
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
      return { encoding: 'utf-16le-bom', text: buffer.slice(2).toString('utf16le') };
    }
    if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
      const swapped = Buffer.alloc(buffer.length - 2);
      for (let i = 2; i + 1 < buffer.length; i += 2) {
        swapped[i - 2] = buffer[i + 1];
        swapped[i - 1] = buffer[i];
      }
      return { encoding: 'utf-16be-bom', text: swapped.toString('utf16le') };
    }
  }

  // 2. Heuristics for UTF-16 without BOM
  const looksLikeUtf16LE = () => {
    // Many zero high bytes in even positions suggests UTF-16LE ASCII range
    if (buffer.length < 4) return false;
    let zeros = 0;
    const sample = Math.min(buffer.length, 512);
    for (let i = 1; i < sample; i += 2) if (buffer[i] === 0x00) zeros++;
    const ratio = zeros / (sample / 2);
    return ratio > 0.6; // heuristic threshold
  };
  const looksLikeUtf16BE = () => {
    if (buffer.length < 4) return false;
    let zeros = 0;
    const sample = Math.min(buffer.length, 512);
    for (let i = 0; i < sample; i += 2) if (buffer[i] === 0x00) zeros++;
    const ratio = zeros / (sample / 2);
    return ratio > 0.6;
  };
  if (looksLikeUtf16LE()) {
    return { encoding: 'utf-16le', text: buffer.toString('utf16le') };
  }
  if (looksLikeUtf16BE()) {
    // swap bytes to decode
    const swapped = Buffer.alloc(buffer.length);
    for (let i = 0; i + 1 < buffer.length; i += 2) {
      swapped[i] = buffer[i + 1];
      swapped[i + 1] = buffer[i];
    }
    return { encoding: 'utf-16be', text: swapped.toString('utf16le') };
  }

  // 3. UTF-8 validation (simple): ensure continuation bytes follow multibyte patterns
  const isValidUtf8 = () => {
    let i = 0; const len = buffer.length;
    while (i < len) {
      const byte = buffer[i];
      if ((byte & 0x80) === 0) { i++; continue; } // ASCII
      let needed = 0;
      if ((byte & 0xE0) === 0xC0) needed = 1; else if ((byte & 0xF0) === 0xE0) needed = 2; else if ((byte & 0xF8) === 0xF0) needed = 3; else return false;
      if (i + needed >= len) return false;
      for (let j = 1; j <= needed; j++) if ((buffer[i + j] & 0xC0) !== 0x80) return false;
      i += needed + 1;
    }
    return true;
  };
  if (isValidUtf8()) {
    return { encoding: 'utf-8', text: buffer.toString('utf8') };
  }

  // 4. Fallback: unknown (avoid mislabeling)
  return { encoding: 'unknown', text: buffer.toString('utf8') };
}

async function openStoryFromDisk(win: BrowserWindow, filePath: string) {
  try {
    const [buffer, fileStat] = await Promise.all([
      readFile(filePath),
      stat(filePath).catch(() => undefined),
    ]);
    const { encoding, text } = detectEncoding(buffer);
    win.webContents.send("file:openResult", {
      path: filePath,
      content: text,
      encoding,
      sizeBytes: fileStat?.size,
      lastModifiedMs: fileStat?.mtimeMs,
    });
    addRecentStory(filePath);
  } catch (err) {
    console.error("[main] failed to open story", err);
    dialog.showErrorBox(
      "Unable to open story",
      (err as Error | undefined)?.message ?? "An unknown error occurred.",
    );
  }
}

async function presentOpenStoryDialog(win: BrowserWindow) {
  const result = await dialog.showOpenDialog(win, {
    properties: ["openFile"],
    filters: [{ name: "StoryMode", extensions: ["story", "txt", "smode"] }],
  });
  if (result.canceled || result.filePaths.length === 0) return;
  await openStoryFromDisk(win, result.filePaths[0]);
}

ipcMain.on("ui:shellState", (event, incoming: Partial<ShellMenuState>) => {
  shellState = { ...shellState, ...incoming };
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) buildMenu(win);
  track('ui.shellState', incoming);
});

// Locale change from renderer
ipcMain.on('app:setLocale', (_e, loc) => {
  if (loc === 'en' || loc === 'zh-CN') {
    if (currentLocale !== loc) {
      currentLocale = loc;
      const focused = BrowserWindow.getFocusedWindow();
      if (focused) buildMenu(focused);
      track('app.locale.changed', { locale: loc });
    }
  }
});

ipcMain.handle("compile:run", async (_e, args: { content?: string; filename?: string; ast?: unknown; kind?: FileKind; }) => {
  try {
    const payload = typeof args.ast !== "undefined"
      ? args.ast
      : typeof args.content === "string"
        ? args.content
        : "";
    const result: CompileResponse = await compileSource(payload, {
      filename: args.filename,
      kind: args.kind,
    });
    return result;
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
});

// Provides parsing functionality to the renderer (debounced in hooks) and mirrors
// the expected request/response shape documented in ARCHITECTURE_DRAFT.md.
ipcMain.handle("parse:run", async (_e, args: { content?: string; filename?: string }) => {
  try {
    const content = typeof args.content === "string" ? args.content : "";
    const result: ParseResponse = await parseSource(content, {
      filename: args.filename,
      collectTokens: true,
      collectSceneIndex: true,
    });
    return result;
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("app:versionInfo", async () => ({
  coreVersion: getVersion("@yuxilabs/storymode-core"),
  compilerVersion: getVersion("@yuxilabs/storymode-compiler"),
  appVersion: app.getVersion(),
}));

// Present a native open dialog; returns { canceled, paths } where paths is empty if canceled.
ipcMain.handle("file:openDialog", async (_e) => {
  const focused = BrowserWindow.getFocusedWindow();
  const result = await (
    focused
      ? dialog.showOpenDialog(focused, {
          properties: ["openFile"],
          filters: [
            { name: "StoryMode", extensions: ["story", "txt", "smode", "md"] },
            { name: "All Files", extensions: ["*"] },
          ],
        })
      : dialog.showOpenDialog({
          properties: ["openFile"],
          filters: [
            { name: "StoryMode", extensions: ["story", "txt", "smode", "md"] },
            { name: "All Files", extensions: ["*"] },
          ],
        })
  );
  return { canceled: result.canceled, paths: result.filePaths };
});

// Simple file read wrapper returning UTF-8 text. Errors surface as { ok:false, error }.
ipcMain.handle("file:read", async (_e, args: { path?: string }) => {
  try {
    if (!args?.path) return { ok: false, error: "No path provided" };
    const buffer = await readFile(args.path);
    const { encoding, text } = detectEncoding(buffer);
    return { ok: true, content: text, encoding };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("file:write", async (_e, args: { path: string; content: string }) => {
  try {
    await writeFile(args.path, args.content, "utf8");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("file:saveAsDialog", async () => {
  const result = await dialog.showSaveDialog({});
  if (result.canceled || !result.filePath) return { canceled: true };
  return { canceled: false, path: result.filePath };
});

async function createWindow() {
  console.log("[main] createWindow start");
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(process.cwd(), "assets", "images", "icons", "favicon.ico"),
    webPreferences: {
      preload: isDev
        ? path.join(
            process.cwd(),
            "dist",
            "preload",
            "main",
            "preload",
            "preload.js",
          )
        : path.join(__dirname, "preload", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.on("did-finish-load", () =>
    console.log("[main] win did-finish-load"),
  );
  win.webContents.on("did-fail-load", (e, errorCode, errorDescription) =>
    console.error("[main] win did-fail-load", errorCode, errorDescription),
  );

  if (isDev) {
    await win.loadURL("http://localhost:5173");
  } else {
    const filePath = pathToFileURL(
      path.join(__dirname, "../../renderer/index.html"),
    ).toString();
    console.log("[main] loading file url", filePath);
    await win.loadURL(filePath);
  }

  console.log("[main] createWindow complete");

  // Open devtools automatically in development to aid debugging.
  if (isDev) {
    try {
      win.webContents.openDevTools({ mode: 'detach' });
    } catch (err) {
      console.warn('[main] failed to open devtools automatically', err);
    }
  }

}

type ExplorerContextPayload = {
  id: string; // composite id like story | narrative:XYZ | scene:ABC
  type: 'story' | 'narrative' | 'scene';
  narrativeId?: string;
  sceneId?: string;
  title?: string;
};

// Custom UI now handled fully in renderer; main just notifies renderer to show overlays.

ipcMain.on('explorer:contextMenu', async (event, payload: ExplorerContextPayload) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  const template: MenuItemConstructorOptions[] = [];
  template.push({ label: tr('ctx.rename'), click: () => win.webContents.send('explorer:requestRename', payload) });
  if (payload.type === 'story') {
    template.push({ label: tr('ctx.addNarrative'), click: () => win.webContents.send('explorer:addNarrative', {}) });
  }
  if (payload.type === 'narrative') {
    template.push({ label: tr('ctx.addScene'), click: () => win.webContents.send('explorer:addScene', { narrativeId: payload.narrativeId }) });
    template.push({ type: 'separator' });
    template.push({ label: tr('ctx.deleteNarrative'), click: () => win.webContents.send('explorer:deleteNarrative', { narrativeId: payload.narrativeId, title: payload.title }) });
  }
  if (payload.type === 'scene') {
    template.push({ label: tr('ctx.deleteScene'), click: () => win.webContents.send('explorer:requestDeleteScene', { id: payload.sceneId, title: payload.title }) });
  }
  const menu = Menu.buildFromTemplate(template);
  menu.popup({ window: win });
  track('explorer.context', { type: payload.type });
});

ipcMain.on('telemetry:event', (_e, data: { event: string; props?: Record<string, any> }) => {
  if (!data?.event) return;
  track(data.event, data.props);
});

// Summarize telemetry events for user visibility (local only, on-demand)
ipcMain.handle('telemetry:summary', async () => {
  try {
    const dir = path.join(app.getPath('userData'), 'telemetry');
    const file = path.join(dir, 'events.log');
    const raw = await fsReadFile(file, 'utf8').catch(() => '');
    const lines = raw.trim().split(/\n+/).slice(-500); // cap to last 500 for responsiveness
    let total = 0; const counts: Record<string, number> = {};
    for (const line of lines) {
      try { const evt = JSON.parse(line); if (evt && typeof evt.event === 'string') { total++; counts[evt.event] = (counts[evt.event]||0)+1; } } catch {}
    }
    return { ok: true, total, lastN: lines.length, counts };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
});

function getVersion(pkgName: string): string {
  try {
    const pkgJson = path.join(process.cwd(), "node_modules", pkgName, "package.json");
    const raw = readFileSync(pkgJson, "utf8");
    const mod = JSON.parse(raw) as { version?: string };
    return typeof mod.version === "string" ? mod.version : "unknown";
  } catch {
    return "unknown";
  }
}


function buildMenu(win: BrowserWindow) {
  const template: MenuItemConstructorOptions[] = [
    {
      label: tr('menu.file'),
      submenu: [
        { label: tr('menu.file.new'), accelerator: 'CmdOrCtrl+N', click: () => win.webContents.send('file:newStory') },
        { label: tr('menu.file.open'), accelerator: 'CmdOrCtrl+O', click: () => presentOpenStoryDialog(win) },
        { label: tr('menu.file.openRecent'), submenu: recentStories.length ? recentStories.map(fp => ({ label: fp, click: () => openStoryFromDisk(win, fp) })) : [{ label: tr('menu.file.noRecent'), enabled: false }] },
        { type: 'separator' },
        { label: tr('menu.file.save'), accelerator: 'CmdOrCtrl+S', click: () => win.webContents.send('file:saveStory') },
        { label: tr('menu.file.saveAs'), accelerator: 'CmdOrCtrl+Shift+S', click: () => win.webContents.send('file:saveStoryAs') },
        { type: 'separator' },
        { label: tr('menu.file.preview'), type: 'checkbox', accelerator: 'CmdOrCtrl+Shift+P', checked: shellState.previewVisible, click: () => win.webContents.send('ui:togglePreview') },
        { label: tr('menu.file.print'), accelerator: 'CmdOrCtrl+P', click: () => win.webContents.send('ui:print') },
        { type: 'separator' },
        { label: tr('menu.file.settings'), accelerator: process.platform === 'darwin' ? 'Cmd+,' : 'Ctrl+,', click: () => win.webContents.send('app:openSettings') },
        { type: 'separator' },
        { label: tr('menu.file.close'), accelerator: 'CmdOrCtrl+W', click: () => win.webContents.send('file:closeStory') },
        { type: 'separator' },
        process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' },
      ]
    },
    {
      label: tr('menu.edit'),
      submenu: [
        { role: 'undo', label: tr('menu.edit.undo') },
        { role: 'redo', label: tr('menu.edit.redo') },
        { type: 'separator' },
        { role: 'cut', label: tr('menu.edit.cut') },
        { role: 'copy', label: tr('menu.edit.copy') },
        { role: 'paste', label: tr('menu.edit.paste') },
        { role: 'selectAll', label: tr('menu.edit.selectAll') },
        { type: 'separator' },
        { label: tr('menu.edit.selectLine'), accelerator: 'CmdOrCtrl+L', click: () => win.webContents.send('edit:selectLine') },
        { label: tr('menu.edit.selectBlock'), accelerator: 'CmdOrCtrl+Shift+L', click: () => win.webContents.send('edit:selectBlock') },
        { label: tr('menu.edit.toggleComment'), accelerator: 'CmdOrCtrl+/', click: () => win.webContents.send('edit:toggleComment') },
      ]
    },
    {
      label: tr('menu.view'),
      submenu: [
        { label: tr('menu.view.themes'), submenu: [
          { label: tr('menu.view.themes.auto'), type: 'radio', checked: shellState.themeId == null && shellState.themeMode === 'auto', click: () => { win.webContents.send('ui:applyThemePreset', null); win.webContents.send('ui:setThemeMode', 'auto'); } },
          { label: tr('menu.view.themes.light'), type: 'radio', checked: shellState.themeId == null && shellState.themeMode === 'light', click: () => { win.webContents.send('ui:applyThemePreset', null); win.webContents.send('ui:setThemeMode', 'light'); } },
          { label: tr('menu.view.themes.dark'), type: 'radio', checked: shellState.themeId == null && shellState.themeMode === 'dark', click: () => { win.webContents.send('ui:applyThemePreset', null); win.webContents.send('ui:setThemeMode', 'dark'); } },
        ]},
        { type: 'separator' },
        { label: tr('menu.view.panels'), submenu: [
          { label: tr('menu.view.panels.sidebar'), type: 'checkbox', checked: !shellState.sidebarCollapsed, click: () => win.webContents.send('ui:toggleSidebar') },
          { label: tr('menu.view.panels.details'), type: 'checkbox', checked: shellState.inspectorVisible, click: () => win.webContents.send('ui:toggleInspector') },
          { label: tr('menu.view.panels.statusBar'), type: 'checkbox', checked: shellState.statusBarVisible, click: () => win.webContents.send('ui:toggleStatusBar') },
        ]},
        { type: 'separator' },
        { label: tr('menu.view.window'), submenu: [
          { role: 'minimize', label: tr('menu.view.window.minimize') },
          { label: tr('menu.view.window.maximize'), click: () => { if (win.isMaximized()) { win.unmaximize(); } else { win.maximize(); } } }
        ]},
        { type: 'separator' },
        { label: tr('menu.view.devtools'), accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I', click: () => { const wc = win.webContents; if (wc.isDevToolsOpened()) wc.closeDevTools(); else wc.openDevTools({ mode: 'detach' }); } }
      ]
    },
    {
      label: tr('menu.help'),
      submenu: [
        { label: tr('menu.help.docs'), click: () => shell.openExternal('https://docs.storymode.help') },
        { label: tr('menu.help.language'), click: () => shell.openExternal('https://docs.storymode.help/language') },
        { label: tr('menu.help.cheatsheet'), click: () => shell.openExternal('https://docs.storymode.help/shortcuts') },
        { type: 'separator' },
        { label: tr('menu.help.openTelemetry'), click: () => { try { const p = path.join(app.getPath('userData'), 'telemetry'); shell.openPath(p); track('telemetry.openFolder'); } catch {} } },
        { type: 'separator' },
        { label: tr('menu.help.requestSupport'), click: () => win.webContents.send('help:requestSupport') },
        { label: tr('menu.help.reportBug'), click: () => win.webContents.send('help:reportBug') },
        { label: tr('menu.help.requestFeature'), click: () => win.webContents.send('help:requestFeature') },
        { type: 'separator' },
        { label: tr('menu.help.about'), click: () => win.webContents.send('app:openAbout') },
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.on("ready", async () => {
  try {
    await createWindow();
    const focused = BrowserWindow.getAllWindows()[0];
    if (focused) buildMenu(focused);
    // Initialize telemetry after window creation so app paths & version are ready.
    try {
      const rec = await initTelemetry();
      track = rec.track;
      // Remote uploader scaffold (inactive unless user enables share + endpoint configured)
      try {
        const uploader = createRemoteUploader({
          shareEnabled: () => { try { return (global as any).__storymodeShareTelemetry === true; } catch { return false; } },
          endpoint: process.env.STORYMODE_TELEMETRY_ENDPOINT, // optional
          whitelist: ['version','locale','ms','err','narratives','scenes','hasPath','platform','arch','cpuCount','memMB','type','v'],
        });
        rec._injectRemote?.(uploader as any);
      } catch { /* ignore uploader errors */ }
      track('app.main.ready');
    } catch (teleErr) {
      console.warn('Telemetry initialization failed:', teleErr); // non-fatal
    }
  } catch (err) {
    console.error("Error creating window:", err);
    app.quit();
  }
});

// Unhandled error instrumentation (sanitized)
process.on('uncaughtException', (err) => {
  try { track('error.unhandled', { type: 'uncaught', msg: err?.message?.slice(0,200), name: (err as any)?.name }); } catch {}
});
process.on('unhandledRejection', (reason: any) => {
  try { const msg = typeof reason === 'string' ? reason : reason?.message; track('error.unhandled', { type: 'unhandledRejection', msg: msg?.slice?.(0,200), name: reason?.name }); } catch {}
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
    const focused = BrowserWindow.getAllWindows()[0];
    if (focused) buildMenu(focused);
  }
});


