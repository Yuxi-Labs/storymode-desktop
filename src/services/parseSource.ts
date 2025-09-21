import type {
  FileKind,
  TokenInfo,
  Diagnostic,
  SceneMeta,
  ParseResponse,
} from "../shared/types.js";
import { detectFileKind } from "./detectFileKind.js";

export interface ParseOptions {
  filename?: string;
  collectTokens?: boolean;
  collectSceneIndex?: boolean;
}

type CoreModule = typeof import("@yuxilabs/storymode-core");

export async function parseSource(
  content: string,
  options: ParseOptions = {},
): Promise<ParseResponse> {
  const start = performance.now();
  const kind: FileKind = detectFileKind(content, {
    filename: options.filename,
  });

  try {
    const core: CoreModule = await import("@yuxilabs/storymode-core");
    const parseFn = selectParser(core, kind);
    const result = parseFn(content);
    const diagnostics = normalizeDiagnostics(result.diagnostics);
    const includeTokens = options.collectTokens !== false;
    const tokens = includeTokens ? normalizeTokens(result.tokens) : [];
    const sceneIndex =
      options.collectSceneIndex === false
        ? undefined
        : buildSceneIndex(result.ast, kind);
    const ast = result.ast ?? null;
    const end = performance.now();

    return {
      ok: true,
      ast,
      diagnostics,
      tokens,
      parseTimeMs: Math.round(end - start),
      sceneIndex,
      fileKind: kind,
    };
  } catch (err: any) {
    console.warn(
      "[parseSource] Falling back to heuristic parser:",
      err?.message,
    );
  }

  return fallbackParse(content, start, options, kind);
}

function selectParser(core: CoreModule, kind: FileKind) {
  if (kind === "story" && typeof core.parseStory === "function") {
    return core.parseStory;
  }
  if (
    (kind === "narrative" || kind === "unknown") &&
    typeof core.parseNarrative === "function"
  ) {
    return core.parseNarrative;
  }
  return core.parseNarrative;
}

function normalizeDiagnostics(raw: any[] | undefined): Diagnostic[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((d) => ({
    severity:
      d.severity === "warning" || d.severity === "info" ? d.severity : "error",
    message: String(d.message ?? "Unknown"),
    start: {
      line: d.range?.start?.line ?? 0,
      column: d.range?.start?.column ?? 0,
    },
    end: {
      line: d.range?.end?.line ?? 0,
      column: d.range?.end?.column ?? 0,
    },
    code: d.code ? String(d.code) : undefined,
  }));
}

function normalizeTokens(raw: any[] | undefined): TokenInfo[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 20000).map((token, index) => ({
    index,
    type: String(token.type ?? "unknown"),
    lexeme: String(token.value ?? "").slice(0, 128),
    start: {
      line: token.range?.start?.line ?? 0,
      column: token.range?.start?.column ?? 0,
    },
    end: {
      line: token.range?.end?.line ?? 0,
      column: token.range?.end?.column ?? 0,
    },
  }));
}

function buildSceneIndex(ast: any, kind: FileKind): SceneMeta[] | undefined {
  if (!ast) return [];
  if (kind === "narrative" && Array.isArray(ast.scenes)) {
    return ast.scenes
      .map((scene: any) => ({
        id: String(scene.id || ""),
        title: scene.metadata?.title || scene.metadata?.label,
        line: Math.max(0, (scene.range?.start?.line ?? 1) - 1),
      }))
      .filter((scene: SceneMeta) => scene.id.length > 0);
  }
  return [];
}

async function fallbackParse(
  content: string,
  start: number,
  options: ParseOptions,
  kind: FileKind,
): Promise<ParseResponse> {
  try {
    const diagnostics: Diagnostic[] = [];
    const includeTokens = options.collectTokens !== false;
    const tokens: TokenInfo[] = includeTokens ? mockTokenize(content) : [];
    const end = performance.now();

    return {
      ok: true,
      ast: null,
      diagnostics,
      tokens,
      parseTimeMs: Math.round(end - start),
      sceneIndex: [],
      fileKind: kind,
    };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Unknown parse error" };
  }
}

function mockTokenize(content: string): TokenInfo[] {
  const lines = content.split(/\r?\n/);
  const tokens: TokenInfo[] = [];
  let index = 0;

  for (let lineNo = 0; lineNo < lines.length; lineNo++) {
    const line = lines[lineNo];
    const parts = line.split(/\s+/).filter(Boolean);
    let cursor = 0;

    for (const part of parts) {
      const startCol = line.indexOf(part, cursor) + 1;
      const endCol = startCol + part.length;
      tokens.push({
        index: index++,
        type: "word",
        lexeme: part.slice(0, 64),
        start: { line: lineNo + 1, column: startCol },
        end: { line: lineNo + 1, column: endCol },
      });
      cursor = endCol - 1;
    }
  }

  return tokens.slice(0, 5000);
}
