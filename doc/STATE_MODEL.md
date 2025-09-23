# State Model & Store Contract (Writer-Focused MVP)

StoryMode Desktop keeps all renderer state inside a reusable Zustand store. The shape below reflects the writer-first feature set (world tree, metadata, diagnostics) while still retaining the background compile data needed for engine exports.

## Top-Level Shape
```ts
interface AppState {
  file: FileState;
  parse: ParseState;
  compile: CompileState;
  ui: UIState;
  navigation: NavigationState;
  timings: TimingState;
}
```

## File State
```ts
interface FileState {
  path: string | null;            // Absolute path to active narrative
  content: string;                // Current editor buffer
  lastDiskContent: string;        // Snapshot from last load/save
  isDirty: boolean;               // content !== lastDiskContent
  sizeBytes: number | null;       // For lightweight guardrails
  lastModifiedMs: number | null;  // From fs stats when available
  lineCount?: number;             // Derived for status bar
  fileType?: ''story'' | ''narrative'' | ''unknown'';
  encoding?: string;              // Reserved for future detection
}
```

## Parse State
```ts
interface ParseState {
  version: number;                // Bumps on every attempt (success or failure)
  status: ''idle'' | ''parsing'' | ''ready'' | ''error'';
  ast: unknown | null;            // Structured tree used internally (world tree + metadata)
  tokens: TokenInfo[];            // Token stream for syntax colour + future smarts
  diagnostics: Diagnostic[];      // Issues surfaced to writers
  parseTimeMs: number | null;     // Timing fed into status bar
  error?: string;                 // Transport/unexpected failures
  lastParsedAt: number | null;    // Date.now()
  fileKind?: FileKind;            // story / narrative / unknown
}
```

## Compile State
Even though the UI no longer exposes explicit IR panels, we retain compile output so the menu action can export builds and the status bar can show timings.

```ts
interface CompileState {
  version: number;
  status: ''idle'' | ''compiling'' | ''ready'' | ''error'';
  ir: unknown | null;             // Engine-ready representation
  diagnostics: Diagnostic[];      // Compile diagnostics (for toast/status copy)
  stats: CompileStats | null;     // { irNodeCount, symbolCount, genTimeMs }
  genTimeMs: number | null;       // Convenience alias of stats.genTimeMs
  error?: string;                 // Transport/unexpected failures
  lastCompiledAt: number | null;  // Date.now()
}
```

## Navigation State
```ts
interface NavigationState {
  sceneIndex: SceneMeta[];        // Parsed scene list for explorer + palette
  lastJumpSceneId?: string;       // Recent jump target (for re-focus)
  pendingJump?: string;           // Scene requested while parse in flight
}

interface SceneMeta {
  id: string;
  line: number;                   // 0-based editor line
  title?: string;                 // Optional friendly label
}
```

## UI State
```ts
interface UIState {
  theme: ''light'' | ''dark'';
  activePanel: ''metadata'' | ''diagnostics'';
  parseDebounceMs: number;        // 200 by default
  sidebarView: ''world'';
  sidebarCollapsed: boolean;
  caretLine?: number;
  caretColumn?: number;
}
```

## Timing State
```ts
interface TimingState {
  startupAt: number;              // epoch ms
  lastUserInputAt: number | null;
  lastParseScheduledAt: number | null;
}
```

## Derived Selectors (Examples)
- `hasErrors = parse.diagnostics.some(d => d.severity === ''error'')`
- `sceneCount = navigation.sceneIndex.length`
- `canCompile = parse.status === ''ready'' && !hasErrors`

## Store Actions (Grouped)
```ts
interface StoreActions {
  // File
  openFile(path: string | undefined, content: string, sizeBytes?: number, lastModifiedMs?: number | null): void;
  updateContent(newContent: string): void;
  newFile(): void;
  closeFile(): void;
  markSaved(path?: string): void;
  setFilePath(path: string | null): void;
  updateDerivedFileStats(): void;

  // Parse
  requestParse(): void;
  applyParseResult(result: ParseSuccess): void;

  // Compile
  requestCompile(): void;
  applyCompileResult(result: CompileSuccess): void;

  // Navigation
  setSceneIndex(scenes: SceneMeta[]): void;
  recordJump(sceneId: string): void;

  // UI
  setTheme(theme: ''light'' | ''dark''): void;
  setActivePanel(panel: UIState[''activePanel'']): void;
  toggleSidebar(): void;
  setSidebarView(view: UIState[''sidebarView'']): void;
  setCaret(line: number, column: number): void;

  // Timing
  noteUserInput(): void;
  scheduleParseDebounce(): void;
}
```

## IPC Result Shapes
```ts
interface ParseSuccess {
  ok: true;
  ast: unknown;
  tokens: TokenInfo[];
  diagnostics: Diagnostic[];
  sceneIndex?: SceneMeta[];
  parseTimeMs: number;
  fileKind?: FileKind;
}
interface ParseFailure { ok: false; error: string; diagnostics?: Diagnostic[]; }

interface CompileSuccess {
  ok: true;
  ir: unknown;
  diagnostics: Diagnostic[];
  stats: CompileStats;
  genTimeMs: number;
}
interface CompileFailure { ok: false; error: string; diagnostics?: Diagnostic[]; }
```

## Debounce Logic (Renderer)
- `updateContent` updates the buffer, marks the file dirty, notes user input, and schedules a parse if not already pending.
- When the debounce timer fires, `requestParse()` flips status to `parsing`, kicks IPC, and applies the result.

## Error Resilience
- Parse failures leave the previous good AST/tokens in place so the world tree continues to work, while diagnostics communicate the error state.
- Compile failures surface through diagnostics/status without clearing the last known good IR.

## Persist Strategy (Phase 1)
- No disk persistence. UI preferences are session-only, though limited values may be cached in `localStorage` when available.

---
Updated: 2025-09-24

