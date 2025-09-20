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
  lineCount?: number;
  fileType?: 'story' | 'narrative' | 'unknown';
  encoding?: string; // future
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
  activePanel: 'editor' | 'diagnostics' | 'ast' | 'tokens' | 'ir' | 'info' | 'preview';
  parseDebounceMs: number;
  sidebarView: 'scenes' | 'explorer' | 'search' | 'outline';
  sidebarCollapsed: boolean;
  previewVisible: boolean; // inline preview split
  caretLine?: number;
  caretColumn?: number;
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
  // file mgmt
  newFile: () => void;
  closeFile: () => void;
  markSaved: (path?: string) => void;
  setFilePath: (path: string | null) => void;
  setCaret: (line: number, column: number) => void;
  updateDerivedFileStats: () => void;
}

export type RootState = StoreState;

// --- Persistence helpers (renderer only) ---
function loadPersistedUI(): Pick<UIState, 'theme' | 'activePanel' | 'parseDebounceMs' | 'sidebarView' | 'sidebarCollapsed' | 'previewVisible'> {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) {
      return { theme: 'light', activePanel: 'editor', parseDebounceMs: 200, sidebarView: 'scenes', sidebarCollapsed: false, previewVisible: false };
    }
    const theme = (localStorage.getItem('storymode.theme') === 'dark') ? 'dark' : 'light';
    const panelRaw = localStorage.getItem('storymode.activePanel');
  const allowed: UIState['activePanel'][] = ['editor', 'diagnostics', 'ast', 'tokens', 'ir', 'info', 'preview'];
    const activePanel: UIState['activePanel'] = allowed.includes(panelRaw as any) ? panelRaw as any : 'editor';
    return {
      theme,
      activePanel,
      parseDebounceMs: 200,
      sidebarView: (localStorage.getItem('storymode.sidebarView') as any) || 'scenes',
      sidebarCollapsed: localStorage.getItem('storymode.sidebarCollapsed') === 'true',
      previewVisible: localStorage.getItem('storymode.previewVisible') === 'true'
    };
  } catch {
    return { theme: 'light', activePanel: 'editor', parseDebounceMs: 200, sidebarView: 'scenes', sidebarCollapsed: false, previewVisible: false };
  }
}

const initialState: Omit<StoreState, 'openFile' | 'updateContent' | 'applyParseResult' | 'applyCompileResult' | 'setActivePanel' | 'beginCompile' | 'setTheme' | 'newFile' | 'closeFile' | 'markSaved' | 'setFilePath' | 'setCaret' | 'updateDerivedFileStats'> = {
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
  setTheme: (theme: 'light' | 'dark') => set((state: StoreState) => ({ ui: { ...state.ui, theme } })),
  newFile: () => set((_state: StoreState) => ({ file: { path: null, content: '', lastDiskContent: '', isDirty: false, sizeBytes: 0, lastModifiedMs: null } })),
  closeFile: () => set((_state: StoreState) => ({ file: { path: null, content: '', lastDiskContent: '', isDirty: false, sizeBytes: null, lastModifiedMs: null } })),
  markSaved: (path?: string) => set((state: StoreState) => ({ file: { ...state.file, path: path ?? state.file.path, lastDiskContent: state.file.content, isDirty: false } })),
  setFilePath: (path: string | null) => set((state: StoreState) => ({ file: { ...state.file, path } })),
  setCaret: (line: number, column: number) => set((state: StoreState) => ({ ui: { ...state.ui, caretLine: line, caretColumn: column } })),
  updateDerivedFileStats: () => set((state: StoreState) => {
    const content = state.file.content;
    const lines = content ? content.split(/\r?\n/).length : 0;
    const path = state.file.path;
    let fileType: 'story' | 'narrative' | 'unknown' = 'unknown';
    if (path?.endsWith('.story')) fileType = 'story'; else if (path?.endsWith('.narrative')) fileType = 'narrative';
    return { file: { ...state.file, lineCount: lines, fileType } };
  }),
  // layout actions
  toggleSidebar: () => set((state: StoreState) => ({ ui: { ...state.ui, sidebarCollapsed: !state.ui.sidebarCollapsed } })),
  setSidebarView: (view: UIState['sidebarView']) => set((state: StoreState) => ({ ui: { ...state.ui, sidebarView: view } })),
  togglePreview: () => set((state: StoreState) => ({ ui: { ...state.ui, previewVisible: !state.ui.previewVisible } }))
}));

// Persist changes (only runs in renderer)
if (typeof window !== 'undefined') {
  let prev = useStore.getState().ui;
  useStore.subscribe((state) => {
    const ui = state.ui;
    if (ui.theme !== prev.theme || ui.activePanel !== prev.activePanel ||
        ui.sidebarView !== prev.sidebarView || ui.sidebarCollapsed !== prev.sidebarCollapsed ||
        ui.previewVisible !== prev.previewVisible) {
      try {
        localStorage.setItem('storymode.theme', ui.theme);
        localStorage.setItem('storymode.activePanel', ui.activePanel);
        localStorage.setItem('storymode.sidebarView', ui.sidebarView);
        localStorage.setItem('storymode.sidebarCollapsed', String(ui.sidebarCollapsed));
        localStorage.setItem('storymode.previewVisible', String(ui.previewVisible));
      } catch { /* ignore quota or private mode errors */ }
      prev = ui;
    }
  });
}

export const selectFile = (s: StoreState) => s.file;
export const selectParse = (s: StoreState) => s.parse;
export const selectCompile = (s: StoreState) => s.compile;
export const selectUI = (s: StoreState) => s.ui;
