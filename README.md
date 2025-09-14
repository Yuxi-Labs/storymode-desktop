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
