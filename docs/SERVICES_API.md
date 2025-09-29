# Reusable Service APIs (Draft)

These wrappers normalize outputs from `@yuxilabs/storymode-core` and `@yuxilabs/storymode-compiler` and provide a stable internal contract for Electron IPC.

## detectFileKind
```ts
export type FileKind = 'story' | 'json' | 'unknown';

export interface DetectOptions {
  filename?: string;
  heuristics?: boolean; // if true, attempt simple content-based detection
}

export function detectFileKind(content: string, opts?: DetectOptions): FileKind;
```
Heuristics example (pseudo):
- If filename ends with `.story` => 'story'
- Else if content starts with `{` and parses as JSON => 'json'
- Else 'unknown'

## parseSource
```ts
export interface ParseOptions {
  filename?: string;
  collectTokens?: boolean;   // default true
  collectSceneIndex?: boolean; // default true
}

export interface ParseResult {
  kind: FileKind;
  ast: unknown | null;
  tokens: TokenInfo[];
  diagnostics: Diagnostic[];
  parseTimeMs: number;
  sceneIndex?: SceneMeta[]; // if collected
}

export function parseSource(content: string, options?: ParseOptions): ParseResult;
```
Behavior:
- If kind !== 'story', returns ast=null and diagnostics empty (unless JSON errors) but still tokens if trivial tokenization available.
- Wraps internal exceptions into a single diagnostic of severity=error where possible.

## compileSource
```ts
export interface CompileOptions {
  optimize?: boolean;          // future use; pass-through
  filename?: string;
}

export interface CompileResult {
  ir: unknown | null;
  diagnostics: Diagnostic[];
  stats: CompileStats | null;
  genTimeMs: number;
}

export function compileSource(astOrContent: unknown | string, options?: CompileOptions): CompileResult;
```
Behavior:
- If input is string, calls `parseSource` first; if parse has errors (severity=error) returns early with diagnostics and ir=null.
- If ast incompatible or missing, returns compile diagnostics with error.

## watchFile
```ts
export interface WatchHandle {
  close(): void;
}

export function watchFile(path: string, onChange: () => void): WatchHandle;
```
Implementation notes:
- Use Node's `fs.watch` with debouncing (e.g., 50ms) or `chokidar` if needed for cross-platform stability.
- Avoid duplicate events (write + rename).

## Normalized Types (Imported by Store)
```ts
export interface TokenInfo {
  index: number; type: string; lexeme: string; start: Position; end: Position;
}
export interface Position { line: number; column: number; }
export interface Diagnostic { severity: 'error' | 'warning' | 'info'; message: string; start: Position; end: Position; code?: string; }
export interface SceneMeta { id: string; line: number; title?: string; }
export interface CompileStats { irNodeCount: number; symbolCount: number; genTimeMs: number; }
```

## Error Wrapping Conventions
- Internal thrown error => return object with empty artifacts and diagnostics containing a single severity=error entry referencing stack message (stack omitted from user diagnostics, logged separately).

## IPC Adapter Layer
Main process IPC handlers call these functions and translate results to renderer-friendly envelopes:
```ts
interface IpcEnvelope<T> { ok: boolean; data?: T; error?: string; }
```

## Future Extensions (Phase 2)
- Incremental parse API: `parseIncremental(previousAst, contentDelta)`.
- Workspace-level compile: `compileProject(entryPaths: string[])`.
- Lint service: `lintSource(ast, ruleset)` returns structured rule diagnostics.

---
Draft generated: 2025-09-14
