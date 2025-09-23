# Storymode Desktop Architecture (Draft - MVP Phase 1)

## Process Model
- Main Process: Window lifecycle, file dialogs, native menus, file system access, external change detection, application state bootstrap.
- Preload Script: Secure IPC bridge exposing a curated API surface to renderer (contextIsolation enabled, no Node globals in renderer).
- Renderer (UI): React (assumed) or lightweight framework; holds ephemeral UI state and subscribes to global store.
- Optional Background (Phase 1 maybe inline): Parsing/compilation performed in main or a worker thread to avoid UI stalls; initial implementation can run parse in main and send structured results.

## IPC Channels (Proposed)
| Channel | Direction | Request Payload | Response Payload | Notes |
|---------|-----------|-----------------|------------------|-------|
| `file:openDialog` | Renderer -> Main | { filters? } | { canceled, path? } | Uses Electron dialog |
| `file:read` | Renderer -> Main | { path } | { ok, error?, content? } | UTF-8 assumed |
| `file:watch` | Renderer -> Main | { path } | { ok } + async event `file:changed` | Maintained in main; events pushed renderer->preload->UI |
| `parse:run` | Renderer -> Main | { path, content, options? } | { ok, error?, ast?, tokens?, diagnostics?, parseTimeMs } | Wraps `@yuxilabs/storymode-core` |
| `compile:run` | Renderer -> Main | { path, ast? or content } | { ok, error?, ir?, diagnostics?, stats?, genTimeMs } | Uses `@yuxilabs/storymode-compiler` |
| `app:versionInfo` | Renderer -> Main | none | { coreVersion, compilerVersion, appVersion } | Cached |
| `nav:sceneIndex` | Renderer -> Main | { path } | { ok, scenes?[] } | May reuse AST; avoid reparse |

Async Event Pushes:
- `file:changed` -> { path }
- Potential: `parse:progress` (future streaming/long tasks) not in MVP.

## Security & Isolation
- `contextIsolation: true`, `nodeIntegration: false` in BrowserWindow.
- Preload exposes a typed `window.storymode` API with only needed methods.
- Validation of all renderer-provided inputs (path must resolve within OS constraints, size checks).

## High-Level Data Flow
1. User triggers open file.
2. Main returns path; renderer asks `file:read`.
3. Renderer sets editor content; debounced parse triggers `parse:run`.
4. Main parses (core) -> sends back structured result.
5. Renderer store updates diagnostics, derived metadata (AST/tokens) and timings.
6. User clicks Compile -> `compile:run` -> IR + stats returned.
7. File change on disk triggers `file:changed` event -> renderer prompts reload.

## Global Store (Renderer) - (See separate State Model doc)
- store.file: { path, content, lastModified? }
- store.parse: { ast, tokens, diagnostics, parseTimeMs, version }
- store.compile: { ir, diagnostics, stats, genTimeMs, status }
- store.ui: { activePanel, theme, panelSizes }

## Module Boundaries
- `main/` : Application bootstrap, IPC handlers, file system + watch.
- `preload/` : Bridge definitions + runtime validation.
- `renderer/` : UI (components, panels, editor wrapper, store).
- `services/` or `core-adapter/` : Thin wrappers around `@yuxilabs/storymode-core` & `@yuxilabs/storymode-compiler` to normalize outputs.
- `types/` : Shared TypeScript interfaces (mirrored between main & renderer via `tsconfig` path mapping or a shared package folder).

## Error Handling Strategy
- All IPC handlers return `{ ok: boolean, ... }`.
- Unexpected exceptions -> `{ ok: false, error: { message, stack? } }` plus logged to console (dev) and file (future phase).

## Performance Considerations
- Debounce in renderer ensures no burst parse calls.
- Potential optimization: maintain last AST and perform incremental parse (Phase 2 if supported by core libs).
- For large files, consider incremental parsing or lightweight outline generation.

## Versioning Data
- Retrieve versions once at startup via `app:versionInfo` to populate status bar.

## Future Expansion Hooks (Phase 2+)
- Worker thread / WebWorker for parsing to keep main lean.
- Multi-file dependency graph manager in main.
- Plugin host channel namespace `plugin:*`.

## Initial Technology Choices (Draft)
- UI: React + Vite + TypeScript.
- Editor: Monaco (provides tokenization & navigation) or CodeMirror 6 (lighter). MVP pick: Monaco for speed of integration.
- State: Zustand minimal store.
- Styling: Tailwind or minimal CSS modules (Decision pending; leaning Tailwind for rapid layout). Tailwind optional if bundle size concern.

## Open Questions
1. Monaco vs CodeMirror trade-off (performance vs customization). Default: Monaco.
2. Should compile run in a dedicated thread day one? (Likely no until proven slow.)
3. Scene index derivation: part of parse result or separate walker? (Prefer part of parse pipeline if available.)

---
Draft Updated: 2025-09-24


