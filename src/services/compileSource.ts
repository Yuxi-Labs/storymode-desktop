import type {
  CompileResponse,
  CompileStats,
  Diagnostic,
  FileKind,
  ParseResponse,
} from "../shared/types.js";
import { parseSource } from "./parseSource.js";
import { detectFileKind } from "./detectFileKind.js";

export interface CompileOptions {
  filename?: string;
  kind?: FileKind;
  contentKindHint?: FileKind;
}

type CompilerModule = typeof import("@yuxilabs/storymode-compiler");

type CompileFn = (
  ast: any,
  options?: Record<string, unknown>,
) => { ir: unknown; diagnostics: any[]; stats: any };

/**
 * Uses @yuxilabs/storymode-compiler when available. Falls back to a minimal mock IR when
 * the dependency is unavailable.
 */
export async function compileSource(
  input: unknown,
  options: CompileOptions = {},
): Promise<CompileResponse> {
  const start = performance.now();
  let diagnostics: Diagnostic[] = [];
  let ast: any = null;
  let kind: FileKind = options.kind ?? options.contentKindHint ?? "unknown";
  let sourceText: string | undefined;

  if (typeof input === "string") {
    sourceText = input;
    kind =
      options.kind ?? detectFileKind(input, { filename: options.filename });
  } else if (input && typeof input === "object") {
    ast = input;
    if (typeof (input as any).kind === "string") {
      if ((input as any).kind === "StoryFile") kind = "story";
      else if ((input as any).kind === "NarrativeFile") kind = "narrative";
    }
  } else {
    return { ok: false, error: "Invalid input for compile" };
  }

  try {
    const compiler: CompilerModule = await import(
      "@yuxilabs/storymode-compiler"
    );
    const compileFn: CompileFn = selectCompiler(compiler, kind);

    if (!ast && typeof sourceText === "string") {
      const parseResult: ParseResponse = await parseSource(sourceText, {
        filename: options.filename,
        collectTokens: true,
        collectSceneIndex: true,
      });
      if (!parseResult.ok)
        return {
          ok: false,
          error: parseResult.error,
          diagnostics: parseResult.diagnostics,
        };
      ast = parseResult.ast;
      diagnostics = diagnostics.concat(parseResult.diagnostics);
      kind = parseResult.fileKind ?? kind;
    }

    if (!ast) {
      return { ok: false, error: "Compile requires AST but none was provided" };
    }

    const result = compileFn(ast, {
      embedCoreVersion: true,
      normalizeMetadata: "join",
    });
    diagnostics = diagnostics.concat(normalizeDiagnostics(result.diagnostics));
    const stats = normalizeStats(result.stats, start);
    return {
      ok: true,
      ir: result.ir,
      diagnostics,
      stats,
      genTimeMs: stats.genTimeMs,
    };
  } catch (err: any) {
    console.warn(
      "[compileSource] Falling back to mock compiler:",
      err?.message,
    );
  }

  return fallbackCompile(sourceText, ast, start, diagnostics);
}

function selectCompiler(mod: CompilerModule, kind: FileKind): CompileFn {
  if (kind === "story" && typeof mod.compileStory === "function")
    return mod.compileStory;
  if (
    (kind === "narrative" || kind === "unknown") &&
    typeof mod.compileNarrative === "function"
  )
    return mod.compileNarrative;
  return mod.compileNarrative;
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
    end: { line: d.range?.end?.line ?? 0, column: d.range?.end?.column ?? 0 },
    code: d.code ? String(d.code) : undefined,
  }));
}

function normalizeStats(raw: any, start: number): CompileStats {
  const duration =
    typeof raw?.durationMs === "number"
      ? raw.durationMs
      : Math.round(performance.now() - start);
  return {
    irNodeCount: typeof raw?.nodes === "number" ? raw.nodes : 0,
    symbolCount: typeof raw?.kinds?.Symbol === "number" ? raw.kinds.Symbol : 0,
    genTimeMs: Math.round(duration),
  };
}

async function fallbackCompile(
  sourceText: string | undefined,
  ast: any,
  start: number,
  diagnostics: Diagnostic[],
): Promise<CompileResponse> {
  try {
    const nodeCount =
      ast && typeof ast === "object" && Array.isArray((ast as any).scenes)
        ? (ast as any).scenes.length
        : 0;
    const genTimeMs = Math.round(performance.now() - start);
    const stats: CompileStats = {
      irNodeCount: nodeCount,
      symbolCount: 0,
      genTimeMs,
    };
    return {
      ok: true,
      ir: sourceText
        ? { kind: "MockIR", preview: sourceText.slice(0, 2000) }
        : null,
      diagnostics,
      stats,
      genTimeMs,
    };
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message || "Unknown compile error",
      diagnostics,
    };
  }
}
