// Monaco worker configuration using Vite's ?worker bundling.
// Eliminates blob: URL workers so CSP can stay strict (no 'blob:' needed).
// Only import the generic editor worker and a couple of language-specific ones as needed.

// These imports are tree-shaken to only include referenced workers.
// eslint-disable-next-line import/no-duplicates
// @ts-ignore - Vite provides proper typing for ?worker but TS may not have declaration here
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
// Add more language workers when integrating advanced language features.

// Expose MonacoEnvironment globally (renderer window context) so Monaco can spawn workers.
(globalThis as any).MonacoEnvironment = {
  getWorker(_moduleId: string, label: string) {
    // Map label to appropriate worker instance; extend as additional languages are added.
    switch (label) {
      default:
        return new EditorWorker();
    }
  }
};
