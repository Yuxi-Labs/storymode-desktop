# Dependencies & Tooling (MVP)

## Runtime Dependencies
- `electron` (>=32) – Desktop host runtime.
- `@yuxilabs/storymode-core` – Parsing, tokens.
- `@yuxilabs/storymode-compiler` – IR generation, stats.
- `zustand` – Lightweight global state store.
- `monaco-editor` (or alternative `@codemirror/*`) – Editor component (decision: Monaco initial).
- `fast-deep-equal` (optional) – Lightweight equality for memoization.
- `chokidar` – Robust cross-platform file watching (fallback to fs.watch possible but chokidar recommended for Linux reliability).

## Dev Dependencies
- `typescript` – Type system.
- `ts-node` or direct build tooling (if simple scripts needed).
- `vite` – Fast renderer build/dev server.
- `@electron-forge/plugin-vite` or manual wiring (alternative: electron-vite). Simplicity: direct scripts + Vite.
- `electron-builder` – Packaging artifacts (installer generation later phase).
- `eslint` + `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` – Linting.
- `prettier` – Formatting.
- `rimraf` – Cross-platform clean.
- `cross-env` – Set NODE_ENV in scripts (Windows compatibility).

## Scripts (package.json Draft)
```json
{
  "scripts": {
    "clean": "rimraf dist",
    "build:main": "tsc -p tsconfig.main.json",
    "build:preload": "tsc -p tsconfig.preload.json",
    "build:renderer": "vite build",
    "build": "npm run clean && npm run build:main && npm run build:preload && npm run build:renderer",
    "dev:main": "tsc -w -p tsconfig.main.json",
    "dev:preload": "tsc -w -p tsconfig.preload.json",
    "dev:renderer": "vite",
    "dev": "cross-env NODE_ENV=development concurrently \"npm:dev:main\" \"npm:dev:preload\" \"npm:dev:renderer\" \"npm:start:electron\"",
    "start:electron": "wait-on tcp:5173 && electron .",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write .",
    "package": "npm run build && electron-builder"
  }
}
```
(If using an integrated solution like electron-vite, scripts simplify.)

## TypeScript Config Split
- `tsconfig.base.json` – shared compiler options.
- `tsconfig.main.json` – target Node, includes `src/main/**/*` & `src/services/**/*`.
- `tsconfig.preload.json` – similar to main.
- `tsconfig.renderer.json` – JSX + DOM libs.

## Rationale Highlights
- Monaco: fastest path to working editor + token colorization.
- Chokidar: reduces platform-specific watch edge cases.
- Separate tsconfigs: avoids bundling DOM libs into main process build.
- Vite: quick HMR for renderer; can later adopt electron-vite for unified config.

## Potential Optimizations (Later)
- Bundle reduction: switch to CodeMirror if Monaco footprint too large.
- Use `esbuild` for main/preload for faster cold builds.
- Introduce worker threads for parse/compile if blocking metrics exceed thresholds.

## Minimal .eslint config (Sketch)
```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['dist', 'build'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn'
  }
};
```

## Prettier Config (Sketch)
```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "es5"
}
```

---
Generated: 2025-09-14
