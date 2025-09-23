import { create } from "zustand";
import type {
  Diagnostic,
  TokenInfo,
  SceneMeta,
  ParseResponse,
  CompileResponse,
  CompileStats,
  FileKind,
} from "../../shared/types.js";

export interface FileState {
  path: string | null;
  content: string;
  lastDiskContent: string;
  isDirty: boolean;
  sizeBytes: number | null;
  lastModifiedMs: number | null;
  lineCount?: number;
  fileType?: "story" | "narrative" | "unknown";
  encoding?: string;
}

export interface ParseState {
  version: number;
  status: "idle" | "parsing" | "ready" | "error";
  ast: unknown | null;
  tokens: TokenInfo[];
  diagnostics: Diagnostic[];
  parseTimeMs: number | null;
  error?: string;
  lastParsedAt: number | null;
  fileKind?: FileKind;
}

export interface CompileState {
  version: number;
  status: "idle" | "compiling" | "ready" | "error";
  ir: unknown | null;
  diagnostics: Diagnostic[];
  stats: CompileStats | null;
  genTimeMs: number | null;
  error?: string;
  lastCompiledAt: number | null;
}

export interface UIState {
  theme: "light" | "dark";
  activePanel: "metadata" | "diagnostics";
  parseDebounceMs: number;
  sidebarView: "world";
  sidebarCollapsed: boolean;
  caretLine?: number;
  caretColumn?: number;
}

export interface NavigationState {
  sceneIndex: SceneMeta[];
  lastJumpSceneId?: string;
  pendingJump?: string;
}

export interface TimingState {
  startupAt: number;
  lastUserInputAt: number | null;
  lastParseScheduledAt: number | null;
}

export interface StoreState {
  file: FileState;
  parse: ParseState;
  compile: CompileState;
  ui: UIState;
  navigation: NavigationState;
  timings: TimingState;
  openFile: (
    path: string | undefined,
    content: string,
    sizeBytes?: number,
    lastModifiedMs?: number | null,
  ) => void;
  updateContent: (text: string) => void;
  requestParse: () => void;
  applyParseResult: (result: ParseResponse) => void;
  requestCompile: () => void;
  applyCompileResult: (result: CompileResponse) => void;
  setActivePanel: (panel: UIState["activePanel"]) => void;
  setTheme: (theme: "light" | "dark") => void;
  newFile: () => void;
  closeFile: () => void;
  markSaved: (path?: string) => void;
  setFilePath: (path: string | null) => void;
  setCaret: (line: number, column: number) => void;
  updateDerivedFileStats: () => void;
  setSceneIndex: (scenes: SceneMeta[]) => void;
  recordJump: (sceneId: string) => void;
  noteUserInput: () => void;
  scheduleParseDebounce: () => void;
  toggleSidebar: () => void;
  setSidebarView: (view: UIState["sidebarView"]) => void;
}

export type RootState = StoreState;

function loadPersistedUI(): UIState {
  try {
    if (typeof window === "undefined" || !("localStorage" in window)) {
      return {
        theme: "dark",
        activePanel: "metadata",
        parseDebounceMs: 200,
        sidebarView: "world",
        sidebarCollapsed: false,
      };
    }
    const theme =
      localStorage.getItem("storymode.theme") === "light" ? "light" : "dark";
    const panelRaw = localStorage.getItem("storymode.activePanel");
    const allowed: UIState["activePanel"][] = [
      "metadata",
      "diagnostics",
    ];
    const activePanel = allowed.includes(panelRaw as any)
      ? (panelRaw as UIState["activePanel"])
      : "metadata";
    const sidebarRaw = localStorage.getItem("storymode.sidebarView");
    const sidebarAllowed: UIState["sidebarView"][] = ["world"];
    const sidebarView = sidebarAllowed.includes(sidebarRaw as any)
      ? (sidebarRaw as UIState["sidebarView"])
      : "world";
    return {
      theme,
      activePanel,
      parseDebounceMs: 200,
      sidebarView,
      sidebarCollapsed:
        localStorage.getItem("storymode.sidebarCollapsed") === "true",
    };
  } catch {
    return {
      theme: "dark",
      activePanel: "metadata",
      parseDebounceMs: 200,
      sidebarView: "world",
      sidebarCollapsed: false,
    };
  }
}

const initialState = {
  file: {
    path: null,
    content: "",
    lastDiskContent: "",
    isDirty: false,
    sizeBytes: null,
    lastModifiedMs: null,
  },
  parse: {
    version: 0,
    status: "idle",
    ast: null,
    tokens: [],
    diagnostics: [],
    parseTimeMs: null,
    lastParsedAt: null,
  },
  compile: {
    version: 0,
    status: "idle",
    ir: null,
    diagnostics: [],
    stats: null,
    genTimeMs: null,
    lastCompiledAt: null,
  },
  ui: loadPersistedUI(),
  navigation: { sceneIndex: [] },
  timings: {
    startupAt: Date.now(),
    lastUserInputAt: null,
    lastParseScheduledAt: null,
  },
};

export const useStore = create<StoreState>((set, get) => ({
  ...initialState,
  openFile: (path, content, sizeBytes, lastModifiedMs) => {
    set((state) => ({
      file: {
        path: path ?? null,
        content,
        lastDiskContent: content,
        isDirty: false,
        sizeBytes: sizeBytes ?? content.length,
        lastModifiedMs: lastModifiedMs ?? null,
      },
      parse: {
        ...state.parse,
        status: "idle",
        version: state.parse.version + 1,
        ast: null,
        diagnostics: [],
        tokens: [],
        parseTimeMs: null,
      },
      navigation: { sceneIndex: [] },
    }));
  },
  updateContent: (text: string) => {
    set((state) => ({
      file: {
        ...state.file,
        content: text,
        isDirty: text !== state.file.lastDiskContent,
      },
    }));
    get().noteUserInput();
  },
  requestParse: () => {
    set((state) => ({
      parse: { ...state.parse, status: "parsing", error: undefined },
      timings: { ...state.timings, lastParseScheduledAt: Date.now() },
    }));
  },
  applyParseResult: (result: ParseResponse) => {
    if (!result) return;
    set((state) => {
      if (result.ok) {
        const scenes = result.sceneIndex ?? [];
        return {
          parse: {
            ...state.parse,
            version: state.parse.version + 1,
            status: "ready",
            ast: result.ast,
            tokens: result.tokens || [],
            diagnostics: result.diagnostics || [],
            parseTimeMs: result.parseTimeMs ?? null,
            lastParsedAt: Date.now(),
            error: undefined,
            fileKind: result.fileKind ?? state.parse.fileKind,
          },
          navigation: {
            ...state.navigation,
            sceneIndex: scenes,
            pendingJump: undefined,
          },
        };
      }
      return {
        parse: {
          ...state.parse,
          status: "error",
          error: result.error || "Parse failed",
          lastParsedAt: Date.now(),
        },
      };
    });
  },
  requestCompile: () =>
    set((state) => ({
      compile: { ...state.compile, status: "compiling", error: undefined },
    })),
  applyCompileResult: (result: CompileResponse) => {
    if (!result) return;
    set((state) => {
      if (result.ok) {
        return {
          compile: {
            ...state.compile,
            version: state.compile.version + 1,
            status: "ready",
            ir: result.ir,
            diagnostics: result.diagnostics || [],
            stats: result.stats || null,
            genTimeMs: result.genTimeMs ?? result.stats?.genTimeMs ?? null,
            error: undefined,
            lastCompiledAt: Date.now(),
          },
        };
      }
      return {
        compile: {
          ...state.compile,
          status: "error",
          error: result.error || "Compile failed",
          diagnostics: result.diagnostics || [],
          lastCompiledAt: Date.now(),
          ir: null,
        },
      };
    });
  },
  setActivePanel: (panel) =>
    set((state) => ({ ui: { ...state.ui, activePanel: panel } })),
  setTheme: (theme) => set((state) => ({ ui: { ...state.ui, theme } })),
  newFile: () =>
    set(() => ({
      file: {
        path: null,
        content: "",
        lastDiskContent: "",
        isDirty: false,
        sizeBytes: 0,
        lastModifiedMs: null,
      },
    })),
  closeFile: () =>
    set(() => ({
      file: {
        path: null,
        content: "",
        lastDiskContent: "",
        isDirty: false,
        sizeBytes: null,
        lastModifiedMs: null,
      },
    })),
  markSaved: (path) =>
    set((state) => ({
      file: {
        ...state.file,
        path: path ?? state.file.path,
        lastDiskContent: state.file.content,
        isDirty: false,
      },
    })),
  setFilePath: (path) => set((state) => ({ file: { ...state.file, path } })),
  setCaret: (line, column) =>
    set((state) => ({
      ui: { ...state.ui, caretLine: line, caretColumn: column },
    })),
  updateDerivedFileStats: () =>
    set((state) => {
      const content = state.file.content;
      const lines = content ? content.split(/\r?\n/).length : 0;
      const path = state.file.path;
      let fileType: "story" | "narrative" | "unknown" = "unknown";
      if (path?.endsWith(".story")) fileType = "story";
      else if (path?.endsWith(".narrative")) fileType = "narrative";
      return { file: { ...state.file, lineCount: lines, fileType } };
    }),
  setSceneIndex: (scenes) =>
    set((state) => ({
      navigation: { ...state.navigation, sceneIndex: scenes },
    })),
  recordJump: (sceneId) =>
    set((state) => ({
      navigation: {
        ...state.navigation,
        lastJumpSceneId: sceneId,
        pendingJump: undefined,
      },
    })),
  noteUserInput: () =>
    set((state) => ({
      timings: { ...state.timings, lastUserInputAt: Date.now() },
    })),
  scheduleParseDebounce: () =>
    set((state) => ({
      timings: { ...state.timings, lastParseScheduledAt: Date.now() },
    })),
  toggleSidebar: () =>
    set((state) => ({
      ui: { ...state.ui, sidebarCollapsed: !state.ui.sidebarCollapsed },
    })),
  setSidebarView: (view) =>
    set((state) => ({ ui: { ...state.ui, sidebarView: view } })),
}));

if (typeof window !== "undefined") {
  let prev = useStore.getState().ui;
  useStore.subscribe((state) => {
    const ui = state.ui;
    if (
      ui.theme !== prev.theme ||
      ui.activePanel !== prev.activePanel ||
      ui.sidebarView !== prev.sidebarView ||
      ui.sidebarCollapsed !== prev.sidebarCollapsed ||
      ui.previewVisible !== prev.previewVisible
    ) {
      try {
        localStorage.setItem("storymode.theme", ui.theme);
        localStorage.setItem("storymode.activePanel", ui.activePanel);
        localStorage.setItem("storymode.sidebarView", ui.sidebarView);
        localStorage.setItem(
          "storymode.sidebarCollapsed",
          String(ui.sidebarCollapsed),
        );
        localStorage.setItem(
          "storymode.previewVisible",
          String(ui.previewVisible),
        );
      } catch {
        // ignore quota errors
      }
      prev = ui;
    }
  });
}

export const selectFile = (s: StoreState) => s.file;
export const selectParse = (s: StoreState) => s.parse;
export const selectCompile = (s: StoreState) => s.compile;
export const selectUI = (s: StoreState) => s.ui;
export const selectNavigation = (s: StoreState) => s.navigation;
