# StoryMode Product Specification (Canonical Draft)

Status: Draft
Last Updated: (auto)
Owner: Core Engineering

## 1. Purpose
StoryMode is an offline-first desktop application (Electron + React) for authoring interactive narrative stories composed of hierarchical entities: Story → Narratives → Scenes. This specification defines the canonical user-facing behavior, file scaffolding workflow, UI panels, theming, and menu semantics for the MVP scope.

## 2. Core Concepts
- Story: Top-level container with a title and ordered list of Narrative IDs.
- Narrative: Ordered collection of Scenes within a Story; has title, order index, and sceneIds.
- Scene: Authoring unit containing textual source (edited in main editor panel) with title, narrative linkage, content, and order.
- Active Scene: Exactly one scene at a time is active; its content is mirrored into the in-memory `file.content` buffer for editing.

## 3. Initial Launch & Welcome State
On cold start with no previously opened story file:
1. App presents a Welcome View (central panel) inviting the user to create a new Story ("New Story" primary action) or open an existing file (future scope if disabled in MVP, omit secondary UI).
2. Sidebar (Explorer) is initially empty of story content.
3. Panels (Sidebar, Preview, Details/Right Panel, Status Bar) retain last-remembered visibility from persisted UI state unless first run defaults apply.

### Exit Conditions of Welcome View
- Trigger: User selects File > New Story (menu) OR clicks the New Story button in the Welcome view.
- Result: Welcome view is replaced by the editor view showing Scene 1 of the new Story.

## 4. New Story Scaffolding Workflow
When a new story is created (`store.newStory()`):
1. A new in-memory story model is generated via `createSeedStory(title?)` producing:
  - Story: id, title (default: "Untitled"), narrativeIds = [narrative-1]
  - Narrative: id, title "Untitled", sceneIds = [scene-1], order 0
  - First Scene: id, title "Untitled Scene 1", content = "" (empty), order 0
   - activeSceneId = scene-1
2. The editor's buffer (`file.content`) is set to the active scene's content (empty string initially).
3. Explorer Sidebar populates hierarchical nodes (Story root → Narrative 1 → Scene 1). (If not yet implemented visually, this is a required implementation target.)
4. No disk writes occur automatically (MVP is in-memory until explicit Save is implemented—future spec section TBD). A future persistence layer will map Story (.story) and narrative/scene content serialization into files.

### Planned File Artifacts (Forward Spec)
- <Title>.story : JSON (or structured) composite manifest describing story + nested narratives/scenes metadata and ordering.
- <SceneId or Title>.narrative (Possibly consolidated; evaluate whether a separate narrative file is necessary or scenes-only) – Present intent: two initial files `Untitled.story` and `Untitled.narrative`. To reconcile with current model (scenes hold content), narrative-level text file may be deferred; alternative: `Untitled.story` + first scene text file (e.g., `Untitled Scene 1.txt`). OPEN QUESTION.

Decision Needed: Confirm exact on-disk representation (single composite vs multi-file). For now, spec captures intent but marks file emission as Deferred.

## 5. Hierarchical Editing Behavior
- Changing Active Scene persists the previous active scene's current edited content back into `storyModel.scenes[activeSceneId].content` before switching.
- Editor buffer then loads new active scene content.
- Adding Narratives increments order by appending; scenes within narrative are similarly appended.

## 6. Menu Semantics (MVP)
### File Menu
- New Story (dispatches `file:newStory` → renderer `menu:newStory` → `newStory()`)
- (Save / Open / Recent: deferred if not implemented—do not surface disabled placeholders.)

### View Menu
Submenus and actions:
- Themes (single exclusive radio group):
  - Auto (system adaptive)
  - Light Mode
  - Dark Mode
  - (Optional plugin themes appended below a separator only if at least one plugin theme is registered)
- Panels:
  - Sidebar (toggle)
  - Details Panel (right-side; toggle) (Term: "Details Panel" canonical; was previously "Right Panel")
  - Status Bar (toggle)
- Window:
  - Minimize (native)
  - Maximize / Restore (native)

Removed / Excluded from MVP:
- Fullscreen, Reload, Zoom controls, Dev Tools, World Browser, Inspector (renamed & consolidated under Panels if present), Appearance submenu (merged into Themes), Save All Narrative Files.

### Help Menu
- About StoryMode (opens draggable About dialog modal; see Section 9)

## 7. Theming
- State Keys: `themeMode` in store: 'auto' | 'light' | 'dark'; optional `themeId` for future plugin themes.
- Renderer listens to DOM CustomEvents: `menu:setThemeMode`, `menu:applyThemePreset` (forwarded from main → preload).
- Auto Mode: Adapts to system `prefers-color-scheme` changes dynamically; on change, store emits system theme update and DOM `<html data-theme>` is updated.
- Persistence: localStorage (key naming per existing implementation) stores both `themeMode` and explicit preset; on load, applies mode then resolves effective theme.
- Only one radio group ensures mutually exclusive selection (Auto excludes explicit light/dark when chosen and vice versa).

## 8. Panels & Layout
- Sidebar: File / Story explorer. Collapsible state persisted.
- Details Panel: Right-side contextual panel (future debugging / meta info). Hidden by default unless previously enabled.
- Preview Panel (if present in code): Controlled separately (`previewVisible`). Not currently user-toggled via menu (evaluated future design) or else included under Panels once finalized.
- Status Bar: Footer utility bar; toggle persists.
- Draggability: Only main OS window frame is draggable except About dialog (special case).

## 9. About Dialog Behavior
- Fully draggable by any non-interactive area (entire surface except buttons/links) without changing cursor.
- Single Close 'X' in header + optional footer Close button (footer stays as secondary action; spec: keep one top X only).
- Mascot image alignment: Left edge aligns visually with copyright text left edge (achieved via fixed CSS offset; no runtime pixel sampling or canvas analysis—explicitly prohibited to avoid complexity and flicker).
- Esc key closes dialog.

## 10. Accessibility & UX Principles
- Keyboard: New Story (Ctrl+N / Cmd+N) FUTURE (if accelerator assigned) – currently unspecified.
- Focus management: Opening About traps focus initially on Close button; closing returns focus to the previously focused element (TO IMPLEMENT if missing).
- High contrast / Reduced motion: Future enhancements; not in MVP scope.

## 11. Error Handling & Edge Cases
- Creating a New Story while unsaved edits exist (future persistence): Should prompt (Deferred; current build overwrites in-memory state silently).
- Theme system fallback: If unknown plugin theme requested, ignore and retain previous theme while logging a warning (IMPLEMENTATION NOTE for future additions).
- Rapid scene switching: Ensure previous scene content flush is synchronous (current direct set operation suffices; no async race).

## 12. Data Model Serialization (Forward Spec)
Target JSON manifest (illustrative with new naming):
```
{
  "version": 1,
  "title": "Untitled",
  "narratives": [
    {
      "id": "narrative-abc123",
  "title": "Untitled",
      "order": 0,
      "scenes": [
  { "id": "scene-def456", "title": "Untitled Scene 1", "order": 0, "content": "" }
      ]
    }
  ],
  "activeSceneId": "scene-def456"
}
```
Open Question: Whether scene content is co-located (as above) or stored in discrete per-scene text files.

## 13. Persistence Roadmap (Out of Immediate Scope)
Phase 1: Single composite .story file (includes all text) – simplest implementation.
Phase 2: Optional externalization of large scene bodies for streaming / diff friendliness.
Phase 3: Narrative-level modularization only if proven beneficial.

## 14. Non-Goals (MVP)
- Multi-window editing.
- Live collaboration / networking.
- Plugin discovery UI.
- Built-in analytics or telemetry.
- Internationalization.

## 15. Gaps vs Current Implementation
| Spec Item | Current State | Gap Action |
|-----------|---------------|-----------|
| Explorer hierarchical display after New Story | May not render full hierarchy (verify) | Ensure Story → Narrative → Scene nodes appear immediately |
| Dual initial file creation (Untitled.story + Untitled.narrative) | Not implemented (in-memory only) | Decide on file strategy; implement persistence layer |
| Focus return after About close | Unverified | Implement focus restoration |
| Accessibility keyboard shortcuts | Minimal | Define & register accelerators |
| Preview / Details panel menu parity | Details only partially integrated | Audit and update Panels submenu |

## 16. Acceptance Criteria (MVP Complete)
- New Story replaces welcome view with editor showing Scene 1.
- Theme selection updates immediately and persists across restart.
- About dialog draggable everywhere; single top X; alignment stable.
- Panels toggles mutate UI and persist state.
- No removed menu commands appear.

## 17. Open Decisions Log
1. File persistence format (single .story vs multi-file). Owner: Product/Engineering. Due: Pre-persistence milestone.
2. Naming standard for Details Panel final label ("Details" vs "Inspector"). Current decision: "Details Panel".
3. Inclusion of Preview Panel under Panels submenu. Pending feature readiness.

## 18. Future Extensions (Backlog Candidates)
- Scene duplication & reordering UI.
- Narrative reordering via drag-and-drop.
- In-editor linting diagnostics (partial infra exists under `parse` pipeline).
- Export to HTML / interactive runtime.

## 19. Traceability Mapping
Menu Event `file:newStory` → preload emits `menu:newStory` → renderer listener calls `useStore.getState().newStory()` → store seeds model → editor binds to active scene content.

## 20. Glossary
- Details Panel: Right-side contextual panel (formerly Inspector internally in code comments).
- Active Scene: Scene whose content is currently loaded into editor buffer.
- Panels: Toggleable UI chrome sections (Sidebar, Details Panel, Status Bar, future Preview).

---
End of Spec Draft.
