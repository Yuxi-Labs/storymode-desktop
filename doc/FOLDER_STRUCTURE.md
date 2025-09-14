# Proposed Folder & File Structure (MVP)

```
storymode-desktop/
  package.json
  tsconfig.json
  vite.config.ts                # For renderer build
  electron-builder.yml          # (or equivalent) build config stub
  doc/                          # Documentation

  scripts/
    dev.js                      # Or use concurrently via npm scripts

  src/
    main/                       # Main process (Node context)
      main.ts                   # App entry (createWindow, lifecycle)
      ipc/                      # IPC channel handlers
        fileHandlers.ts
        parseHandlers.ts
        compileHandlers.ts
        versionHandlers.ts
      security.ts               # CSP, navigation guards
      menu.ts                   # Application menu template
      watchers/                 # File watch utilities
        fileWatcher.ts
      adapters/                 # Wrappers around core libs
        parseAdapter.ts
        compileAdapter.ts
      preload/                  # Preload build target
        preload.ts              # Bridge exposing window.storymode
        api.d.ts                # Type definitions for renderer

    renderer/                   # Front-end UI
      index.html
      main.tsx                  # App bootstrap (React root)
      app/                      # High-level app shell/layout
        AppShell.tsx
        StatusBar.tsx
        PanelsLayout.tsx
      components/
        Editor.tsx              # Monaco/CodeMirror integration
        DiagnosticsPanel.tsx
        AstPanel.tsx
        IrPanel.tsx
        TokensPanel.tsx
        SceneJumpPalette.tsx
      store/
        index.ts                # Zustand createStore
        selectors.ts            # Derived selectors
        actions.ts              # Action implementations
        types.ts                # Mirrors STATE_MODEL
      styles/
        theme.css
      hooks/
        useDebouncedParse.ts
        useIpc.ts
      ipc/
        bridge.ts               # Wraps window.storymode with typed helpers

    shared/                     # Shared types between main & renderer
      types.ts                  # Diagnostic, TokenInfo, SceneMeta, envelopes

    services/                   # Normalized service layer (could be published later)
      detectFileKind.ts
      parseSource.ts
      compileSource.ts
      watchFile.ts

  build/                        # Output (gitignored)

  resources/                    # Icons, etc.
    icons/
      icon.png
```

## Notes
- `shared/types.ts` imported by both main & renderer via `paths` in `tsconfig.json`.
- `services/` wraps external `@yuxilabs/storymode-*` libs so future refactors only touch one layer.
- IPC handlers in `main/ipc/*` each export register function accepting `ipcMain` for clarity/testing.
- Preload provides narrowed surface: `openFile()`, `readFile()`, `watchFile()`, `parse()`, `compile()`, `getVersions()`, `getSceneIndex()`.

## Build Flow
1. Compile preload + main with `tsc` (or esbuild) to `dist/main`.
2. Build renderer with Vite to `dist/renderer`.
3. Package: electron-builder reads from `dist`.

## Alternative (Monorepo Friendly)
If integrating with other storymode packages locally, could adopt pnpm workspace with `packages/services` etc. MVP keeps single package for speed.

---
Generated: 2025-09-14
