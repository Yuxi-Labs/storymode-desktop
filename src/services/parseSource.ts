import { performance } from 'node:perf_hooks';
import type { FileKind, TokenInfo, Diagnostic, SceneMeta, ParseResponse } from '@shared/types';
import { detectFileKind } from './detectFileKind.js';

export interface ParseOptions { filename?: string; collectTokens?: boolean; collectSceneIndex?: boolean; }

// Placeholder until integrated with @yuxilabs/storymode-core
export function parseSource(content: string, options: ParseOptions = {}): ParseResponse {
  const start = performance.now();
  const kind: FileKind = detectFileKind(content, { filename: options.filename });
  // TODO integrate real parser. For now produce fake tokens & diagnostics.
  const diagnostics: Diagnostic[] = [];
  const tokens: TokenInfo[] = options.collectTokens !== false ? mockTokenize(content) : [];
  const sceneIndex: SceneMeta[] | undefined = options.collectSceneIndex !== false ? mockSceneIndex(content) : undefined;
  const ast = { kind: 'MockAst', nodeCount: tokens.length };
  const parseTimeMs = Math.round(performance.now() - start);
  return { ok: true, ast, tokens, diagnostics, parseTimeMs, sceneIndex };
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
