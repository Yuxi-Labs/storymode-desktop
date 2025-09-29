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

## Shell Overview (MVP Scope)
- **Menu bar**: Minimal File (New Story), View (Themes: Auto / Light Mode / Dark Mode; Panels: Sidebar, Details Panel, Status Bar; Window controls), Help (About).
- **Explorer Sidebar**: Shows current story hierarchy after creating a new story (Story → Untitled Narrative → Untitled Scene 1).
- **Welcome View**: Displayed until a story is created.
- **Preview / Advanced Panels**: Future features; currently only core panels listed above are togglable.
- **Themes**: Single radio group (Auto adapts to system, Light Mode, Dark Mode). Plugin themes may append later.
- **About Dialog**: Draggable anywhere, single top close button.

## Directory Overview
See `docs/FOLDER_STRUCTURE.md` for rationale.

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
See the `docs/` folder for:
- `MVP_SCOPE.md` – Acceptance criteria.
- `ARCHITECTURE_DRAFT.md` – Process + IPC design.
- `STATE_MODEL.md` – Store contracts.
- `SERVICES_API.md` – Service wrapper specs.
- `DEPENDENCIES_TOOLING.md` – Tooling choices.
- `RISKS_SUCCESS.md` – Risks & metrics.
- `STORYMODE_SPEC.md` – Canonical product behavior (scaffolding, menus, theming).

---
Generated scaffold date: 2025-09-14 (UI refresh 2025-09-24)

<!-- Visual regression / About dialog infrastructure was removed. -->
