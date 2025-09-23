# Storymode Desktop (MVP Scaffold)

Desktop viewer/editor for Storymode narrative files.

## Quick Start
```cmd
npm install
npm run dev
```
The app window should open after the renderer dev server (Vite) starts.

## Available Scripts
- `npm run dev` â€“ Concurrent dev (main + preload TypeScript watch, Vite renderer, Electron auto-launch).
- `npm run build` â€“ Build main, preload, renderer to `dist/`.
- `npm run package` â€“ Package unsigned desktop app (artifacts in `dist/` or `dist/*` per electron-builder config once added).
- `npm run lint` / `npm run format` â€“ Lint & format sources.

## Directory Overview
See `doc/FOLDER_STRUCTURE.md` for detailed rationale.

Key runtime code:
- `src/main/` â€“ Electron main process, IPC handlers.
- `src/main/preload/` â€“ Secure bridge injected into renderer.
- `src/renderer/` â€“ React UI (panels, editor integration to come).
- `src/services/` â€“ Abstraction wrappers (currently mock implementations).
- `src/shared/` â€“ Shared TypeScript types across contexts.

## IPC (Current Minimal)
- `file:openDialog`
- `file:read`
- `parse:run` (async â€“ dynamically imports `@yuxilabs/storymode-core` then falls back to mock)
- `compile:run` (async â€“ dynamically imports `@yuxilabs/storymode-compiler` then falls back to mock)
- `app:versionInfo`

## Next Steps
1. Enhance parser/compiler adapters if actual library shapes diverge (current assumes `parse` & `compile` signatures).
2. Inline diagnostics + Monaco token coloring once token taxonomy available.
3. Polish writer-facing panels (metadata cards, world navigation UX).
4. File watch + reload prompt using `watchFile` service.
5. Performance instrumentation (parse/compile timing histograms, memory snapshot trigger).

## Documentation
See the `doc/` folder for:
- `MVP_SCOPE.md` â€“ Acceptance criteria.
- `ARCHITECTURE_DRAFT.md` â€“ Process + IPC design.
- `STATE_MODEL.md` â€“ Store contracts.
- `SERVICES_API.md` â€“ Service wrapper specs.
- `DEPENDENCIES_TOOLING.md` â€“ Tooling choices.
- `RISKS_SUCCESS.md` â€“ Risks & metrics.

---
Generated scaffold date: 2025-09-14

## Integration Assumptions & Notes (Async Dynamic Imports)

- `@yuxilabs/storymode-core` expected API: `parse(content, { filename, collectTokens, collectSceneIndex }) -> { ast, tokens?, diagnostics?, sceneIndex?, parseTimeMs? }`. Service validates presence of `parse` and normalizes tokens/diagnostics; on failure logs warning and returns mock parse (tokenized words & heuristic scene index).
- `@yuxilabs/storymode-compiler` expected API: `compile(ast, { optimize }) -> { ir|result, diagnostics?, stats?, genTimeMs? }`. Service chains a real parse if given raw content; fallback builds trivial IR object with token-derived size.
- Dynamic loading now uses native `import()` (async) inside the services; renderer hooks already await IPC responses, so UI remains responsive. If import throws (package missing or mismatch) the fallback executes silently with console warn tag `[parseSource]` / `[compileSource]`.
- No synchronous facade remains; all parse/compile flows are Promise-based end-to-end (renderer hook -> preload ipcRenderer.invoke -> main IPC handler -> async service).
- Renderer TypeScript config (`tsconfig.renderer.json`) needed explicit `types` entries for `react` and `react-dom` because specifying `types` narrows automatic inclusion; without them JSX types were missing.
- ESM (NodeNext) requires explicit `.js` extensions for relative runtime imports. Source imports use `.js` pointing to emitted files (e.g. `../store/store.js`). Vite handles resolution in dev; TypeScript understands this under `moduleResolution: NodeNext`.
- Store implements `file`, `parse`, `compile`, `navigation`, `timings`, and `ui` slices as documented in `doc/STATE_MODEL.md`. Future refactors may split selectors/actions but the shape is current.
- Editor uses Monaco lazily; language is `plaintext` placeholder until Storymode language tokenization integration. Diagnostics are panel-only (no inline squiggles yet) aligning with MVP scope.
- Debounced parse interval defaults to 200ms from state slice; adjust via store (`ui.parseDebounceMs`).
- All IPC calls assume main process handlers return consistent envelopes; error objects are stringified `error.message` only.

### Follow-Up TODO Candidates
- Integrate real token -> Monaco theming & semantic classifications when core exposes token type taxonomy.
- File watch integration with `watchFile` service stub and renderer reload prompt toggle.
- Status bar version info caching and initial load request (currently manual button).
- Enhance world tree navigation (multi-file projects, drag-and-drop ordering).





