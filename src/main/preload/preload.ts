// Use CommonJS-style requires so Electron can load this preload without ESM support quirks.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { contextBridge, ipcRenderer } =
  require("electron") as typeof import("electron");

type CompilePayload =
  | string
  | { content?: string; filename?: string; ast?: unknown; kind?: string };

type ShellSyncState = {
  previewVisible?: boolean;
  inspectorVisible?: boolean;
  statusBarVisible?: boolean;
  sidebarCollapsed?: boolean;
  themeMode?: "light" | "dark" | "auto";
  themeId?: string | null;
};

const api = {
  openFileDialog: () => ipcRenderer.invoke("file:openDialog"),
  readFile: (path: string) => ipcRenderer.invoke("file:read", { path }),
  parse: (content: string, filename?: string) =>
    ipcRenderer.invoke("parse:run", { content, filename }),
  compile: (input: CompilePayload) => {
    if (typeof input === "string") {
      return ipcRenderer.invoke("compile:run", { content: input });
    }
    return ipcRenderer.invoke("compile:run", input ?? {});
  },
  versionInfo: () => ipcRenderer.invoke("app:versionInfo"),
  writeFile: (path: string, content: string) =>
    ipcRenderer.invoke("file:write", { path, content }),
  saveAsDialog: () => ipcRenderer.invoke("file:saveAsDialog"),
  syncShellState: (state: ShellSyncState) =>
    ipcRenderer.send("ui:shellState", state),
  explorerContextMenu: (payload: { id: string; type: 'story'|'narrative'|'scene'; narrativeId?: string; sceneId?: string; title?: string; }) =>
    ipcRenderer.send('explorer:contextMenu', payload),
};

const w: any = (globalThis as any).window || globalThis;
const emit = (name: string, detail?: unknown) => {
  if (!w || !w.dispatchEvent) return;
  w.dispatchEvent(new CustomEvent(name, { detail }));
};

ipcRenderer.on("file:openResult", (_e, payload) => emit("menu:fileOpenResult", payload));
ipcRenderer.on("file:newStory", () => emit("menu:newStory"));
ipcRenderer.on("file:saveStory", () => emit("menu:saveStory"));
ipcRenderer.on("file:saveStoryAs", () => emit("menu:saveStoryAs"));
ipcRenderer.on("file:saveAllNarratives", () => emit("menu:saveAllNarratives"));
ipcRenderer.on("file:closeStory", () => emit("menu:closeStory"));

ipcRenderer.on("ui:togglePreview", () => emit("menu:togglePreview"));
ipcRenderer.on("ui:toggleInspector", () => emit("menu:toggleInspector"));
ipcRenderer.on("ui:toggleStatusBar", () => emit("menu:toggleStatusBar"));
ipcRenderer.on("ui:toggleSidebar", () => emit("menu:toggleSidebar"));
ipcRenderer.on("ui:setThemeMode", (_e, mode) => emit("menu:setThemeMode", mode));
ipcRenderer.on("ui:applyThemePreset", (_e, themeId) =>
  emit("menu:applyThemePreset", themeId),
);
ipcRenderer.on("ui:print", () => emit("menu:print"));
ipcRenderer.on("build:recompile", () => emit("menu:recompile"));


ipcRenderer.on("help:requestSupport", () => emit("menu:requestSupport"));
ipcRenderer.on("help:reportBug", () => emit("menu:reportBug"));
ipcRenderer.on("help:requestFeature", () => emit("menu:requestFeature"));
ipcRenderer.on("app:openSettings", () => emit("menu:openSettings"));
ipcRenderer.on("app:checkForUpdates", () => emit("menu:checkForUpdates"));
ipcRenderer.on("app:openAbout", () => emit("menu:openAbout"));

ipcRenderer.on('explorer:renameResult', (_e, data) => emit('explorer:renameResult', data));
ipcRenderer.on('explorer:deleteScene', (_e, data) => emit('explorer:deleteScene', data));
ipcRenderer.on('explorer:requestRename', (_e, data) => emit('explorer:requestRename', data));
ipcRenderer.on('explorer:requestDeleteScene', (_e, data) => emit('explorer:requestDeleteScene', data));
ipcRenderer.on('explorer:addNarrative', () => emit('explorer:addNarrative'));
ipcRenderer.on('explorer:addScene', (_e, data) => emit('explorer:addScene', data));
ipcRenderer.on('explorer:deleteNarrative', (_e, data) => emit('explorer:deleteNarrative', data));

try {
  contextBridge.exposeInMainWorld("storymode", api);
  console.log("[preload] API exposed");
} catch (err) {
  console.error("[preload] Failed to expose API", err);
}

declare global {
  interface Window {
    storymode: typeof api;
  }
}

export {};
