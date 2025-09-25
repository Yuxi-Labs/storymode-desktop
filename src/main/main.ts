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

function openAboutDialog(parent?: BrowserWindow) {
  const aboutWin = new BrowserWindow({
    width: 580,
    height: 440,
    useContentSize: true,
    resizable: false,
    thickFrame: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: "About StoryMode",
  frame: false,
  // Allow OS rounded corners for the restored design
  roundedCorners: true,
    modal: !!parent,
    parent: parent || undefined,
    skipTaskbar: true,
    movable: true,
    show: false,
  backgroundColor: "#181c21",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  aboutWin.setMenu(null);

  // No square enforcement; keep native rounded corners for fidelity

  const candidate1 = path.join(__dirname, "../../assets/ui/about.html");
  const candidate2 = path.join(process.cwd(), "assets", "ui", "about.html");
  const candidate3 = process.resourcesPath
    ? path.join(process.resourcesPath, "assets", "ui", "about.html")
    : candidate2;

  let aboutPath = candidate1;
  if (!existsSync(aboutPath) && existsSync(candidate2)) aboutPath = candidate2;
  if (!existsSync(aboutPath) && existsSync(candidate3)) aboutPath = candidate3;

  if (!existsSync(aboutPath)) {
    console.error(
      "[main] about.html not found at any candidate path:",
      candidate1,
      candidate2,
      candidate3,
    );
    dialog.showMessageBox({
      type: "info",
      title: "About StoryMode",
      message: `StoryMode\nVersion: ${app.getVersion()}`,
    });
    return;
  }

  aboutWin
    .loadFile(aboutPath, {
      query: {
        app: app.getVersion(),
        core: getVersion("@yuxilabs/storymode-core"),
        compiler: getVersion("@yuxilabs/storymode-compiler"),
      },
    })
    .catch((err) => console.error("[main] failed to load about.html", err));

  aboutWin.once("ready-to-show", () => {
    try {
      // Attempt to apply a rectangular window shape (Windows) to eliminate any OS corner rounding
      try {
        // @ts-ignore Electron 30 exposes setShape
        if (typeof (aboutWin as any).setShape === "function") {
          const { width, height } = aboutWin.getBounds();
            // Simple rectangle shape
          (aboutWin as any).setShape([{ x: 0, y: 0, width, height }]);
        }
      } catch {
        // ignore shape errors
      }
      if (parent) {
        const pBounds = parent.getBounds();
        const aBounds = aboutWin.getBounds();
        const x = pBounds.x + Math.round((pBounds.width - aBounds.width) / 2);
        const y =
          pBounds.y + Math.round((pBounds.height - aBounds.height) / 2);
        aboutWin.setPosition(x, y);
      } else {
        aboutWin.center();
      }
    } catch {
      // ignore positioning errors
    }
    aboutWin.show();
  });
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
        {
          label: "Save All Narrative Files",
          accelerator: "CmdOrCtrl+Alt+S",
          click: () => win.webContents.send("file:saveAllNarratives"),
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
        { role: "minimize" },
        { role: "zoom" },
        { role: "togglefullscreen" },
        { type: "separator" },
        {
          label: "Appearance",
          submenu: [
            {
              label: "Light Mode",
              type: "radio",
              enabled: !appearanceDisabled,
              checked: shellState.themeMode === "light" && !shellState.themeId,
              click: () => win.webContents.send("ui:setThemeMode", "light"),
            },
            {
              label: "Dark Mode",
              type: "radio",
              enabled: !appearanceDisabled,
              checked: shellState.themeMode === "dark" && !shellState.themeId,
              click: () => win.webContents.send("ui:setThemeMode", "dark"),
            },
            {
              label: "Auto",
              type: "radio",
              enabled: !appearanceDisabled,
              checked: shellState.themeMode === "auto" && !shellState.themeId,
              click: () => win.webContents.send("ui:setThemeMode", "auto"),
            },
          ],
        },
        {
          label: "Themes",
          submenu: [
            {
              label: "StoryMode Dark",
              type: "radio",
              checked: shellState.themeId === "storymode-dark",
              click: () => win.webContents.send("ui:applyThemePreset", "storymode-dark"),
            },
            { type: "separator" },
            {
              label: "Clear Theme Selection",
              enabled: Boolean(shellState.themeId),
              click: () => win.webContents.send("ui:applyThemePreset", null),
            },
            {
              label: "Manage Themes…",
              enabled: false,
            },
          ],
        },
        { type: "separator" },
        {
          label: "World Browser",
          type: "checkbox",
          checked: !shellState.sidebarCollapsed,
          click: () => win.webContents.send("ui:toggleSidebar"),
        },
        {
          label: "Inspector",
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
        { type: "separator" },
        {
          label: "Reload",
          accelerator: "CmdOrCtrl+R",
          click: () => win.webContents.reload(),
        },
        ...(isDev
          ? [
              {
                label: "Toggle Developer Tools",
                accelerator: process.platform === "darwin" ? "Alt+Cmd+I" : "Ctrl+Shift+I",
                click: () => win.webContents.toggleDevTools(),
              } as MenuItemConstructorOptions,
            ]
          : []),
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
          click: () => openAboutDialog(win),
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


