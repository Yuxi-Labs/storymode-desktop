# Proposed Folder & File Structure (Writer-Focused MVP)

```
storymode-desktop/
  package.json
  tsconfig.json
  vite.config.ts                # Renderer build
  electron-builder.yml          # Build config stub
  doc/                          # Documentation

  scripts/
    dev.js                      # Or use npm scripts + concurrently

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
      watchers/
        fileWatcher.ts
      adapters/
        parseAdapter.ts
        compileAdapter.ts
      preload/
        preload.ts              # Bridge exposing window.storymode
        api.d.ts                # Type definitions for renderer

    renderer/                   # Front-end UI
      index.html
      main.tsx                  # App bootstrap (React root)
      components/
        ActivityBar.tsx
        FileList.tsx
        TabBar.tsx
        Editor.tsx              # Monaco integration
        DiagnosticsPanel.tsx
        InfoPanel.tsx
        PreviewPanel.tsx
        Welcome.tsx             # (if split from main shell)
      store/
        store.ts                # Zustand store implementation
        selectors.ts            # Optional derived helpers
      hooks/
        useDebouncedParse.ts
        useAutoCompile.ts
      styles.css
      monacoSetup.ts
      utils/
        world.ts               # Parses ::story/::narrative/::scene structure

    shared/
      types.ts                  # Diagnostic, TokenInfo, SceneMeta, envelopes

    services/
      detectFileKind.ts
      parseSource.ts
      compileSource.ts
      watchFile.ts

  build/                        # Output (gitignored)

  resources/
    icons/
      icon.png
```

## Notes
- `shared/types.ts` imported by both main & renderer via `paths` in `tsconfig.json`.
- `services/` wraps `@yuxilabs/storymode-*` libs so future refactors only touch one layer.
- IPC handlers in `main/ipc/*` each export a register function accepting `ipcMain` for clarity/testing.
- Preload provides narrowed surface: `openFile()`, `readFile()`, `watchFile()`, `parse()`, `compile()`, `getVersions()`, `getSceneIndex()`.

## Build Flow
1. Compile preload + main with `tsc` (or esbuild) to `dist/main`.
2. Build renderer with Vite to `dist/renderer`.
3. Package: electron-builder reads from `dist`.

## Alternative (Monorepo Friendly)
If integrating with other StoryMode packages locally, consider a pnpm workspace with `packages/services` etc. MVP keeps single package for speed.

---
Updated: 2025-09-24
