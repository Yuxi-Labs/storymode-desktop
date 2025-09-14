import { create } from 'zustand';
import type { Diagnostic, TokenInfo, SceneMeta, ParseResponse, CompileResponse, CompileStats } from '../../shared/types.js';

// Simplified initial slices based on STATE_MODEL.md
export interface FileState {
  path: string | null;
  content: string;
  lastDiskContent: string;
  isDirty: boolean;
  sizeBytes: number | null;
  lastModifiedMs: number | null;
}

export interface ParseState {
  version: number;
  status: 'idle' | 'parsing' | 'ready' | 'error';
  ast: unknown | null;
  tokens: TokenInfo[];
  diagnostics: Diagnostic[];
  parseTimeMs: number | null;
  error?: string;
  lastParsedAt: number | null;
  sceneIndex: SceneMeta[];
}

export interface UIState {
  theme: 'light' | 'dark';
  activePanel: 'editor' | 'diagnostics' | 'ast' | 'tokens' | 'ir';
  parseDebounceMs: number;
}

export interface CompileState {
  version: number;
  status: 'idle' | 'compiling' | 'ready' | 'error';
  ir: unknown | null;
  diagnostics: Diagnostic[];
  stats: CompileStats | null;
  genTimeMs: number | null;
  error?: string;
  lastCompiledAt: number | null;
}

export interface StoreState {
  file: FileState;
  parse: ParseState;
  compile: CompileState;
  ui: UIState;
  // Actions
  openFile: (path: string | undefined, content: string, sizeBytes?: number, lastModifiedMs?: number | null) => void;
  updateContent: (text: string) => void;
  applyParseResult: (result: ParseResponse) => void;
  applyCompileResult: (result: CompileResponse) => void;
  setActivePanel: (panel: UIState['activePanel']) => void;
  beginCompile: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export type RootState = StoreState;

// --- Persistence helpers (renderer only) ---
function loadPersistedUI(): Pick<UIState, 'theme' | 'activePanel' | 'parseDebounceMs'> {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) {
      return { theme: 'light', activePanel: 'editor', parseDebounceMs: 200 };
    }
    const theme = (localStorage.getItem('storymode.theme') === 'dark') ? 'dark' : 'light';
    const panelRaw = localStorage.getItem('storymode.activePanel');
    const allowed: UIState['activePanel'][] = ['editor', 'diagnostics', 'ast', 'tokens', 'ir'];
    const activePanel: UIState['activePanel'] = allowed.includes(panelRaw as any) ? panelRaw as any : 'editor';
    return { theme, activePanel, parseDebounceMs: 200 };
  } catch {
    return { theme: 'light', activePanel: 'editor', parseDebounceMs: 200 };
  }
}

const initialState: Omit<StoreState, 'openFile' | 'updateContent' | 'applyParseResult' | 'applyCompileResult' | 'setActivePanel' | 'beginCompile' | 'setTheme'> = {
  file: { path: null, content: '', lastDiskContent: '', isDirty: false, sizeBytes: null, lastModifiedMs: null },
  parse: { version: 0, status: 'idle', ast: null, tokens: [], diagnostics: [], parseTimeMs: null, lastParsedAt: null, sceneIndex: [] },
  compile: { version: 0, status: 'idle', ir: null, diagnostics: [], stats: null, genTimeMs: null, lastCompiledAt: null },
  ui: loadPersistedUI()
};

export const useStore = create<StoreState>((set: (partial: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void, _get: () => StoreState) => ({
  ...initialState,
  openFile: (path: string | undefined, content: string, sizeBytes?: number, lastModifiedMs?: number | null) => set((state: StoreState) => ({
    file: {
      path: path ?? null,
      content,
      lastDiskContent: content,
      isDirty: false,
      sizeBytes: sizeBytes ?? content.length,
      lastModifiedMs: lastModifiedMs ?? null
    },
    parse: { ...state.parse, status: 'idle' }
  })),
  updateContent: (text: string) => set((state: StoreState) => ({
    file: { ...state.file, content: text, isDirty: text !== state.file.lastDiskContent }
  })),
  applyParseResult: (result: ParseResponse) => set((state: StoreState) => {
    if (!result) return {} as any;
    if (result.ok) {
      return {
        parse: {
          ...state.parse,
            version: state.parse.version + 1,
            status: 'ready',
            ast: result.ast,
            tokens: result.tokens || [],
            diagnostics: result.diagnostics || [],
            parseTimeMs: result.parseTimeMs ?? null,
            lastParsedAt: Date.now(),
            error: undefined,
            sceneIndex: result.sceneIndex || []
        }
      };
    } else {
      return {
        parse: { ...state.parse, status: 'error', error: result.error || 'Parse failed', lastParsedAt: Date.now() }
      };
    }
  }),
  applyCompileResult: (result: CompileResponse) => set((state: StoreState) => {
    if (!result) return {} as any;
    if (result.ok) {
      return {
        compile: {
          ...state.compile,
          version: state.compile.version + 1,
          status: 'ready',
          ir: result.ir,
          diagnostics: result.diagnostics || [],
          stats: result.stats || null,
          genTimeMs: result.genTimeMs ?? (result.stats?.genTimeMs ?? null),
          error: undefined,
          lastCompiledAt: Date.now()
        }
      };
    } else {
      return {
        compile: { ...state.compile, status: 'error', error: result.error || 'Compile failed', lastCompiledAt: Date.now(), ir: null }
      };
    }
  }),
  beginCompile: () => set((state: StoreState) => ({ compile: { ...state.compile, status: 'compiling' } })),
  setActivePanel: (panel: UIState['activePanel']) => set((state: StoreState) => ({ ui: { ...state.ui, activePanel: panel } })),
  setTheme: (theme: 'light' | 'dark') => set((state: StoreState) => ({ ui: { ...state.ui, theme } }))
}));

// Persist changes (only runs in renderer)
if (typeof window !== 'undefined') {
  let prev = useStore.getState().ui;
  useStore.subscribe((state) => {
    const ui = state.ui;
    if (ui.theme !== prev.theme || ui.activePanel !== prev.activePanel) {
      try {
        localStorage.setItem('storymode.theme', ui.theme);
        localStorage.setItem('storymode.activePanel', ui.activePanel);
      } catch { /* ignore quota or private mode errors */ }
      prev = ui;
    }
  });
}

export const selectFile = (s: StoreState) => s.file;
export const selectParse = (s: StoreState) => s.parse;
export const selectCompile = (s: StoreState) => s.compile;
export const selectUI = (s: StoreState) => s.ui;
