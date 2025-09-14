import { performance } from 'node:perf_hooks';
import type { CompileResponse, CompileStats, Diagnostic, ParseResponse } from '@shared/types';
import { parseSource } from './parseSource.js';

export interface CompileOptions { optimize?: boolean; filename?: string; }

// Placeholder compile using parse + simple IR summary
export function compileSource(astOrContent: unknown | string, options: CompileOptions = {}): CompileResponse {
  const start = performance.now();
  let diagnostics: Diagnostic[] = [];
  let ir: unknown = null;
  let stats: CompileStats | null = null;
  if (typeof astOrContent === 'string') {
    const parseResult: ParseResponse = parseSource(astOrContent, { filename: options.filename, collectTokens: true, collectSceneIndex: true });
    if (!parseResult.ok) {
      return { ok: false, error: parseResult.error, diagnostics: parseResult.diagnostics };
    }
    diagnostics = parseResult.diagnostics;
    ir = { kind: 'MockIR', approxSize: parseResult.tokens.length };
    stats = { irNodeCount: parseResult.tokens.length, symbolCount: 0, genTimeMs: 0 };
  } else if (astOrContent && typeof astOrContent === 'object') {
    ir = { kind: 'MockIR', fromAst: true };
    stats = { irNodeCount: 0, symbolCount: 0, genTimeMs: 0 };
  } else {
    return { ok: false, error: 'Invalid input for compile' };
  }
  const genTimeMs = Math.round(performance.now() - start);
  if (stats) stats.genTimeMs = genTimeMs;
  return { ok: true, ir, diagnostics, stats: stats!, genTimeMs };
}
