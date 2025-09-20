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

// Register StoryMode language + theme once Monaco is available (lazy because Monaco loads later)
async function ensureStoryMode() {
  try {
    const monaco: any = await import('monaco-editor');
    if (!monaco.languages.getLanguages().some((l: any) => l.id === 'storymode')) {
      monaco.languages.register({ id: 'storymode', aliases: ['StoryMode', 'storymode'] });
      monaco.languages.setMonarchTokensProvider('storymode', {
        tokenizer: {
          root: [
            [/^::(story|scene|end).*/, 'keyword'],
            [/^@[a-zA-Z0-9_]+:.*/, 'type'],
            [/\{\{[^}]+\}\}/, 'string'],
            [/#[^\n]*/, 'comment']
          ]
        }
      });
      monaco.editor.defineTheme('storymode-dark', {
        base: 'vs-dark', inherit: true,
        rules: [
          { token: 'keyword', foreground: 'd19a66', fontStyle: 'bold' },
          { token: 'type', foreground: '56b6c2' },
          { token: 'string', foreground: 'c678dd' },
          { token: 'comment', foreground: '5c6370', fontStyle: 'italic' }
        ],
        colors: {
          'editor.background': '#0f1214'
        }
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[monacoSetup] StoryMode language init failed', (err as any)?.message);
  }
}

ensureStoryMode();
