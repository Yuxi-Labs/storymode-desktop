import { contextBridge, ipcRenderer } from 'electron';

export const api = {
  openFileDialog: () => ipcRenderer.invoke('file:openDialog'),
  readFile: (path: string) => ipcRenderer.invoke('file:read', { path }),
  parse: (content: string, filename?: string) => ipcRenderer.invoke('parse:run', { content, filename }),
  compile: (content: string, filename?: string) => ipcRenderer.invoke('compile:run', { content, filename }),
  versionInfo: () => ipcRenderer.invoke('app:versionInfo')
};

contextBridge.exposeInMainWorld('storymode', api);

declare global {
  interface Window { storymode: typeof api }
}
