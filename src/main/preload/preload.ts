// Use CommonJS-style requires so Electron can load this preload without ESM support quirks.
// (Electron still uses require() for preload internally in many setups.)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { contextBridge, ipcRenderer } =
  require("electron") as typeof import("electron");

type CompilePayload =
  | string
  | { content?: string; filename?: string; ast?: unknown; kind?: string };

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
};

// Bridge main menu IPC -> DOM CustomEvents for renderer (contextIsolation safe)
const w: any = (globalThis as any).window || globalThis;
ipcRenderer.on("file:openResult", (_e, payload) => {
  if (w && w.dispatchEvent)
    w.dispatchEvent(
      new CustomEvent("menu:fileOpenResult", { detail: payload }),
    );
});
ipcRenderer.on("ui:toggleTheme", () => {
  if (w && w.dispatchEvent)
    w.dispatchEvent(new CustomEvent("menu:toggleTheme"));
});
ipcRenderer.on("ui:setPanel", (_e, panel) => {
  if (w && w.dispatchEvent)
    w.dispatchEvent(new CustomEvent("menu:setPanel", { detail: panel }));
});
ipcRenderer.on("ui:toggleSidebar", () => {
  if (w && w.dispatchEvent)
    w.dispatchEvent(new CustomEvent("menu:toggleSidebar"));
});
ipcRenderer.on("ui:togglePreview", () => {
  if (w && w.dispatchEvent)
    w.dispatchEvent(new CustomEvent("menu:togglePreview"));
});
ipcRenderer.on("build:recompile", () => {
  if (w && w.dispatchEvent) w.dispatchEvent(new CustomEvent("menu:recompile"));
});
ipcRenderer.on("ui:print", () => {
  if (w && w.dispatchEvent) w.dispatchEvent(new CustomEvent("menu:print"));
});
// File operations from menu
ipcRenderer.on("file:new", () =>
  w.dispatchEvent(new CustomEvent("menu:fileNew")),
);
ipcRenderer.on("file:save", () =>
  w.dispatchEvent(new CustomEvent("menu:fileSave")),
);
ipcRenderer.on("file:saveAs", () =>
  w.dispatchEvent(new CustomEvent("menu:fileSaveAs")),
);
ipcRenderer.on("file:close", () =>
  w.dispatchEvent(new CustomEvent("menu:fileClose")),
);
ipcRenderer.on("file:exportCompiled", () =>
  w.dispatchEvent(new CustomEvent("menu:fileExportCompiled")),
);

try {
  contextBridge.exposeInMainWorld("storymode", api);
  // eslint-disable-next-line no-console
  console.log("[preload] API exposed");
} catch (err) {
  // eslint-disable-next-line no-console
  console.error("[preload] Failed to expose API", err);
}

declare global {
  interface Window {
    storymode: typeof api;
  }
}

export {};
