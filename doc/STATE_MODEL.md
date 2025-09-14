# State Model & Store Contract (MVP)

Primary store implemented in renderer via Zustand (or similar minimal observable). All state slices are serializable (except editor instance refs kept outside store).

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
  path: string | null;            // Absolute path
  content: string;                // Current in-editor text
  lastDiskContent: string;        // Last content loaded from disk (for dirty check)
  isDirty: boolean;               // content !== lastDiskContent
  sizeBytes: number | null;       // For threshold warnings
  lastModifiedMs: number | null;  // From fs stats if available
}
```

## Parse State
```ts
interface ParseState {
  version: number;                // Increment each successful parse attempt (even if errors)
  status: 'idle' | 'parsing' | 'ready' | 'error';
  ast: unknown | null;            // Structured AST from core
  tokens: TokenInfo[];            // Flattened tokens list
  diagnostics: Diagnostic[];      // Parse diagnostics
  parseTimeMs: number | null;     // Timing for last parse
  error?: string;                 // Transport or unexpected error message
  lastParsedAt: number | null;    // Date.now()
}

interface TokenInfo {
  index: number;
  type: string;
  lexeme: string;
  start: Position;
  end: Position;
}

interface Position { line: number; column: number; }

interface Diagnostic {
  severity: 'error' | 'warning' | 'info';
  message: string;
  start: Position;
  end: Position;
  code?: string;                  // Optional rule or parser code
}
```

## Compile State
```ts
interface CompileState {
  status: 'idle' | 'compiling' | 'ready' | 'error';
  ir: unknown | null;             // IR object
  diagnostics: Diagnostic[];      // Compile diagnostics
  stats: CompileStats | null;     // { irNodeCount, symbolCount, genTimeMs }
  genTimeMs: number | null;       // Convenience alias of stats.genTimeMs
  error?: string;                 // Transport/unexpected error
  lastCompiledAt: number | null;  // Date.now()
}

interface CompileStats {
  irNodeCount: number;
  symbolCount: number;
  genTimeMs: number;
}
```

## Navigation State
```ts
interface NavigationState {
  sceneIndex: SceneMeta[];        // Extracted from AST or compile IR
  lastJumpSceneId?: string;       // For re-focus
  pendingJump?: string;           // Scene requested while parse in-flight
}

interface SceneMeta {
  id: string;
  line: number;                   // 0-based line for editor scroll
  title?: string;                 // Optional human label
}
```

## UI State
```ts
interface UIState {
  theme: 'light' | 'dark';
  activePanel: 'editor' | 'diagnostics' | 'ast' | 'ir' | 'tokens';
  panelVisibility: { ast: boolean; ir: boolean; diagnostics: boolean; tokens: boolean; };
  panelSizes: { left: number; right: number; bottom: number };  // Pixel or ratio
  showReloadPrompt: boolean;      // File changed on disk
  parseDebounceMs: number;        // Config (200 default)
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
- `isParsable = file.content.length <= MAX_CONTENT && !file.path?.endsWith('.bin')`
- `hasErrors = parse.diagnostics.some(d => d.severity === 'error')`
- `canCompile = parse.status === 'ready' && !hasErrors`

## Store Actions (Grouped)
```ts
interface StoreActions {
  // File
  openFile(path: string, content: string, sizeBytes: number, lastModifiedMs: number | null): void;
  updateContent(newContent: string): void;
  markDiskSync(): void; // set lastDiskContent = content; isDirty=false

  // Parse
  requestParse(): void; // sets status=parsing if not already
  applyParseResult(result: ParseSuccess | ParseFailure): void;

  // Compile
  requestCompile(): void; // sets status=compiling
  applyCompileResult(result: CompileSuccess | CompileFailure): void;

  // Navigation
  setSceneIndex(scenes: SceneMeta[]): void;
  requestJump(sceneId: string): void;
  confirmJump(sceneId: string): void; // after editor positions

  // UI
  setTheme(theme: 'light' | 'dark'): void;
  setActivePanel(panel: UIState['activePanel']): void;
  togglePanel(name: keyof UIState['panelVisibility']): void;
  setPanelSize(which: keyof UIState['panelSizes'], value: number): void;
  setReloadPrompt(show: boolean): void;

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
  parseTimeMs: number;
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
- On `updateContent`, store updates content, sets `file.isDirty` and schedules parse if not already waiting.
- If a parse is already pending (timer), reset timer; else set `scheduleParseDebounce()` timestamp.
- When timer fires: `requestParse()` -> IPC -> `applyParseResult()`.

## Error Resilience
- If parse fails unexpectedly (transport), keep last good AST/tokens but set status=error and show diagnostics panel message.
- If compile fails, keep previous IR available until replaced; show error banner in IR panel.

## Minimal Persist Strategy (Phase 1)
- No disk persistence; store resets on app restart.

---
Generated: 2025-09-14
