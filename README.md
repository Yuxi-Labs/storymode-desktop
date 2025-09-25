# Storymode Desktop (MVP Scaffold)

Desktop environment for authoring StoryMode narrative worlds.

## Quick Start
```cmd
npm install
npm run dev
```
The app window opens after the renderer dev server (Vite) is ready.

## Available Scripts
- `npm run dev` – Concurrent dev (main + preload TypeScript watch, Vite renderer, Electron auto-launch).
- `npm run build` – Build main, preload, renderer to `dist/`.
- `npm run package` – Package unsigned desktop app (artifacts in `dist/`).
- `npm run lint` / `npm run format` – Lint & format sources.

## Shell Overview (September 2025 refresh)
- **Menu bar** now reflects StoryMode concepts: File menu manages stories, narratives, preview, printing, and settings. Edit surfaces writer actions (select line/block, comment). View separates Light/Dark/Auto appearance from installable themes and exposes panel toggles. Tools hosts AI/Git placeholders and update checks. Help links to docs/support plus the redesigned About dialog.
- **World browser** replaces the generic explorer. Stories, narratives, and scenes appear in a structured tree; entries are keyboard-accessible.
- **Integrated welcome** page uses panels instead of floating cards, guiding writers through story-oriented actions.
- **Preview** runs in place of the editor. Toggled via File → Preview Story or the status controls; state is synced to the menu.
- **Inspector** defaults to metadata and diagnostics, with panel visibility controlled from the View menu.
- **Status bar** now reports story context (document type, encoding, scene count, diagnostics) and restores the notification bell placeholder for system alerts.
- **Themes**: Light/Dark/Auto modes coexist with installable presets (StoryMode Dark ships by default). The renderer syncs theme state back to Electron for accurate menu checkmarks.
- **Update, Git, AI** integration points are stubbed with IPC hooks so the backend services can attach without further shell surgery.

## Directory Overview
See `doc/FOLDER_STRUCTURE.md` for rationale.

Key runtime code:
- `src/main/` – Electron main process, menu + IPC glue.
- `src/main/preload/` – Secure bridge injected into renderer.
- `src/renderer/` – React UI (panels, editor integration, preview renderer).
- `src/services/` – Abstraction wrappers (parser/compiler adapters).
- `src/shared/` – Shared TypeScript types.

## IPC (Current Minimal)
- `file:openDialog`
- `file:read`
- `file:write`
- `file:saveAsDialog`
- `parse:run`
- `compile:run`
- `app:versionInfo`
- `ui:shellState` (renderer → main shell sync)

## Next Steps
1. Wire AI writing/coding panels to hosted services.
2. Implement auto-update handshake using the new `app:checkForUpdates` IPC event.
3. Flesh out Git integration in `tools:versionControl`.
4. Extend preview to use compiled output once production formatter is ready.
5. Add status notifications feed behind the bell icon.

## Documentation
See the `doc/` folder for:
- `MVP_SCOPE.md` – Acceptance criteria.
- `ARCHITECTURE_DRAFT.md` – Process + IPC design.
- `STATE_MODEL.md` – Store contracts.
- `SERVICES_API.md` – Service wrapper specs.
- `DEPENDENCIES_TOOLING.md` – Tooling choices.
- `RISKS_SUCCESS.md` – Risks & metrics.

---
Generated scaffold date: 2025-09-14 (UI refresh 2025-09-24)
