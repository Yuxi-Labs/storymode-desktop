# Changelog

All notable changes to this project will be documented here.

The format loosely follows Keep a Changelog (categories Added / Changed / Fixed / Removed / Security) and semantic version pre-1.0 guidance (minor bumps can include breaking changes, documented explicitly).

## [0.3.0] - 2025-10-03
### Added
- Hierarchical story model (Story → Narratives → Scenes) with explorer, context menus (add, rename, delete).
- Debounced parser: tokens, diagnostics, scene index, timing metrics, structured error reporting.
- Compilation pipeline producing IR with generation timing + success/error telemetry.
- Full Simplified Chinese localization (UI + Electron menus) with runtime switching & persistence.
- Theming system: Light, Dark, Auto (system) with persisted theme mode and shell state propagation.
- Settings dialog (multi-category: General, Appearance, Language, Privacy & Telemetry).
- Local telemetry logger (JSONL) covering session, environment snapshot, UI shell changes, parse/compile lifecycle, story load/save, narrative/scene events, context menus, locale/theme changes, unhandled errors.
- Telemetry summary IPC and UI viewer (aggregated last 500 events) plus Open Telemetry Folder menu item.
- Remote telemetry uploader scaffold (whitelist + hashing + batching; disabled by default).
- Unhandled exception & unhandled promise rejection capture (sanitized) logged locally.
- Story save/load instrumentation and structural counts (narratives, scenes).
- MIT license file & expanded README (core concepts, limitations, upgrade guidance, what's new).

### Changed
- Menus rebuilt dynamically on locale change rather than static load.
- Story creation now materializes a structured hierarchy instead of flat initial placeholder.
- Theme mode persistence ensures consistent startup appearance.
- Error handling improved: graceful logging instead of silent crashes.

### Fixed
- Rotating telemetry log at size threshold (~1MB) to prevent unbounded growth.

### Removed
- MVP placeholder single-document assumption superseded by full hierarchy.

### Security / Privacy
- Data minimization enforced: no story text or file names in telemetry; hashed long string fields if remote sharing is ever enabled.

### Upgrade Notes
No migrations required. Existing story text opens; new hierarchical features are additive. Remote telemetry remains opt-in/inactive.

## [0.1.0] - 2025-09-14
### Added
- Initial Electron + React scaffold (main, preload, renderer layout).
- Basic menu with File/New Story, minimal view toggles, About dialog stub.
- Light/Dark theme toggle (no persistence), minimal styling.
- Basic file open/save functionality.
- Placeholder parser/compile wiring (non-instrumented).

### Limitations (Historical)
- No localization, no telemetry, flat story model, no structured diagnostics.

---

[0.3.0]: https://github.com/Yuxi-Labs/storymode-desktop/releases/tag/v0.3.0 (pending)
