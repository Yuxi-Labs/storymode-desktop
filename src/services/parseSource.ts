// NOTE: Avoid importing Node built-in modules to keep types simple; use global performance/Date.now.
import type { FileKind, TokenInfo, Diagnostic, SceneMeta, ParseResponse } from '../shared/types.js';
import { detectFileKind } from './detectFileKind.js';

export interface ParseOptions { filename?: string; collectTokens?: boolean; collectSceneIndex?: boolean; }

/**
 * parseSource integrates with @yuxilabs/storymode-core if available. It dynamically imports
 * the core library to avoid hard failure if the dependency shape changes or is missing.
 * Fallback: previous mock tokenizer + scene index heuristics.
 * Returned shape remains consistent with ParseResponse.
 */
export function parseSource(content: string, options: ParseOptions = {}): ParseResponse {
  const start = (globalThis as any).performance?.now?.() ?? Date.now();
  const kind: FileKind = detectFileKind(content, { filename: options.filename });
  try {
    // Dynamic require inside try so that build/start doesn't crash if package absent.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const core = safeRequire('@yuxilabs/storymode-core');
    if (core && typeof core.parse === 'function') {
      // We assume core.parse signature; adapt if actual differs.
      // Attempt to request tokens & scene index if supported by options.
      const coreResult = core.parse(content, {
        filename: options.filename,
        collectTokens: options.collectTokens !== false,
        collectSceneIndex: options.collectSceneIndex !== false
      });
      // Expecting shape: { ast, tokens, diagnostics, parseTimeMs?, sceneIndex? }
      const diagnostics: Diagnostic[] = normalizeDiagnostics(coreResult.diagnostics || []);
      const tokens: TokenInfo[] = (options.collectTokens === false ? [] : normalizeTokens(coreResult.tokens || []));
      const sceneIndex: SceneMeta[] | undefined = options.collectSceneIndex === false ? undefined : (coreResult.sceneIndex || undefined);
      const ast = coreResult.ast ?? null;
      const parseTimeMs = coreResult.parseTimeMs ? coreResult.parseTimeMs : Math.round(performance.now() - start);
      return { ok: true, ast, tokens, diagnostics, parseTimeMs, sceneIndex };
    }
  } catch (err: any) {
    // Fall through to mock path; we still want a successful (ok) result unless catastrophic.
    // eslint-disable-next-line no-console
    console.warn('[parseSource] Falling back to mock implementation:', err?.message);
  }

  // Fallback mock implementation
  try {
    const diagnostics: Diagnostic[] = [];
    const tokens: TokenInfo[] = options.collectTokens === false ? [] : mockTokenize(content);
    const sceneIndex: SceneMeta[] | undefined = options.collectSceneIndex === false ? undefined : mockSceneIndex(content);
    const ast = { kind: 'MockAst', nodeCount: tokens.length, fileKind: kind };
    const end = (globalThis as any).performance?.now?.() ?? Date.now();
    const parseTimeMs = Math.round(end - start);
    return { ok: true, ast, tokens, diagnostics, parseTimeMs, sceneIndex };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Unknown parse error' };
  }
}

function safeRequire(mod: string): any | null {
  try { return eval('require')(mod); } catch { return null; }
}

function normalizeDiagnostics(raw: any[]): Diagnostic[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((d, i) => ({
    severity: (d.severity === 'warning' || d.severity === 'info') ? d.severity : 'error',
    message: String(d.message ?? 'Unknown'),
    start: normalizePos(d.start),
    end: normalizePos(d.end),
    code: d.code ? String(d.code) : undefined,
    _index: i // internal helpful index (not in type) - will be stripped by TS anyway
  } as any)).map(({ _index, ...rest }) => rest);
}

function normalizeTokens(raw: any[]): TokenInfo[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 20000).map((t, i) => ({
    index: typeof t.index === 'number' ? t.index : i,
    type: String(t.type ?? 'unknown'),
    lexeme: String(t.lexeme ?? '').slice(0, 64),
    start: normalizePos(t.start),
    end: normalizePos(t.end)
  }));
}

function normalizePos(p: any): { line: number; column: number } {
  if (!p || typeof p.line !== 'number' || typeof p.column !== 'number') return { line: 0, column: 0 };
  return { line: p.line, column: p.column };
}

function mockTokenize(content: string): TokenInfo[] {
  const lines = content.split(/\r?\n/);
  const tokens: TokenInfo[] = [];
  let index = 0;
  for (let lineNo = 0; lineNo < lines.length; lineNo++) {
    const line = lines[lineNo];
    const words = line.split(/\s+/).filter(Boolean);
    let col = 0;
    for (const w of words) {
      const startCol = line.indexOf(w, col);
      const endCol = startCol + w.length;
      tokens.push({ index: index++, type: 'word', lexeme: w.slice(0, 32), start: { line: lineNo, column: startCol }, end: { line: lineNo, column: endCol } });
      col = endCol;
    }
  }
  return tokens.slice(0, 5000); // cap
}

function mockSceneIndex(content: string): SceneMeta[] {
  const result: SceneMeta[] = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = /^\s*scene\s+(\w+)/.exec(lines[i]);
    if (m) result.push({ id: m[1], line: i });
  }
  return result;
}
