# MVP Scope

## Goals
- Provide a focused writing environment for interactive narrative scripting.
- Align nomenclature with StoryMode entities: stories contain narratives, narratives contain scenes.
- Offer discoverable onboarding for non-technical authors.

## Shell Experience (Updated September 2025)
- **Menus**
  - File: story lifecycle (new/open/recent/save/preview/print/settings).
  - Edit: writer-first commands (undo/redo, select line/block, toggle comment, clipboard).
  - View: window affordances, appearance (Light/Dark/Auto), themes, panel visibility, dev tools.
  - Tools: AI-assisted writing & coding entry points, version control, update check (hooks stubbed for backend integration).
  - Help: documentation, language guide, support, feature request, bug report, About dialog.
- **Panels**
  - Activity bar exposes the World browser as the primary navigation hub.
  - Sidebar lists stories → narratives → scenes; keyboard accessible, no button elements.
  - Inspector toggles metadata/diagnostics with visibility managed from View → Panels.
- **Preview** renders in the editor region and replaces the Monaco view until toggled off. Preview state persists via `ui:shellState`.
- **Status bar** surfaces document type, encoding, word count, scene count, diagnostic totals, and placeholder notifications.
- **Welcome** screen provides contextual actions (create/open story) and guidance without floating cards.
- **Themes** support Light/Dark/Auto plus installable presets (StoryMode Dark shipped). Appearance selection disables theme presets until cleared.

## Non-goals (for future iterations)
- Rich timeline or block diagramming UI.
- Multiplayer authorship sessions.
- Built-in asset pipeline.

## Workflows
1. **Start a story** via File → New Story or the welcome panel; a default story skeleton is created.
2. **Open existing story** through File → Open Story or Open Recent.
3. **Preview script** in place via File → Preview Story.
4. **Inspect metadata** in the right panel; toggle diagnostics or metadata per View → Panels.
5. **Export** via File → Print Script (PDF or printer route).

## Integration Hooks
- `ui:shellState` keeps the menu in sync with renderer state (preview/inspector/status/theme/sidebar).
- `tools:aiWriting`, `tools:aiCoding`, `tools:versionControl`, `app:checkForUpdates` events are bridged but unimplemented.
- About dialog refreshed (square design, neutral copyright).

