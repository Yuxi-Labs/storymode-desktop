# StoryMode Telemetry

This application records a limited set of anonymous usage events locally to help inform quality and future improvements. Telemetry is **transparent**, **minimal**, and **content‑safe**.

## Key Principles

- Local first: Events are written only to a local JSON Lines (`.log`) file under your user data directory: `<userData>/telemetry/events.log`.
- Private by default: No story/narrative/scene text, filenames, or personally identifying information is recorded.
- User control: You can disable local telemetry at any time in Settings → Privacy & Telemetry.
- Explicit sharing: Remote upload/sharing (when implemented) will be disabled unless you explicitly opt in.

## Event Storage

Events are appended as JSON objects (one per line). The log file is rotated automatically when it exceeds ~1MB (older files are timestamped). You can open the directory via Help → "Open Telemetry Folder".

## Current Event Types

| Event | Purpose | Notes |
|-------|---------|-------|
| `app.session.start` | Marks the start of an app session | Includes app version & locale.
| `app.main.ready` | Main window initialized | — |
| `env.snapshot` | Basic runtime environment | platform, arch, CPU count/model (truncated), total memory MB.
| `ui.shellState` | UI layout/theme adjustments | Only the changed keys.
| `app.locale.changed` | Language change action | New locale code.
| `story.new` | Story creation action | — |
| `narrative.add` | New narrative added | — |
| `scene.add` | New scene added | — |
| `story.load` | Story file loaded | Counts only (narratives, scenes). |
| `story.save` | Save invoked | Whether a file path exists.
| `parse.start` | Parse cycle queued | Version increment.
| `parse.success` / `parse.error` | Parse result | Duration + error message (error only). |
| `compile.start` | Compile cycle queued | Version increment.
| `compile.success` / `compile.error` | Compile result | Generation time + error (error only). |
| `explorer.context` | Explorer context menu opened | Type of entity.
| `telemetry.openFolder` | User opened telemetry folder | — |

## Personally Identifiable Data (PID)
None is collected. Identifiers:
- `installId`: Random UUID generated once per installation.
- `sessionId`: Random UUID per app session.
- `seq`: Incrementing event sequence within the session.

## Data Minimization
Only structural or operational metadata is tracked. No story content, narrative/scene titles, or arbitrary text tokens are stored.

## Disabling Telemetry
1. Open Settings → Privacy & Telemetry.
2. Toggle off "Enable local telemetry logging".
3. New events will stop being recorded (existing log files remain until you delete them manually).

## Export / Summary
A summary of the last 500 events can be retrieved programmatically via the IPC channel `telemetry:summary` (used by the UI button that may be added in future revisions). It returns aggregated counts only.

## Remote Sharing (Planned)
Remote upload functionality will remain opt‑in. Design goals:
- Whitelist-based property filtering.
- Hashing of any potentially sensitive freeform strings.
- Backoff + batching.
- Separate toggle: "Share anonymous telemetry" (default: off).

## Security & Integrity
No executable code is loaded from telemetry. Writes are append-only JSONL. Rotation prevents unbounded growth.

## Deletion
You may delete the telemetry directory at any time while the app is closed. On next launch, a new install identifier will be generated.

## Questions / Feedback
Open an issue or use Help → Request Support to ask about telemetry or propose changes.

---
_Last updated: 2025-10-03_
