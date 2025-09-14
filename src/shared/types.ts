export interface Position { line: number; column: number; }
export interface Diagnostic { severity: 'error' | 'warning' | 'info'; message: string; start: Position; end: Position; code?: string; }
export interface TokenInfo { index: number; type: string; lexeme: string; start: Position; end: Position; }
export interface SceneMeta { id: string; line: number; title?: string; }
export interface CompileStats { irNodeCount: number; symbolCount: number; genTimeMs: number; }

export interface ParseSuccess {
  ok: true; ast: unknown; tokens: TokenInfo[]; diagnostics: Diagnostic[]; parseTimeMs: number; sceneIndex?: SceneMeta[];
}
export interface ParseFailure { ok: false; error: string; diagnostics?: Diagnostic[]; }
export type ParseResponse = ParseSuccess | ParseFailure;

export interface CompileSuccess { ok: true; ir: unknown; diagnostics: Diagnostic[]; stats: CompileStats; genTimeMs: number; }
export interface CompileFailure { ok: false; error: string; diagnostics?: Diagnostic[]; }
export type CompileResponse = CompileSuccess | CompileFailure;

export type FileKind = 'story' | 'json' | 'unknown';
