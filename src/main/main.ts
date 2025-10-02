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
  // Common rename
  template.push({ label: 'Rename', click: () => win.webContents.send('explorer:requestRename', payload) });
  // Add narrative under story
  if (payload.type === 'story') {
    template.push({ label: 'Add Narrative', click: () => win.webContents.send('explorer:addNarrative', {}) });
  }
  // Narrative-specific items
  if (payload.type === 'narrative') {
    template.push({ label: 'Add Scene', click: () => win.webContents.send('explorer:addScene', { narrativeId: payload.narrativeId }) });
    template.push({ type: 'separator' });
    template.push({ label: 'Delete Narrative', click: () => win.webContents.send('explorer:deleteNarrative', { narrativeId: payload.narrativeId, title: payload.title }) });
  }
  // Scene-specific delete
  if (payload.type === 'scene') {
    template.push({ label: 'Delete Scene', click: () => win.webContents.send('explorer:requestDeleteScene', { id: payload.sceneId, title: payload.title }) });
  }
  const menu = Menu.buildFromTemplate(template);
  menu.popup({ window: win });
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
  const appearanceDisabled = Boolean(shellState.themeId);

  const template: MenuItemConstructorOptions[] = [
    {
      label: "File",
      submenu: [
        {
          label: "New Story",
          accelerator: "CmdOrCtrl+N",
          click: () => win.webContents.send("file:newStory"),
        },
        {
          label: "Open Story…",
          accelerator: "CmdOrCtrl+O",
          click: () => presentOpenStoryDialog(win),
        },
        {
          label: "Open Recent",
          submenu:
            recentStories.length > 0
              ? recentStories.map((filePath) => ({
                  label: filePath,
                  click: () => openStoryFromDisk(win, filePath),
                }))
              : [{ label: "No recent stories", enabled: false }],
        },
        { type: "separator" },
        {
          label: "Save Story",
          accelerator: "CmdOrCtrl+S",
          click: () => win.webContents.send("file:saveStory"),
        },
        {
          label: "Save Story As…",
          accelerator: "CmdOrCtrl+Shift+S",
          click: () => win.webContents.send("file:saveStoryAs"),
        },
        { type: "separator" },
        {
          label: "Preview Story",
          type: "checkbox",
          accelerator: "CmdOrCtrl+Shift+P",
          checked: shellState.previewVisible,
          click: () => win.webContents.send("ui:togglePreview"),
        },
        {
          label: "Print Script…",
          accelerator: "CmdOrCtrl+P",
          click: () => win.webContents.send("ui:print"),
        },
        { type: "separator" },
        {
          label: "Settings…",
          accelerator: process.platform === "darwin" ? "Cmd+," : "Ctrl+,",
          click: () => win.webContents.send("app:openSettings"),
        },
        { type: "separator" },
        {
          label: "Close Story",
          accelerator: "CmdOrCtrl+W",
          click: () => win.webContents.send("file:closeStory"),
        },
        { type: "separator" },
        process.platform === "darwin" ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
        { type: "separator" },
        {
          label: "Select Line",
          accelerator: "CmdOrCtrl+L",
          click: () => win.webContents.send("edit:selectLine"),
        },
        {
          label: "Select Block",
          accelerator: "CmdOrCtrl+Shift+L",
          click: () => win.webContents.send("edit:selectBlock"),
        },
        {
          label: "Toggle Comment",
          accelerator: "CmdOrCtrl+/",
          click: () => win.webContents.send("edit:toggleComment"),
        },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Themes",
          submenu: (() => {
            const items: MenuItemConstructorOptions[] = [
              {
                label: "Auto",
                type: "radio",
                checked: shellState.themeId == null && shellState.themeMode === "auto",
                click: () => {
                  win.webContents.send("ui:applyThemePreset", null);
                  win.webContents.send("ui:setThemeMode", "auto");
                },
              },
              {
                label: "Light Mode",
                type: "radio",
                checked: shellState.themeId == null && shellState.themeMode === "light",
                click: () => {
                  win.webContents.send("ui:applyThemePreset", null);
                  win.webContents.send("ui:setThemeMode", "light");
                },
              },
              {
                label: "Dark Mode",
                type: "radio",
                checked: shellState.themeId == null && shellState.themeMode === "dark",
                click: () => {
                  win.webContents.send("ui:applyThemePreset", null);
                  win.webContents.send("ui:setThemeMode", "dark");
                },
              },
            ];
            // Placeholder for plugin-provided themes (future). If any, add separator + radio items.
            const pluginThemes: { id: string; label: string }[] = []; // currently none
            if (pluginThemes.length) {
              items.push({ type: "separator" });
              for (const pt of pluginThemes) {
                items.push({
                  label: pt.label,
                  type: "radio",
                  checked: shellState.themeId === pt.id,
                  click: () => win.webContents.send("ui:applyThemePreset", pt.id),
                });
              }
            }
            return items;
          })(),
        },
        { type: "separator" },
        {
          label: "Panels",
          submenu: [
            {
              label: "Sidebar",
              type: "checkbox",
              checked: !shellState.sidebarCollapsed,
              click: () => win.webContents.send("ui:toggleSidebar"),
            },
            {
              label: "Details Panel",
              type: "checkbox",
              checked: shellState.inspectorVisible,
              click: () => win.webContents.send("ui:toggleInspector"),
            },
            {
              label: "Status Bar",
              type: "checkbox",
              checked: shellState.statusBarVisible,
              click: () => win.webContents.send("ui:toggleStatusBar"),
            },
          ],
        },
        { type: "separator" },
        {
          label: "Window",
          submenu: [
            { role: "minimize" },
            {
              label: "Maximize",
              click: () => {
                if (win.isMaximized()) {
                  win.unmaximize();
                } else {
                  win.maximize();
                }
              },
            },
          ],
        },
        { type: 'separator' },
        {
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: () => {
            const wc = win.webContents;
            if (wc.isDevToolsOpened()) wc.closeDevTools(); else wc.openDevTools({ mode: 'detach' });
          }
        },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "StoryMode Documentation",
          click: () => shell.openExternal("https://docs.storymode.help"),
        },
        {
          label: "Narrative Language Help",
          click: () => shell.openExternal("https://docs.storymode.help/language"),
        },
        {
          label: "Cheat Sheet",
          click: () => shell.openExternal("https://docs.storymode.help/shortcuts"),
        },
        { type: "separator" },
        {
          label: "Request Support…",
          click: () => win.webContents.send("help:requestSupport"),
        },
        {
          label: "Report a Bug…",
          click: () => win.webContents.send("help:reportBug"),
        },
        {
          label: "Request a Feature…",
          click: () => win.webContents.send("help:requestFeature"),
        },
  { type: "separator" },
        {
          label: "About StoryMode",
          click: () => win.webContents.send("app:openAbout"),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.on("ready", async () => {
  try {
    await createWindow();
    const focused = BrowserWindow.getAllWindows()[0];
    if (focused) buildMenu(focused);
  } catch (err) {
    console.error("Error creating window:", err);
    app.quit();
  }
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


