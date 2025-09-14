# Storymode Desktop MVP Scope (Phase 1)

Target Platforms: Windows 10+, macOS 12+, Ubuntu 22.04+ (x64 primary; ARM64 opportunistic)
Electron Target: >=32.x (Node 20 runtime)

## Acceptance Criteria

### 1. Open Local File
- User opens a single narrative file via menu (File > Open) or Ctrl/Cmd+O.
- Only one active file context at a time (replaces previous).
- No persistence of recent files (in-memory path reference only).
- Reject files >5MB with a clear non-blocking dialog.

### 2. Editor Pane
- Editing enabled (standard undo/redo, copy/paste, find).
- Monospaced font, line numbers, soft wrap off by default.
- Basic token-level syntax coloring (using tokens from `@yuxilabs/storymode-core`).
- Debounced parse: 200ms after last change OR immediately on file load.

### 3. Parsing & Diagnostics
- On parse success: store { ast, tokens, parseTimeMs }.
- On parse errors: diagnostics include { severity, message, startLine, startCol, endLine, endCol }.
- Diagnostics panel refresh occurs within 300ms after debounce completes.
- Status bar shows: `Parse: <X ms> | Errors: <n> | Warnings: <m> | Compiler v<semver>`.

### 4. AST Panel
- Toggleable side panel (collapsed by default configurable later).
- Tree view with expand/collapse; virtualization when node count > 1000.

### 5. IR Panel / Compile Action
- Manual `Compile` button triggers IR generation using `@yuxilabs/storymode-compiler`.
- If compile diagnostics exist, IR panel shows placeholder: *"IR unavailable due to compile errors"*.
- Displays stats: { irNodeCount, symbolCount, genTimeMs }.

### 6. Tokens View
- Optional toggle (e.g. via View menu or side tab) showing table: index | type | lexeme (truncated) | line:col span.

### 7. File Watching
- External disk changes prompt modal: *"File changed on disk. Reload? (Reload / Ignore)"*.
- If reloaded, editor content replaced and parse retriggered.

### 8. Performance
- Parse of a 1,000-line typical narrative file under 750ms on mid-tier laptop (soft goal; warn in dev console if exceeded).
- UI thread remains responsive during parse/compile (work moved off to background when needed).

### 9. Theming
- Light/Dark toggle (status bar icon + menu). In-memory only (no persistence yet).

### 10. Navigation
- Quick scene jump: Ctrl/Cmd+J opens palette; entering scene ID scrolls cursor to its line (requires parser-provided scene index; fallback regex if parse fails TBD).

### 11. Accessibility & UX
- Keyboard focus switching: Ctrl/Cmd+1 Editor, 2 Diagnostics, 3 AST, 4 IR.
- Minimum window size: 1024x640.
- Panels dock left/right; resizing persists only in memory.

### 12. Error Handling & Stability
- Parser/compile exceptions caught; IPC response returns { ok: false, error } instead of crashing renderer.
- Uncaught main-process errors logged with stack and non-fatal where possible.

### 13. Packaging / Dev Experience
- Dev run: `npm run dev` starts main + renderer with hot reload (renderer) and auto-restart (main).
- Basic build script stub (e.g. `npm run build:app`) producing unsigned artifacts.

## Explicit Exclusions (Phase 1)
- Multi-file projects / include graphs.
- Auto-compile on every clean parse (manual only for now).
- Persistent recent files list.
- Plugin/extension system.
- Graph visualization (IR/AST diagrams).
- Inline squiggle annotations inside editor (panel-only diagnostics).
- Semantic highlighting beyond token class coloring.
- User preferences persistence (disk) beyond session memory.
- Auto-update / publishing pipeline.
- Guaranteed ARM64 builds (attempt if trivial, else Phase 2).

## Open Decisions
1. Scene ID fallback strategy if parse fails (regex vs disabled navigation).
2. IR viewer format (current plan: pretty-printed JSON with collapsible sections; raw download optional?).
3. File size limit (5MB) adjust if typical narratives exceed.
4. Potential worker thread for parse to keep renderer ultra-light (investigate after baseline done).

## Dependencies to Leverage
- `@yuxilabs/storymode-core` (tokens, parsing utilities).
- `@yuxilabs/storymode-compiler` (IR generation, stats).

## Success Metrics (MVP)
- Open + parse + display diagnostics under 2s from cold start.
- >=95% of test narrative files parse without UI hitching.
- Manual compile succeeds on valid file producing IR viewable.
- No renderer crashes during 30-minute editing session test.

---
Generated: 2025-09-14
