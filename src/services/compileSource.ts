// Use global performance/Date.now only; avoid direct Node built-in imports for type simplicity.
import type { CompileResponse, CompileStats, Diagnostic, ParseResponse } from '../shared/types.js';
import { parseSource } from './parseSource.js';

export interface CompileOptions { optimize?: boolean; filename?: string; }

/**
 * compileSource attempts to use @yuxilabs/storymode-compiler if available.
 * Fallback: derive a mock IR from parse tokens.
 */
export function compileSource(astOrContent: unknown | string, options: CompileOptions = {}): CompileResponse {
  const start = (globalThis as any).performance?.now?.() ?? Date.now();
  let diagnostics: Diagnostic[] = [];
  let ir: unknown = null;
  let stats: CompileStats | null = null;

  // Try real compiler path first
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const compiler = safeRequire('@yuxilabs/storymode-compiler');
    if (compiler && typeof compiler.compile === 'function') {
      let sourceAst: any = null;
      if (typeof astOrContent === 'string') {
        const parseResult: ParseResponse = parseSource(astOrContent, { filename: options.filename, collectTokens: true, collectSceneIndex: true });
        if (!parseResult.ok) return { ok: false, error: parseResult.error, diagnostics: parseResult.diagnostics };
        diagnostics = parseResult.diagnostics;
        sourceAst = parseResult.ast;
      } else {
        sourceAst = astOrContent;
      }
      const compResult = compiler.compile(sourceAst, { optimize: options.optimize });
      ir = compResult.ir ?? compResult.result ?? null;
      stats = normalizeStats(compResult.stats);
      diagnostics = diagnostics.concat(normalizeDiagnostics(compResult.diagnostics || []));
      const genTimeMs = compResult.genTimeMs ? compResult.genTimeMs : Math.round(performance.now() - start);
      if (stats) stats.genTimeMs = genTimeMs;
      return { ok: true, ir, diagnostics, stats: stats || { irNodeCount: 0, symbolCount: 0, genTimeMs }, genTimeMs };
    }
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.warn('[compileSource] Falling back to mock implementation:', err?.message);
  }

  // Fallback mock compile path
  try {
    if (typeof astOrContent === 'string') {
      const parseResult: ParseResponse = parseSource(astOrContent, { filename: options.filename, collectTokens: true, collectSceneIndex: true });
      if (!parseResult.ok) return { ok: false, error: parseResult.error, diagnostics: parseResult.diagnostics };
      diagnostics = parseResult.diagnostics;
      ir = { kind: 'MockIR', approxSize: parseResult.tokens.length };
      stats = { irNodeCount: parseResult.tokens.length, symbolCount: 0, genTimeMs: 0 };
    } else if (astOrContent && typeof astOrContent === 'object') {
      ir = { kind: 'MockIR', fromAst: true };
      stats = { irNodeCount: 0, symbolCount: 0, genTimeMs: 0 };
    } else {
      return { ok: false, error: 'Invalid input for compile' };
    }
    const end = (globalThis as any).performance?.now?.() ?? Date.now();
    const genTimeMs = Math.round(end - start);
    if (stats) stats.genTimeMs = genTimeMs;
    return { ok: true, ir, diagnostics, stats: stats!, genTimeMs };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Unknown compile error' };
  }
}

function safeRequire(mod: string): any | null { try { return eval('require')(mod); } catch { return null; } }

function normalizeStats(raw: any): CompileStats | null {
  if (!raw) return null;
  return {
    irNodeCount: typeof raw.irNodeCount === 'number' ? raw.irNodeCount : 0,
    symbolCount: typeof raw.symbolCount === 'number' ? raw.symbolCount : 0,
    genTimeMs: typeof raw.genTimeMs === 'number' ? raw.genTimeMs : 0
  };
}

function normalizeDiagnostics(raw: any[]): Diagnostic[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((d, i) => ({
    severity: (d.severity === 'warning' || d.severity === 'info') ? d.severity : 'error',
    message: String(d.message ?? 'Unknown'),
    start: normalizePos(d.start),
    end: normalizePos(d.end),
    code: d.code ? String(d.code) : undefined,
    _i: i
  } as any)).map(({ _i, ...rest }) => rest);
}

function normalizePos(p: any): { line: number; column: number } {
  if (!p || typeof p.line !== 'number' || typeof p.column !== 'number') return { line: 0, column: 0 };
  return { line: p.line, column: p.column };
}
