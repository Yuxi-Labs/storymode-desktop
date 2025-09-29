import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  Menu,
  shell,
  type MenuItemConstructorOptions,
} from "electron";
import { readFile, writeFile } from "node:fs/promises";
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

async function openStoryFromDisk(win: BrowserWindow, filePath: string) {
  try {
    const content = await readFile(filePath, "utf8");
    win.webContents.send("file:openResult", {
      path: filePath,
      content,
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

ipcMain.handle("app:versionInfo", async () => ({
  coreVersion: getVersion("@yuxilabs/storymode-core"),
  compilerVersion: getVersion("@yuxilabs/storymode-compiler"),
  appVersion: app.getVersion(),
}));

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

}

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


