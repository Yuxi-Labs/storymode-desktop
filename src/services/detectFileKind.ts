import type { FileKind } from "../shared/types.js";

export interface DetectOptions {
  filename?: string;
  heuristics?: boolean;
}

export function detectFileKind(
  content: string,
  opts: DetectOptions = {},
): FileKind {
  const { filename, heuristics = true } = opts;
  if (filename?.endsWith(".story")) return "story";
  if (filename?.endsWith(".narrative")) return "narrative";
  if (!heuristics) return "unknown";

  const sample = content.slice(0, 8000);
  const trimmed = sample.trimStart();
  if (trimmed.startsWith("::story")) return "story";
  if (trimmed.startsWith("::narrative")) return "narrative";

  if (/^\s*::\s*narrative\b/im.test(sample)) return "narrative";
  if (/^\s*::\s*story\b/im.test(sample)) return "story";

  if (trimmed.startsWith("{")) {
    try {
      JSON.parse(content);
      return "json";
    } catch {
      // ignore
    }
  }

  return "unknown";
}
