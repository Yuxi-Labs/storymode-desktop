// Use CommonJS-style requires so Electron can load this preload without ESM support quirks.
// (Electron still uses require() for preload internally in many setups.)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { contextBridge, ipcRenderer } = require('electron') as typeof import('electron');

const api = {
  openFileDialog: () => ipcRenderer.invoke('file:openDialog'),
  readFile: (path: string) => ipcRenderer.invoke('file:read', { path }),
  parse: (content: string, filename?: string) => ipcRenderer.invoke('parse:run', { content, filename }),
  compile: (content: string, filename?: string) => ipcRenderer.invoke('compile:run', { content, filename }),
  versionInfo: () => ipcRenderer.invoke('app:versionInfo')
};

// Bridge main menu IPC -> DOM CustomEvents for renderer (contextIsolation safe)
const w: any = (globalThis as any).window || globalThis;
ipcRenderer.on('file:openResult', (_e, payload) => {
  if (w && w.dispatchEvent) w.dispatchEvent(new CustomEvent('menu:fileOpenResult', { detail: payload }));
});
ipcRenderer.on('ui:toggleTheme', () => {
  if (w && w.dispatchEvent) w.dispatchEvent(new CustomEvent('menu:toggleTheme'));
});
ipcRenderer.on('ui:setPanel', (_e, panel) => {
  if (w && w.dispatchEvent) w.dispatchEvent(new CustomEvent('menu:setPanel', { detail: panel }));
});
ipcRenderer.on('build:recompile', () => {
  if (w && w.dispatchEvent) w.dispatchEvent(new CustomEvent('menu:recompile'));
});

try {
  contextBridge.exposeInMainWorld('storymode', api);
  // eslint-disable-next-line no-console
  console.log('[preload] API exposed');
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('[preload] Failed to expose API', err);
}

declare global {
  interface Window { storymode: typeof api }
}

export {};
