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
- `parse:run` (mock for now)
- `compile:run` (mock for now)
- `app:versionInfo`

## Next Steps
1. Replace mock parse/compile with real `@yuxilabs/storymode-core` / `@yuxilabs/storymode-compiler` integration.
2. Add editor component (Monaco) and wire debounced parse.
3. Implement diagnostics, AST, IR panels.
4. File watch + reload prompt.
5. Theme toggle + status bar metrics.

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

## Integration Assumptions & Notes (Added During Editor Wiring)

- `@yuxilabs/storymode-core` presumed to expose a `parse(content, options)` function returning `{ ast, tokens?, diagnostics?, parseTimeMs?, sceneIndex? }`. The service layer wraps this dynamically; if the shape differs it gracefully falls back to a mock implementation and logs a console warning.
- `@yuxilabs/storymode-compiler` presumed to expose `compile(ast, options)` returning `{ ir, diagnostics?, stats?, genTimeMs? }`. Fallback path builds a mock IR from token count.
- Dynamic `require` is performed via `eval('require')` to avoid bundler static analysis issues and permit absence during early scaffolding.
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

