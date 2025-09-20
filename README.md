# Storymode Desktop (MVP Scaffold)

Desktop viewer/editor for Storymode narrative files.

## Quick Start
```cmd
npm install
npm run dev
```
The app window should open after the renderer dev server (Vite) starts.

## Available Scripts
- `npm run dev` – Concurrent dev (main + preload TypeScript watch, Vite renderer, Electron auto-launch).
- `npm run build` – Build main, preload, renderer to `dist/`.
- `npm run package` – Package unsigned desktop app (artifacts in `dist/` or `dist/*` per electron-builder config once added).
- `npm run lint` / `npm run format` – Lint & format sources.

## Directory Overview
See `doc/FOLDER_STRUCTURE.md` for detailed rationale.

Key runtime code:
- `src/main/` – Electron main process, IPC handlers.
- `src/main/preload/` – Secure bridge injected into renderer.
- `src/renderer/` – React UI (panels, editor integration to come).
- `src/services/` – Abstraction wrappers (currently mock implementations).
- `src/shared/` – Shared TypeScript types across contexts.

## IPC (Current Minimal)
- `file:openDialog`
- `file:read`
- `parse:run` (async – dynamically imports `@yuxilabs/storymode-core` then falls back to mock)
- `compile:run` (async – dynamically imports `@yuxilabs/storymode-compiler` then falls back to mock)
- `app:versionInfo`

## Next Steps
1. Enhance parser/compiler adapters if actual library shapes diverge (current assumes `parse` & `compile` signatures).
2. Inline diagnostics + Monaco token coloring once token taxonomy available.
3. Implement richer AST/IR visualizations (tree diff, symbol tables).
4. File watch + reload prompt using `watchFile` service.
5. Performance instrumentation (parse/compile timing histograms, memory snapshot trigger).

## Documentation
See the `doc/` folder for:
- `MVP_SCOPE.md` – Acceptance criteria.
- `ARCHITECTURE_DRAFT.md` – Process + IPC design.
- `STATE_MODEL.md` – Store contracts.
- `SERVICES_API.md` – Service wrapper specs.
- `DEPENDENCIES_TOOLING.md` – Tooling choices.
- `RISKS_SUCCESS.md` – Risks & metrics.

---
Generated scaffold date: 2025-09-14

## Integration Assumptions & Notes (Async Dynamic Imports)

- `@yuxilabs/storymode-core` expected API: `parse(content, { filename, collectTokens, collectSceneIndex }) -> { ast, tokens?, diagnostics?, sceneIndex?, parseTimeMs? }`. Service validates presence of `parse` and normalizes tokens/diagnostics; on failure logs warning and returns mock parse (tokenized words & heuristic scene index).
- `@yuxilabs/storymode-compiler` expected API: `compile(ast, { optimize }) -> { ir|result, diagnostics?, stats?, genTimeMs? }`. Service chains a real parse if given raw content; fallback builds trivial IR object with token-derived size.
- Dynamic loading now uses native `import()` (async) inside the services; renderer hooks already await IPC responses, so UI remains responsive. If import throws (package missing or mismatch) the fallback executes silently with console warn tag `[parseSource]` / `[compileSource]`.
- No synchronous facade remains; all parse/compile flows are Promise-based end-to-end (renderer hook -> preload ipcRenderer.invoke -> main IPC handler -> async service).
- Renderer TypeScript config (`tsconfig.renderer.json`) needed explicit `types` entries for `react` and `react-dom` because specifying `types` narrows automatic inclusion; without them JSX types were missing.
- ESM (NodeNext) requires explicit `.js` extensions for relative runtime imports. Source imports use `.js` pointing to emitted files (e.g. `../store/store.js`). Vite handles resolution in dev; TypeScript understands this under `moduleResolution: NodeNext`.
- Store currently implements only `file`, `parse`, and minimal `ui` slices; other slices (compile, navigation, timings) described in `doc/STATE_MODEL.md` are deferred.
- Editor uses Monaco lazily; language is `plaintext` placeholder until Storymode language tokenization integration. Diagnostics are panel-only (no inline squiggles yet) aligning with MVP scope.
- Debounced parse interval defaults to 200ms from state slice; adjust via store (`ui.parseDebounceMs`).
- All IPC calls assume main process handlers return consistent envelopes; error objects are stringified `error.message` only.

### Follow-Up TODO Candidates
- Integrate real token -> Monaco theming & semantic classifications when core exposes token type taxonomy.
- Add IR panel & AST tree components (current code only has diagnostics + editor).
- File watch integration with `watchFile` service stub and renderer reload prompt toggle.
- Status bar version info caching and initial load request (currently manual button).

