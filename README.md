<p align="center">
	<img src="assets/images/logos/storymode-logo.png" alt="StoryMode" width="140"/>
</p>

# StoryMode Desktop

<p>
  <img src="https://img.shields.io/github/v/release/Yuxi-Labs/storymode-desktop?include_prereleases&sort=semver" alt="Latest Release" />
  <img src="https://img.shields.io/github/issues/Yuxi-Labs/storymode-desktop" alt="Open Issues" />
  <img src="https://img.shields.io/github/issues-pr/Yuxi-Labs/storymode-desktop" alt="Pull Requests" />
  <img src="https://img.shields.io/github/last-commit/Yuxi-Labs/storymode-desktop" alt="Last Commit" />
  <img src="https://img.shields.io/github/contributors/Yuxi-Labs/storymode-desktop" alt="Contributors" />
  <img src="https://img.shields.io/badge/License-MIT-orange.svg" alt="License: MIT" />
</p>

Authoring environment for structured narrative worlds (Stories → Narratives → Scenes) with live parsing, compilation, localization, and transparent telemetry.

## Status
Version: 0.3.0. Core authoring, Chinese localization, theming, structured story model, and local telemetry are implemented. Remote telemetry sharing is scaffolded but disabled by default.

## What’s New in 0.3.0 (vs early 0.1.x MVP)
| Area | 0.1.x MVP | 0.3.0 |
|------|-----------|-------|
| Story Model | Single provisional document | Hierarchical Story → Narratives → Scenes with IDs & ordering |
| Explorer | Static placeholder | Context menus (rename/add/delete), active entity focus |
| Parsing | Minimal stub | Debounced parser w/ tokens, diagnostics, scene index, timing metrics |
| Compilation | Not wired | IR generation + timing + success/error events |
| Localization | English only | Full English + 简体中文 runtime switch + localized menus |
| Theming | Basic dark/light | Auto mode + persisted mode/theme state |
| Settings | Lacking central dialog | Multi-category modal (General / Appearance / Language / Privacy) |
| Telemetry | None | Local JSONL events + summary + open folder + share scaffold |
| Error Handling | Console noise | Sanitized unhandled exception & rejection capture |
| Save/Load | Basic open/save | Load/save events + structural counts (no content) |
| Menu Locale Sync | Static | Rebuilds dynamically on locale change |
| Remote Telemetry | N/A | Secure scaffold (disabled) with whitelist + hashing |

See [`CHANGELOG.md`](./CHANGELOG.md) for categorized entries.

## Core Concepts
- Install ID vs Session ID: Stable (installation) vs per-run identifiers used only in telemetry metadata.
- Story Model: Internal IDs distinct from user-facing titles to keep references stable during renames.
- Deterministic Parse → Compile boundary: Compiler consumes parse output (AST/tokens) without mutating upstream structures.
- Data Minimization: No narrative/scene textual content or file names enter telemetry—only structural counts, durations, flags.
- User Control First: All diagnostic / usage data is local unless an explicit share toggle (future) and endpoint are configured.

## Current Limitations (Intentional / In Progress)
- Preview panel does not yet render compiled IR output.
- No plugin/theme or directive extension system (planned).
- Remote telemetry upload transport inactive (design scaffold only).
- No AI-assisted authoring panels yet.
- No Git/version control integration UX.
- No automatic update channel wired (manual distribution only).
- No world metadata validator/editor UI beyond hierarchical list.
- Bundle size not yet optimized for cold start beyond basic Vite defaults.

## Upgrade Guidance (from 0.1.x)
Open your existing story files; structure detection & parsing are backward compatible. There are no migration steps—new hierarchical features appear automatically when you create narratives/scenes. If you had custom scripts relying on old IPC surface, confirm against the updated list below.

## Feature Highlights

### Narrative Structure
Hierarchical in‑memory model (Story → Narratives → Scenes) with explorer tree, tab bar, and contextual creation / deletion actions.

### Live Parse & Compile
Debounced parsing (tokens, diagnostics, scene index) and compilation pipeline with duration metrics. Errors surface immediately in diagnostics panel and status bar.

### Localization (English / 简体中文)
Full UI and menu localization with instant runtime switching. Locale preference is persisted and propagated to Electron menus.

### Theming
Light / Dark / Auto (system) modes plus future theme preset hook. Shell state is mirrored to the main process for menu checkmarks.

### Telemetry (Local & Transparent)
Anonymous local JSONL logging (session + environment snapshot, lifecycle & performance events). User controls:
1. Enable / disable local telemetry
2. (Future) Opt‑in share toggle (off by default)
Open Telemetry Folder & on‑demand aggregated event summary provided. See `TELEMETRY.md` for details.

### Privacy & Safety
No story content or personally identifying text is logged. Identifiers are random UUIDs. Errors are truncated & sanitized.

### Settings Dialog
Multi‑category modal (General, Appearance, Language, Privacy & Telemetry) with persistent preferences (theme mode, locale, telemetry toggles).

### Error Handling
Unhandled exceptions / promise rejections are captured as sanitized telemetry events for local diagnostics.

## Quick Start
```powershell
git clone <repo-url>
cd storymode-desktop
npm install
npm run dev
```
Electron will launch once the renderer (Vite) is ready.

## Scripts
| Command | Purpose |
|---------|---------|
| `npm run dev` | Concurrent dev (main + preload watch, Vite renderer, Electron auto-launch) |
| `npm run build` | Full production build into `dist/` |
| `npm run package` | Package unsigned desktop app (electron-builder) |
| `npm run lint` | ESLint over TS/TSX sources |
| `npm run format` | Prettier write |

## Architecture Overview
| Folder | Description |
|--------|-------------|
| `src/main/` | Electron main (lifecycle, menus, IPC, telemetry init) |
| `src/main/preload/` | Secure renderer bridge (whitelisted IPC) |
| `src/renderer/` | React UI (panels, settings, editor integration) |
| `src/services/` | Parse / compile abstraction wrappers |
| `src/shared/` | Shared type contracts |
| `docs/` | Design + specification documents |

Key documents: `ARCHITECTURE_DRAFT.md`, `STATE_MODEL.md`, `STORYMODE_SPEC.md`, `TELEMETRY.md`.

## IPC Surface (0.3.0)
Renderer invokes:
`file:openDialog`, `file:read`, `file:write`, `file:saveAsDialog`, `parse:run`, `compile:run`, `app:versionInfo`, `telemetry:summary`

Renderer sends (fire-and-forget):
`ui:shellState`, `app:setLocale`, `telemetry:event`, `explorer:contextMenu`

Main → Renderer events include: menu actions (`file:*`, `ui:*`, `help:*`, `app:*`, explorer operations) enabling a pure UI-driven shell in the renderer.

## Telemetry Summary
Open Settings → Privacy & Telemetry → Load Summary to view aggregated counts of last 500 events. See `TELEMETRY.md` for exhaustive list and data minimization guarantees.

## Roadmap (Selected)
1. Remote (opt‑in) anonymized telemetry upload
2. Enhanced preview pipeline using compiled IR
3. Rich world metadata editing & validation
4. Plugin system for custom directives / compilers
5. AI-assisted narrative generation panels

## Contributing
Pull requests welcome. Please keep PRs focused and include a short rationale referencing doc sections where possible.

## License
MIT © 2025 William Sawyerr (see `LICENSE`)

## Changelog
See `CHANGELOG.md` for release history and categorized changes.

---
_Updated: 2025-10-03_
