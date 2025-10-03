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
- Fullscreen, Reload, Zoom controls, Dev Tools, Story Browser (legacy term "World Browser" removed), Inspector (renamed & consolidated under Panels if present), Appearance submenu (merged into Themes), Save All Narrative Files.

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

## 21. StoryMode DSL: Full Language Construct Set (Authoring Grammar)

Status: Consolidated reference. Many constructs below are forward-looking and NOT yet executed by the current parser / compiler unless explicitly noted.

### 21.1 Core Principles
1. Single Story Invariant: Exactly one `::story:` directive per authoring session / composite. Additional occurrences are invalid and ignored (diagnostics TBD).
2. Hierarchy: Story → Narratives → Scenes. All narrative and scene declarations must appear within the single story context.
3. Titles: Authored via `@title:` lines immediately following the directive they apply to (or inside scene blocks). Future parser enhancement will formally bind standalone `@title:` lines—current lightweight structure parser does not yet attach them.
4. IDs: Normalized lowercase underscore identifiers (non-alphanumeric removed; whitespace/punctuation collapsed to `_`).
5. Deterministic Ordering: Physical order in file defines narrative order and scene order unless overridden by metadata in a future schema.

### 21.2 File Types
**`.story`** — Story definition / manifest.
**`.narrative`** — Narrative arc containing one or more scene blocks.

Localization & International Authoring:
Chinese (CJK) characters are now supported in story, narrative, and scene IDs. IDs may include characters in the Unicode range U+4E00–U+9FFF alongside ASCII letters, digits, and underscore. Normalization preserves these characters (they are not transliterated). Tooling (tokenizer, completion, structure parser) recognizes them equivalently to ASCII identifiers.

Example `.story` (illustrative – extended metadata not yet persisted by runtime):
```
::story: echoes_of_starlight
  @title: Echoes of Starlight
  @authors: Ada Harrow, Nikhil Sato
  @copyright_holder: Lantern Forge Studios
  @address: 221B Nebula Ave, Orion Outpost
  @email:   contact@lanternforge.io
  @phone:   +1-555-777-4242
  @start:   intro
  files:
    - intro.narrative
    - main.narrative
    - outro.narrative
::end: {{ echoes_of_starlight }}
```

Example `.narrative` (intro):
```
::narrative: intro

::scene: awakening
@title: Awakening
@location: Mango Desert
@time: 04:32 PM
@characters: Nova, Ken, James
```

Note: Narrative-level metadata lines directly under `::narrative:` are disallowed; metadata belongs to scene blocks (or future `meta` blocks).

### 21.3 Keywords (Planned / Author-Facing Statements)
Structure / Identity: `story`, `narrative`, `scene`
Blocks / Semantic Units: `meta`, `character`
Dialogue & Expression: `say`, `think`
Media & Effects: `sfx`, `vfx`, `music`, `cam`
State & Flow: `flag`, `set`, `goto`
Annotation: `note`, `tag`

Implementation Status:
- Implemented structurally: `::story:`, `::narrative:`, `::scene:`.
- Pending semantic parsing / execution: all others (currently treated as raw text if present).

### 21.4 Canonical Symbol & Glyph Mapping
This table supersedes prior draft symbol lists. Keyboard tokens (left) are what authors type; the rendered glyph / semantic meaning (right) describes the intended visual substitution layer. Unless noted, substitution is planned—not yet active in the current editor build.

| Typed Token        | Rendered Glyph   | Meaning / Use                                                                                 |
| ------------------ | ---------------- | --------------------------------------------------------------------------------------------- |
| `::story:`         | (plain)          | Story declaration block (root metadata container)                                            |
| `@key: value`      | (plain)          | Story / block-level metadata attribute (no special glyph; conventional ASCII retained)       |
| `::narrative:`     | (plain)          | Narrative container (structural; not standalone prose)                                        |
| `::scene:`         | (plain)          | Scene / section anchor                                                                       |
| `{{ scene_name }}` | {{ scene_name }} | Scene handle (named reference target)                                                        |
| `::goto:`          | ⇝                | Non-branching structural jump / redirection to another scene                                 |
| `::end:`           | (plain)          | Explicit end of story or block (optionally with handle)                                      |
| `[[ Name ]]`       | 🞶 Name          | Character declaration (rendered with prefixed glyph + name)                                  |
| `"..."`            | ¶                | Dialogue (spoken prose, rendered as prose block)                                             |
| `>>`               | ↠                | Cue line (action / performance)                                                              |
| `!!:`              | ⦿                | Sound effect cue                                                                             |
| `**:`              | ⬟                | Visual effect cue                                                                            |
| `~~:`              | ♬                | Music / ambience cue                                                                         |
| `<>:`              | ⧈                | Camera / cinematic cue                                                                       |
| `[ a, b, c ]`      | [ … ]            | List of values / objects (sounds, items, etc.)                                               |
| `### …`            | †                | Footnote (exportable)                                                                        |
| `/// …`            | †                | Footnote (alternate syntax)                                                                  |
| `# …`              | —                | Single-line comment (ignored)                                                                |
| `// …`             | —                | Single-line comment (ignored)                                                                |
| `/* … */`          | —                | Block comment (ignored)                                                                      |

Substitution / Rendering Notes:
1. Longest-token precedence (e.g., `::scene:` before bare `::`).
2. Dialogue detection for `"..."` form applies only when a line begins with a straight double quote and ends with a matching unescaped quote (future rule—NOT enforced yet).
3. Comments (`#`, `//`, `/* */`) remain raw; no glyph injection beyond potential dim styling.
4. Footnotes map both `###` and `///` styles to the † glyph for uniform export tagging.
5. Inline handle syntax `{{ name }}` is passed through verbatim; no glyph substitution (acts as a semantic anchor token).
6. All glyph replacements are presentation-layer only; source file persists original ASCII tokens unless an explicit “normalize to glyphs” action is invoked (future feature).

Implementation Status (delta):
- Core structural directives (`::story:`, `::narrative:`, `::scene:`, `::end:`) and metadata lines now render as plain ASCII with no glyph substitution. Prior reserved glyphs (✤, ⧉, §, ◈, ＠) have been freed for potential future semantic roles.
- Character declaration may later gain a prefixed glyph; currently rendered plain aside from syntax highlighting.
- List syntax `[ a, b, c ]` recognized only lexically for planned structured metadata; parser currently treats as plain text.

Deprecation Note:
Previous drafts assigned decorative glyphs to core directives. This has been intentionally reverted to keep authoring visually lightweight and reserve those symbols for higher‑value future constructs (e.g., branching, conditionals, annotations). Tooling should not rely on glyph substitution for these directives.

Planned Validation (future):
- Enforce single `::end:` alignment with opening `::story:`.
- Validate all `::goto:` targets correspond to an existing scene handle or scene ID.
- Flag unknown effect / music / camera tokens for optional lint diagnostics.

### 21.5 Textual Roles
Scene IDs, Character Names, Dialogue Lines, Thoughts, Effect IDs, Music Track IDs, Camera Moves, Flag Names, Redirect Targets, Notes, Tags — all normalized or displayed verbatim per their context. Resolution / validation steps for these roles are future-phase (e.g., undefined flag warnings).

### 21.6 Narrative File Structural Order (Canonical)
1. Narrative declaration (`::narrative:`)
2. One or more scene blocks in declared order
3. Optional media/effect lines interspersed within scene content
4. Optional character dialogue blocks (symbolic forms)
5. Optional narrative paragraph (`¶` prefixed) sections
6. Optional redirections (`⇝ target_scene`)
7. Optional notes (`✎`, `###`, or inline comment forms)

Current runtime enforces only items 1–2 strictly; the rest are lexical placeholders until semantic passes are integrated.

### 21.7 Constraints & Validation (Current vs Planned)
| Rule | Current Behavior | Planned Behavior |
|------|------------------|------------------|
| Single `::story:` | First retained, others ignored | Emit diagnostics for extras |
| Missing `::story:` | Synthetic story created | Error diagnostic; refuse parse |
| Titles via `@title:` lines | Not bound by parser walker | Bound to preceding directive |
| Unicode symbolic lines | Treated as plain text | Tokenized & classified |
| Comments (#, //) | Not stripped | Stripped before parse IR |
| Block comments /** **/ | Not recognized | Properly skipped |

### 21.8 Future Extensions
- Formal grammar (EBNF) exported for tooling
- LSP support: symbol index, definitions, flag validation
- Scene jump graph visualization
- Semantic diff / structural merge utilities

### 21.9 Authoring Guidelines
1. Start every authoring session with a single `::story:` block.
2. Keep one narrative per `.narrative` file; do not mix story directive into narrative files.
3. Avoid starting scene content lines with `::scene:` unless beginning a new scene.
4. Use descriptive IDs early—renaming later will propagate but may cause churn in external references.
5. Reserve symbolic constructs for their intended roles to prevent future parser ambiguity.

### 21.10 Known Gaps
- Title line association pending.
- Additional directives (`meta`, `flag`, `goto`, etc.) not yet compiled or validated.
- No escaping mechanism for literal directive tokens (`::scene:` inside body). Escape design TBD.

### 21.11 Comprehensive Example (Canonical Formatting)
The following end‑to‑end sample showcases most currently specified constructs in their canonical indentation style. It intentionally avoids future / non‑canonical directives. Lines beginning with comments ( `#` / `//` ) are ignored by the parser (future stripping). Each scene and narrative is explicitly closed with `::end:` including a handle for clarity.

Story manifest (`echoes_of_starlight.story`):
```
::story: echoes_of_starlight
  @title: Echoes of Starlight
  @authors: Ada Harrow, Nikhil Sato
  @copyright_holder: Lantern Forge Studios
  @address: 221B Nebula Ave, Orion Outpost
  @email:   contact@lanternforge.io
  @phone:   +1-555-777-4242
  @start:   intro
  files:
    - intro.narrative
    - main.narrative
    - outro.narrative
::end: {{ echoes_of_starlight }}
```

First narrative (`intro.narrative`):
```
::narrative: intro
  @title: Intro

  ::scene: arrival
    @title: Arrival at the Archive
    @flag: temporal_buffer_engaged

    >> Dust motes freeze midair as temporal buffers engage.
    <>: [ wide_shot, slow_zoom_in ]

    [[ Lyra ]]
    !!: [ terminal_beep ]
    ¶ Archive core, online?

    [[ Archive ]]
    **: [ flickering_light ]
    ¶ Partial. Memory sectors 3, 7, 11 corrupted. ### Systems logged three prior failures.

  ::end: {{ arrival }}

  ::scene: corridor_glitch
    @title: Corridor Glitch

    >> A shimmer ripples down the corridor walls.
    ~~: [ low_dissonance, phased_drone ]

    [[ Orion ]]
    ¶ Seeing the shimmer again.

    [[ Lyra ]]
    ¶ Anchor yourself. Think of a fixed vector.
    ::goto: {{ corridor_glitch_alt_a }}

  ::end: {{ corridor_glitch }}

  ::scene: corridor_glitch_alt_a
    @title: Corridor Glitch (Phase Inversion)
    @flag: phase_inversion_seen

    >> Corridor bends inward; surfaces fold like mirrored paper.
    <>: [ inverted_perspective ]

    [[ Orion ]]
    ¶ Floor inverted. I'm walking on ghosts. /// Possible hallucination.

  ::end: {{ corridor_glitch_alt_a }}

  ::scene: data_marrow
    @title: Data Marrow
    @flag: deep_scan_initiated
    ~~: [ low_oscillation ]

    [[ Archive ]]
    ¶ Root query?

    [[ Lyra ]]
    ¶ Search for pattern: undertone resonance spiral.
    !!: [ resonance_pulse, static_crack ]

  ::end: {{ data_marrow }}

::end: {{ intro }}
```

Second narrative (selected snippets – `main.narrative`):
```
::narrative: main
  @title: Main Arc

  ::scene: threshold
    @title: Threshold
    >> The archive core doors cycle through three failed unlock attempts.
    !!: [ lock_error_chime, relay_click ]
    [[ Lyra ]]
    ¶ Manual override then. Prepare for cascade.
  ::end: {{ threshold }}

  ::scene: breach
    @title: Breach
    **: [ light_lattice, dust_column ]
    >> A thin seam of pale light spiders across the floor plates.
    [[ Orion ]]
    ¶ We tripped something.
    [[ Lyra ]]
    ¶ Keep recording. This might be first-contact storage architecture.
  ::end: {{ breach }}

::end: {{ main }}
```

Footnotes & comments usage (excerpt from `outro.narrative`):
```
::narrative: outro
  @title: Outro

  ::scene: fade_down
    @title: Fade Down
    >> Systems power-cycle in staged silence.
    ### Core telemetry archived for post-run audit.
    // Future: add closing ceremony text here.
  ::end: {{ fade_down }}

::end: {{ outro }}
```

Demonstrated Elements:
- Story metadata assortment & files list (multiline canonical form)
- Narrative + multiple scenes with flags
- Scene redirection via `::goto:`
- Media/effect cues (!!:, **:, ~~:, <>:) with list syntax
- Character declaration + dialogue (`[[ Name ]]`, ¶ lines)
- Footnote (###) and line comment
- Handles for all closers ensuring unambiguous endings

Not Yet Demonstrated (Future / Out-of-Scope Here):
- Variant resolution semantics
- Choice / branching directives (not in current canonical symbol table)
- Lore blocks or meta blocks
- Validation diagnostics (e.g., undefined handles)

---
End of DSL Section.

---
End of Spec Draft.
