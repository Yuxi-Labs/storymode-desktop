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
      monaco.languages.register({ id: 'storymode', extensions: ['.story', '.narrative'], aliases: ['StoryMode', 'storymode'] });
      // Monarch tokenizer with more granular scopes
      monaco.languages.setMonarchTokensProvider('storymode', {
        defaultToken: '',
        tokenizer: {
          root: [
            // Directives
            [/^(::story:)(\s+)([a-zA-Z0-9_]+)/, ['keyword.directive', 'white', 'identifier.story']],
            [/^(::narrative:)(\s+)([a-zA-Z0-9_]+)/, ['keyword.directive','white','identifier.narrative']],
            [/^(::scene:)(\s+)([a-zA-Z0-9_]+)/, ['keyword.directive','white','identifier.scene']],
            [/^(::end:)(\s*)(\{\{)([^}]+)(\}\})/, ['keyword.directive','white','delimiter.brace','identifier.handle','delimiter.brace']],
            [/^(::goto:)(\s*)(\{\{)([^}]+)(\}\})/, ['keyword.flow','white','delimiter.brace','identifier.handle','delimiter.brace']],
            // Future directives (::choice:, ::lore:) omitted until added to canonical spec
            // Metadata lines (indented allowed) including @flag (handled uniformly)
            [/^\s*@[a-zA-Z0-9_]+:(?=\s)/, 'meta.key'],
            // Character declaration [[ Name ]]
            [/^\s*\[\[[^\]]+\]\]/, 'entity.character'],
            // Dialogue line starting with straight quote
            [/^\s*".*"\s*$/, 'string.dialogue'],
            // Cue / action lines
            [/^\s*>>.*$/, 'keyword.cue'],
            // Effect / media cues
            [/^\s*!!:/, 'keyword.sfx'],
            [/^\s*\*\*:/, 'keyword.vfx'],
            [/^\s*~~:/, 'keyword.music'],
            [/^\s*<>:/, 'keyword.camera'],
            // List literal
            [/\[\s*[a-zA-Z0-9_,\s]+\]/, 'array.literal'],
            // Handle inline reference
            [/\{\{[^}]+\}\}/, 'identifier.handle'],
            // Footnotes
            [/^\s*(###|\/\/\/).*/, 'comment.footnote'],
            // Comments
            [/^\s*#.*$/, 'comment'],
            [/^\s*\/\/.*$/, 'comment'],
            [/\/\*[\s\S]*?\*\//, 'comment.block'],
          ]
        }
      });
      monaco.editor.defineTheme('storymode-dark', {
        base: 'vs-dark', inherit: true,
        rules: [
          { token: 'keyword.directive', foreground: 'd19a66', fontStyle: 'bold' },
          { token: 'keyword.flow', foreground: 'c678dd', fontStyle: 'bold' },
          { token: 'keyword.meta', foreground: '61afef', fontStyle: 'bold' },
          { token: 'keyword.cue', foreground: 'e5c07b' },
            { token: 'keyword.sfx', foreground: 'e06c75' },
            { token: 'keyword.vfx', foreground: '56b6c2' },
            { token: 'keyword.music', foreground: '98c379' },
            { token: 'keyword.camera', foreground: 'be5046' },
          { token: 'meta.key', foreground: '56b6c2' },
          { token: 'entity.character', foreground: 'e5c07b', fontStyle: 'bold' },
          { token: 'string.dialogue', foreground: 'abb2bf' },
          { token: 'identifier.handle', foreground: 'c678dd' },
          { token: 'array.literal', foreground: 'c678dd' },
          { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
          { token: 'comment.footnote', foreground: '5c6370', fontStyle: 'italic underline' },
          { token: 'comment.block', foreground: '5c6370', fontStyle: 'italic' },
        ],
        colors: { 'editor.background': '#0f1214' }
      });

      // Hover provider
      const HOVER_MAP: Record<string, { title: string; detail: string; }> = {
        '::story:': { title: 'Story Directive', detail: 'Declares the root story container. Only one allowed.' },
        '::narrative:': { title: 'Narrative Directive', detail: 'Defines a narrative arc grouping scenes.' },
        '::scene:': { title: 'Scene Directive', detail: 'Begins a scene block; contains @title and content lines.' },
        '::end:': { title: 'End Directive', detail: 'Marks the logical end of a story, narrative, or scene context.' },
        '::goto:': { title: 'Goto Directive', detail: 'Redirect / jump to another scene handle.' },
  // Future directive hovers intentionally omitted
        '@title:': { title: 'Title Metadata', detail: 'Human-readable title bound to the preceding directive.' },
        '@flag:': { title: 'Flag Metadata', detail: 'Declares a state or narrative flag (future validation).' },
        '!!:': { title: 'Sound Effect Cue', detail: 'Triggers / annotates a sound effect sequence.' },
        '**:': { title: 'Visual Effect Cue', detail: 'Triggers / annotates a visual effect sequence.' },
        '~~:': { title: 'Music Cue', detail: 'Starts or transitions background music/ambience.' },
        '<>:': { title: 'Camera Cue', detail: 'Indicates a cinematic / framing instruction.' },
        '>>': { title: 'Cue Line', detail: 'Action or performance beat description.' }
      };

      monaco.languages.registerHoverProvider('storymode', {
        provideHover(model: any, position: any) {
          const line = model.getLineContent(position.lineNumber);
          // Find token prefix at current column (simple scan)
          const keys = Object.keys(HOVER_MAP);
          const found = keys.find(k => line.trimStart().startsWith(k));
          if (!found) return null;
          const item = HOVER_MAP[found];
          return {
            range: new monaco.Range(position.lineNumber, 1, position.lineNumber, line.length + 1),
            contents: [
              { value: `**${item.title}**` },
              { value: item.detail },
              { value: '\n*StoryMode DSL – hover help*' }
            ]
          };
        }
      });

      // Completion provider (basic directives & metadata)
      const directiveSuggestions = [ '::story:', '::narrative:', '::scene:', '::end:', '::goto:' ];
      const metadataSuggestions = ['@title:', '@flag:', '@authors:', '@copyright_holder:', '@address:', '@email:', '@phone:', '@start:'];
      monaco.languages.registerCompletionItemProvider('storymode', {
        triggerCharacters: [':', '@', '{'],
        provideCompletionItems(model: any, position: any) {
          const line = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
            const trimmed = line.trimStart();
            const suggestions: any[] = [];
            if (trimmed.startsWith('::') || trimmed === '' || trimmed === ':') {
              suggestions.push(...directiveSuggestions.map(label => ({
                label,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: label + ' ',
                detail: 'Directive'
              })));
            }
            if (trimmed.startsWith('@') || trimmed === '' || trimmed === '@') {
              suggestions.push(...metadataSuggestions.map(label => ({
                label,
                kind: monaco.languages.CompletionItemKind.Property,
                insertText: label + ' ',
                detail: 'Metadata key'
              })));
            }
            // Scene handle reference suggestions for ::goto: {{ ... }}
            if (/::goto:\s*\{\{[^}]*$/.test(line)) {
              // Basic heuristic: scan model for scene declarations
              const text = model.getValue();
              const sceneMatches = Array.from(text.matchAll(/^::scene:\s+([a-zA-Z0-9_]+)/gm)) as RegExpMatchArray[];
              const sceneIds = sceneMatches.map(m => m[1]);
              suggestions.push(...sceneIds.map(id => ({
                label: id,
                kind: monaco.languages.CompletionItemKind.Reference,
                insertText: id,
                detail: 'Scene ID'
              })));
            }
            return { suggestions };
        }
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[monacoSetup] StoryMode language init failed', (err as any)?.message);
  }
}

ensureStoryMode();
