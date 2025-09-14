import type { FileKind } from '@shared/types';

export interface DetectOptions { filename?: string; heuristics?: boolean; }

export function detectFileKind(content: string, opts: DetectOptions = {}): FileKind {
  const { filename, heuristics = true } = opts;
  if (filename?.endsWith('.story')) return 'story';
  if (heuristics) {
    const trimmed = content.trimStart();
    if (trimmed.startsWith('{')) {
      try { JSON.parse(content); return 'json'; } catch {/* ignore */}
    }
    // crude heuristic: presence of 'scene' keyword at line starts
    const first200 = content.slice(0, 5000);
    if (/^\s*scene\s+/m.test(first200)) return 'story';
  }
  return 'unknown';
}
