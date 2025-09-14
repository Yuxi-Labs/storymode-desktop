import chokidar, { FSWatcher } from 'chokidar';

export interface WatchHandle { close(): void; }

export function watchFile(path: string, onChange: () => void): WatchHandle {
  const watcher: FSWatcher = chokidar.watch(path, { ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 10 } });
  watcher.on('change', () => onChange());
  return { close: () => watcher.close() };
}
