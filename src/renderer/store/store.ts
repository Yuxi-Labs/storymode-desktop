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
  themeMode: "light" | "dark" | "auto";
  themeId: string | null;
  activePanel: "metadata" | "diagnostics" | undefined;
  parseDebounceMs: number;
  sidebarView: "world";
  sidebarCollapsed: boolean;
  inspectorVisible: boolean;
  statusBarVisible: boolean;
  previewVisible: boolean;
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
  storyModel: {
    story?: { id: string; title: string; narrativeIds: string[] };
    storyContent?: string;
    narratives: Record<string, { id: string; title: string; sceneIds: string[]; order: number; content?: string }>;
    scenes: Record<string, { id: string; title: string; narrativeId: string; content: string; order: number }>;
    activeSceneId?: string;
    activeEntity?: { type: 'story' } | { type: 'narrative'; id: string } | { type: 'scene'; id: string };
  };
  notifications: { items: Array<{ id: string; message: string; level: 'info' | 'warn' | 'error'; read?: boolean }>; unread: number };
  pushNotification: (n: { id?: string; message: string; level?: 'info' | 'warn' | 'error' }) => void;
  markAllRead: () => void;
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
  setThemeMode: (mode: UIState["themeMode"]) => void;
  applyThemePreset: (themeId: string | null) => void;
  applySystemTheme: (theme: UIState["theme"]) => void;
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
  setPreviewVisible: (visible: boolean) => void;
  togglePreview: () => void;
  setInspectorVisible: (visible: boolean) => void;
  toggleInspector: () => void;
  setStatusBarVisible: (visible: boolean) => void;
  toggleStatusBar: () => void;
  // Hierarchical story model actions
  newStory: (title?: string) => void;
  addNarrative: (title?: string) => string | undefined;
  addScene: (narrativeId: string, title?: string) => string | undefined;
  setActiveScene: (sceneId: string) => void;
  setActiveStory: () => void;
  setActiveNarrative: (id: string) => void;
  deleteNarrative: (id: string) => void;
  renameStory: (title: string) => void;
  renameNarrative: (id: string, title: string) => void;
  renameScene: (id: string, title: string) => void;
  deleteScene: (id: string) => void;
  serializeStoryComposite: () => string;
  loadStoryComposite: (json: string, path?: string) => boolean;
}

const defaultEncoding = "utf-8";

const themeStorageKey = {
  themeMode: "storymode.themeMode",
  themeId: "storymode.themeId",
  activePanel: "storymode.activePanel",
  sidebarView: "storymode.sidebarView",
  sidebarCollapsed: "storymode.sidebarCollapsed",
  inspectorVisible: "storymode.inspectorVisible",
  statusBarVisible: "storymode.statusBarVisible",
  previewVisible: "storymode.previewVisible",
} as const;

const themePresetMap: Record<string, UIState["theme"]> = {
  "storymode-dark": "dark",
};

const allowedPanels: UIState["activePanel"][] = ["metadata", "diagnostics"];
const allowedSidebarViews: UIState["sidebarView"][] = ["world"];

export type RootState = StoreState;

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return !!(
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  } catch {
    return true;
  }
}

function resolveThemeFromMode(
  mode: UIState["themeMode"],
  fallback: UIState["theme"],
): UIState["theme"] {
  if (mode === "auto") {
    return systemPrefersDark() ? "dark" : "light";
  }
  return mode;
}

function loadPersistedUI(): UIState {
  const baseMode: UIState["themeMode"] = "dark";
  if (typeof window === "undefined" || !("localStorage" in window)) {
    const resolved = resolveThemeFromMode(baseMode, "dark");
    return {
      theme: resolved,
      themeMode: baseMode,
      themeId: "storymode-dark",
  activePanel: undefined,
      parseDebounceMs: 200,
      sidebarView: "world",
      sidebarCollapsed: false,
  inspectorVisible: false, // ensure default is false
      statusBarVisible: true,
      previewVisible: false,
    };
  }

  const storage = window.localStorage;
  const storedMode = storage.getItem(themeStorageKey.themeMode);
  const themeMode: UIState["themeMode"] =
    storedMode === "light" || storedMode === "auto" ? storedMode : "dark";

  const storedThemeId = storage.getItem(themeStorageKey.themeId);
  const presetTheme = storedThemeId ? themePresetMap[storedThemeId] : undefined;
  const theme = presetTheme ?? resolveThemeFromMode(themeMode, "dark");
  const currentThemeId = storedThemeId && presetTheme ? storedThemeId : null;

  const panelRaw = storage.getItem(themeStorageKey.activePanel);
  const activePanel = allowedPanels.includes(panelRaw as any)
    ? (panelRaw as UIState["activePanel"])
    : undefined;

  const sidebarRaw = storage.getItem(themeStorageKey.sidebarView);
  const sidebarView = allowedSidebarViews.includes(sidebarRaw as any)
    ? (sidebarRaw as UIState["sidebarView"])
    : "world";

  const sidebarCollapsed = storage.getItem(themeStorageKey.sidebarCollapsed) === "true";
  const inspectorVisible = storage.getItem(themeStorageKey.inspectorVisible) === "true";
  const statusBarVisible = storage.getItem(themeStorageKey.statusBarVisible) !== "false";
  const previewVisible = storage.getItem(themeStorageKey.previewVisible) === "true";

  return {
    theme,
    themeMode,
    themeId: currentThemeId ?? (themeMode === "dark" ? "storymode-dark" : null),
    activePanel,
    parseDebounceMs: 200,
    sidebarView,
    sidebarCollapsed,
    inspectorVisible,
    statusBarVisible,
    previewVisible,
  };
}

const initialState: Pick<StoreState, "file" | "parse" | "compile" | "ui" | "navigation" | "timings"> = {
  file: {
    path: null,
    content: "",
    lastDiskContent: "",
    isDirty: false,
    sizeBytes: null,
    lastModifiedMs: null,
    encoding: defaultEncoding,
  },
  parse: {
    version: 0,
    status: "idle",
    ast: null,
    tokens: [],
    diagnostics: [],
    parseTimeMs: null,
    error: undefined,
    lastParsedAt: null,
  },
  compile: {
    version: 0,
    status: "idle",
    ir: null,
    diagnostics: [],
    stats: null,
    genTimeMs: null,
    error: undefined,
    lastCompiledAt: null,
  },
  ui: { ...loadPersistedUI(), inspectorVisible: false },
  navigation: { sceneIndex: [] },
  timings: {
    startupAt: Date.now(),
    lastUserInputAt: null,
    lastParseScheduledAt: null,
  },
};

// Utility ID generator
function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function createSeedStory(title = "Untitled") {
  const storyId = genId("story");
  const narrativeId = genId("narrative");
  const sceneId = genId("scene");
  return {
    story: { id: storyId, title, narrativeIds: [narrativeId] },
    narratives: {
      [narrativeId]: { id: narrativeId, title: "Untitled", sceneIds: [sceneId], order: 0 },
    },
    scenes: {
      [sceneId]: { id: sceneId, title: "Untitled Scene", narrativeId, content: "", order: 0 },
    },
    activeSceneId: sceneId,
  } as StoreState['storyModel'];
}

function buildCompositePayload(sm: StoreState['storyModel'], encoding: string | undefined) {
  if (!sm.story) return { version:1, empty: true };
  const story = sm.story;
  return {
    version: 1,
    encoding: encoding || defaultEncoding,
    activeSceneId: sm.activeSceneId,
    story: {
      id: story.id,
      title: story.title,
      narratives: story.narrativeIds.map(nid => {
        const n = sm.narratives[nid];
        return !n ? null : {
          id: n.id,
            title: n.title,
            order: n.order,
            scenes: n.sceneIds.map(sid => {
              const sc = sm.scenes[sid];
              return !sc ? null : { id: sc.id, title: sc.title, order: sc.order, content: sc.content };
            }).filter(Boolean),
        };
      }).filter(Boolean),
    },
  };
}

// Persist current editor buffer into whichever entity is active (story / narrative / scene)
function flushActiveEntity(get: () => StoreState, set: (fn: any) => void, content: string) {
  const state = get();
  const sm = state.storyModel;
  const active = sm.activeEntity;
  if (!active) return;
  if (active.type === 'story') {
    set(() => ({ storyModel: { ...sm, storyContent: content } }));
  } else if (active.type === 'narrative') {
    const n = sm.narratives[active.id];
    if (!n) return;
    set(() => ({ storyModel: { ...sm, narratives: { ...sm.narratives, [active.id]: { ...n, content } } } }));
  } else if (active.type === 'scene') {
    const sc = sm.scenes[active.id];
    if (!sc) return;
    set(() => ({ storyModel: { ...sm, scenes: { ...sm.scenes, [active.id]: { ...sc, content } } } }));
  }
}

export const useStore = create<StoreState>((set, get) => ({
  ...initialState,
  storyModel: { story: undefined, storyContent: '', narratives: {}, scenes: {}, activeSceneId: undefined, activeEntity: undefined },
  notifications: { items: [], unread: 0 },
  serializeStoryComposite: () => {
    const state = get();
    const payload = buildCompositePayload(state.storyModel, state.file.encoding);
    return JSON.stringify(payload, null, 2);
  },
  loadStoryComposite: (json, path) => {
    try {
      const parsed = JSON.parse(json);
      if (!parsed || typeof parsed !== 'object') return false;
      if (parsed.version !== 1 || !parsed.story) return false;
      const story = parsed.story;
      if (!Array.isArray(story.narratives)) return false;
      const narratives: StoreState['storyModel']['narratives'] = {};
      const scenes: StoreState['storyModel']['scenes'] = {};
      const narrativeIds: string[] = [];
      story.narratives.forEach((n: any, nIdx: number) => {
        if (!n || !n.id || !Array.isArray(n.scenes)) return;
        narrativeIds.push(n.id);
        narratives[n.id] = { id: n.id, title: n.title || `Narrative ${nIdx+1}`, sceneIds: [], order: typeof n.order === 'number' ? n.order : nIdx };
        n.scenes.forEach((sc: any, sIdx: number) => {
          if (!sc || !sc.id) return;
            narratives[n.id].sceneIds.push(sc.id);
            scenes[sc.id] = { id: sc.id, title: sc.title || `Scene ${sIdx+1}`, narrativeId: n.id, content: sc.content || '', order: typeof sc.order === 'number' ? sc.order : sIdx };
        });
      });
      const activeSceneId: string | undefined = parsed.activeSceneId && scenes[parsed.activeSceneId] ? parsed.activeSceneId : (narrativeIds.length ? narratives[narrativeIds[0]].sceneIds[0] : undefined);
      const content = activeSceneId ? scenes[activeSceneId].content : '';
      set((state) => ({
  storyModel: { story: { id: story.id || 'story-unknown', title: story.title || 'Untitled', narrativeIds }, narratives, scenes, activeSceneId },
        file: { ...state.file, path: path ?? state.file.path, content, lastDiskContent: content, isDirty: false, encoding: parsed.encoding || state.file.encoding || 'utf-8' },
        parse: { ...state.parse, status: 'idle', ast: null, diagnostics: [], tokens: [], version: state.parse.version + 1 },
        compile: { ...state.compile, status: 'idle', ir: null, diagnostics: [], version: state.compile.version + 1 },
      }));
      return true;
    } catch {
      return false;
    }
  },
  pushNotification: (n) => set((state) => {
    const id = n.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const item = { id, message: n.message, level: n.level || 'info', read: false };
    return { notifications: { items: [item, ...state.notifications.items].slice(0, 50), unread: state.notifications.unread + 1 } };
  }),
  markAllRead: () => set((state) => ({ notifications: { items: state.notifications.items.map(i => ({ ...i, read: true })), unread: 0 } })),
  openFile: (path, content, sizeBytes, lastModifiedMs) => {
    set((state) => ({
      file: {
        path: path ?? null,
        content,
        lastDiskContent: content,
        isDirty: false,
        sizeBytes: sizeBytes ?? content.length,
        lastModifiedMs: lastModifiedMs ?? null,
        encoding: defaultEncoding,
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
      // Wrap loaded content into a single-story single-narrative single-scene model if none exists yet
      storyModel: state.storyModel.story ? state.storyModel : (() => {
        const seed = createSeedStory(path ? path.split(/[/\\]/).pop() || "Story" : "Story");
        const sceneId = seed.activeSceneId!;
        seed.scenes[sceneId].content = content;
        return seed;
      })(),
    }));
  },
  updateContent: (text: string) => {
    set((state) => ({
      file: {
        ...state.file,
        content: text,
        isDirty: true,
      },
      storyModel: (() => {
        const sm = state.storyModel;
        if (!sm.activeSceneId || !sm.scenes[sm.activeSceneId]) return sm;
        return {
          ...sm,
          scenes: {
            ...sm.scenes,
            [sm.activeSceneId]: { ...sm.scenes[sm.activeSceneId], content: text },
          },
        };
      })(),
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
          },
        };
      }
      return {
        parse: {
          ...state.parse,
          version: state.parse.version + 1,
          status: "error",
          diagnostics: result.diagnostics || [],
          error: result.error || "Parse failed",
          lastParsedAt: Date.now(),
        },
      };
    });
  },
  requestCompile: () => {
    set((state) => ({
      compile: { ...state.compile, status: "compiling", error: undefined },
    }));
  },
  applyCompileResult: (result: CompileResponse) => {
    if (!result) return;
    set((state) => {
      if (result.ok) {
        return {
          compile: {
            ...state.compile,
            version: state.compile.version + 1,
            status: "ready",
            ir: (result as any).ir ?? null,
            diagnostics: result.diagnostics || [],
            stats: result.stats ?? null,
            genTimeMs: result.genTimeMs ?? null,
            error: undefined,
            lastCompiledAt: Date.now(),
          },
          file: { ...state.file, isDirty: state.file.isDirty },
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
        file: { ...state.file, isDirty: state.file.isDirty },
      };
    });
  },
  setActivePanel: (panel) =>
    set((state) => ({ ui: { ...state.ui, activePanel: panel } })),
  setTheme: (theme) =>
    set((state) => ({
      ui: {
        ...state.ui,
        theme,
        themeMode: theme,
        themeId: null,
      },
    })),
  setThemeMode: (mode) =>
    set((state) => ({
      ui: {
        ...state.ui,
        themeMode: mode,
        themeId: null,
        theme: resolveThemeFromMode(mode, state.ui.theme),
      },
    })),
  applyThemePreset: (themeId) =>
    set((state) => ({
      ui: {
        ...state.ui,
        themeId,
        theme: themeId ? themePresetMap[themeId] ?? state.ui.theme : state.ui.theme,
      },
    })),
  applySystemTheme: (theme) =>
    set((state) => ({
      ui:
        state.ui.themeMode === "auto" && !state.ui.themeId && state.ui.theme !== theme
          ? { ...state.ui, theme }
          : state.ui,
    })),
  newFile: () =>
    set(() => ({
      file: {
        path: null,
        content: "",
        lastDiskContent: "",
        isDirty: false,
        sizeBytes: 0,
        lastModifiedMs: null,
        encoding: defaultEncoding,
      },
      storyModel: createSeedStory(),
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
        encoding: defaultEncoding,
      },
      storyModel: { story: undefined, narratives: {}, scenes: {}, activeSceneId: undefined },
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
      return {
        file: {
          ...state.file,
          lineCount: lines,
          fileType,
          encoding: state.file.encoding ?? defaultEncoding,
        },
      };
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
  setPreviewVisible: (visible) =>
    set((state) => ({ ui: { ...state.ui, previewVisible: visible } })),
  togglePreview: () =>
    set((state) => ({
      ui: { ...state.ui, previewVisible: !state.ui.previewVisible },
    })),
  setInspectorVisible: (visible) =>
    set((state) => ({ ui: { ...state.ui, inspectorVisible: visible } })),
  toggleInspector: () =>
    set((state) => ({
      ui: { ...state.ui, inspectorVisible: !state.ui.inspectorVisible },
    })),
  setStatusBarVisible: (visible) =>
    set((state) => ({ ui: { ...state.ui, statusBarVisible: visible } })),
  toggleStatusBar: () =>
    set((state) => ({
      ui: { ...state.ui, statusBarVisible: !state.ui.statusBarVisible },
    })),
  // Hierarchical model actions
  newStory: (title) => {
    const seed = createSeedStory(title || 'Untitled');
    // Open directly to the first (active) scene per spec: editor should show Scene 1.
    const story = seed.story!;
    const narrativeId = story.narrativeIds[0];
    const narrative = seed.narratives[narrativeId];
    const sceneId = seed.activeSceneId!;
    const scene = seed.scenes[sceneId];
    const scenePath = `${story.title || 'Untitled'}/${narrative.title || 'Untitled'}/${scene.title}.scene`;
    set((state) => ({
      storyModel: { ...seed, activeEntity: { type: 'scene', id: sceneId } },
      file: { ...state.file, path: scenePath, content: scene.content, isDirty: false },
    }));
  },
  addNarrative: (title) => {
    const state = get();
    if (!state.storyModel.story) return undefined;
    const id = genId("narrative");
    const order = state.storyModel.story!.narrativeIds.length;
    set(() => ({
      storyModel: {
        ...state.storyModel,
        story: { ...state.storyModel.story!, narrativeIds: [...state.storyModel.story!.narrativeIds, id] },
        narratives: { ...state.storyModel.narratives, [id]: { id, title: title || 'Untitled', sceneIds: [], order, content: '' } },
      },
    }));
    return id;
  },
  addScene: (narrativeId, title) => {
    const state = get();
    const narrative = state.storyModel.narratives[narrativeId];
    if (!narrative) return undefined;
    const id = genId("scene");
    set(() => ({
      storyModel: {
        ...state.storyModel,
        narratives: {
          ...state.storyModel.narratives,
          [narrativeId]: {
            ...narrative,
            sceneIds: [...narrative.sceneIds, id],
          },
        },
        scenes: {
          ...state.storyModel.scenes,
          [id]: { id, title: title || `Scene ${narrative.sceneIds.length + 1}`, narrativeId, content: "", order: narrative.sceneIds.length },
        },
      },
    }));
    return id;
  },
  setActiveScene: (sceneId) => {
    const state = get();
    const sm = state.storyModel;
    if (!sm.scenes[sceneId]) return;
    flushActiveEntity(get, set, state.file.content);
    const newContent = sm.scenes[sceneId].content;
    const scene = sm.scenes[sceneId];
    const narrative = sm.narratives[scene.narrativeId];
    const storyTitle = sm.story?.title || 'Untitled';
    const narrativeTitle = narrative?.title || 'Untitled';
    const syntheticPath = `${storyTitle}/${narrativeTitle}/${scene.title}.scene`;
    set(() => ({ storyModel: { ...sm, activeSceneId: sceneId, activeEntity: { type: 'scene', id: sceneId } }, file: { ...state.file, path: syntheticPath, content: newContent, isDirty: false } }));
  },
  setActiveStory: () => {
    const state = get();
    const sm = state.storyModel;
    if (!sm.story) return;
    flushActiveEntity(get, set, state.file.content);
    set(() => ({ storyModel: { ...sm, activeEntity: { type: 'story' } }, file: { ...state.file, path: `${sm.story!.title || 'Untitled'}.story`, content: sm.storyContent || '', isDirty: false } }));
  },
  setActiveNarrative: (id: string) => {
    const state = get();
    const sm = state.storyModel;
    const n = sm.narratives[id];
    if (!n) return;
    flushActiveEntity(get, set, state.file.content);
    set(() => ({ storyModel: { ...sm, activeEntity: { type: 'narrative', id } }, file: { ...state.file, path: `${n.title || 'Untitled'}.narrative`, content: n.content || '', isDirty: false } }));
  },
  deleteNarrative: (id: string) => {
    const state = get();
    const sm = state.storyModel;
    if (!sm.story || !sm.narratives[id]) return;
    const remainingIds = sm.story.narrativeIds.filter(nid => nid !== id);
    const newNarratives = { ...sm.narratives };
    delete newNarratives[id];
    const newScenes = { ...sm.scenes };
    Object.values(sm.scenes).forEach(sc => { if (sc.narrativeId === id) delete newScenes[sc.id]; });
    let activeEntity = sm.activeEntity;
    let fileUpdate: Partial<FileState> = {};
    if (activeEntity && activeEntity.type === 'narrative' && activeEntity.id === id) {
      activeEntity = { type: 'story' };
      fileUpdate = { path: `${sm.story.title || 'Untitled'}.story`, content: sm.storyContent || '', isDirty: false } as any;
    }
    set((s) => ({ storyModel: { ...sm, story: { ...sm.story!, narrativeIds: remainingIds }, narratives: newNarratives, scenes: newScenes, activeEntity }, file: { ...s.file, ...fileUpdate } }));
  },
  renameStory: (title: string) => {
    const state = get();
    const sm = state.storyModel;
    if (!sm.story) return;
    const story = { ...sm.story, title };
    let file = state.file;
    if (sm.activeEntity?.type === 'story') {
      file = { ...file, path: `${title || 'Untitled'}.story` };
    } else if (sm.activeEntity?.type === 'scene') {
      const scene = sm.scenes[sm.activeEntity.id];
      const narrative = sm.narratives[scene.narrativeId];
      file = { ...file, path: `${title || 'Untitled'}/${narrative.title || 'Untitled'}/${scene.title}.scene` };
    } else if (sm.activeEntity?.type === 'narrative') {
      const narrative = sm.narratives[sm.activeEntity.id];
      file = { ...file, path: `${narrative.title || 'Untitled'}.narrative` };
    }
    set(() => ({ storyModel: { ...sm, story }, file }));
  },
  renameNarrative: (id: string, title: string) => {
    const state = get();
    const sm = state.storyModel;
    const n = sm.narratives[id];
    if (!n) return;
    const narratives = { ...sm.narratives, [id]: { ...n, title } };
    let file = state.file;
    if (sm.activeEntity?.type === 'narrative' && sm.activeEntity.id === id) {
      file = { ...file, path: `${title || 'Untitled'}.narrative` };
    } else if (sm.activeEntity?.type === 'scene') {
      const sc = sm.scenes[sm.activeEntity.id];
      const storyTitle = sm.story?.title || 'Untitled';
      if (sc.narrativeId === id) file = { ...file, path: `${storyTitle}/${title || 'Untitled'}/${sc.title}.scene` };
    }
    set(() => ({ storyModel: { ...sm, narratives }, file }));
  },
  renameScene: (id: string, title: string) => {
    const state = get();
    const sm = state.storyModel;
    const sc = sm.scenes[id];
    if (!sc) return;
    const newScene = { ...sc, title };
    const scenes = { ...sm.scenes, [id]: newScene };
    let file = state.file;
    if (sm.activeEntity?.type === 'scene' && sm.activeEntity.id === id) {
      const storyTitle = sm.story?.title || 'Untitled';
      const narrative = sm.narratives[sc.narrativeId];
      file = { ...file, path: `${storyTitle}/${narrative.title || 'Untitled'}/${title}.scene` };
    }
    set(() => ({ storyModel: { ...sm, scenes }, file }));
  },
  deleteScene: (id: string) => {
    const state = get();
    const sm = state.storyModel;
    const sc = sm.scenes[id];
    if (!sc) return;
    const narrative = sm.narratives[sc.narrativeId];
    if (!narrative) return;
    const newScenes = { ...sm.scenes };
    delete newScenes[id];
    const newNarrative = { ...narrative, sceneIds: narrative.sceneIds.filter(sid => sid !== id) };
    const narratives = { ...sm.narratives, [narrative.id]: newNarrative };
    let activeEntity = sm.activeEntity;
    let file = state.file;
    if (activeEntity?.type === 'scene' && activeEntity.id === id) {
      // fallback to narrative or story
      if (newNarrative.sceneIds.length > 0) {
        const first = newNarrative.sceneIds[0];
        const nextScene = newScenes[first];
        if (nextScene) {
          activeEntity = { type: 'scene', id: first };
          file = { ...file, path: `${sm.story?.title || 'Untitled'}/${narrative.title || 'Untitled'}/${nextScene.title}.scene`, content: nextScene.content, isDirty: false };
        }
      } else {
        activeEntity = { type: 'narrative', id: narrative.id };
        file = { ...file, path: `${newNarrative.title || 'Untitled'}.narrative`, content: newNarrative.content || '', isDirty: false };
      }
    }
    set(() => ({ storyModel: { ...sm, narratives, scenes: newScenes, activeEntity }, file }));
  },
}));

if (typeof window !== "undefined") {
  let prev = useStore.getState().ui;
  useStore.subscribe((state) => {
    const ui = state.ui;
    if (
      ui.theme !== prev.theme ||
      ui.themeMode !== prev.themeMode ||
      ui.themeId !== prev.themeId ||
      ui.activePanel !== prev.activePanel ||
      ui.sidebarView !== prev.sidebarView ||
      ui.sidebarCollapsed !== prev.sidebarCollapsed ||
      ui.inspectorVisible !== prev.inspectorVisible ||
      ui.statusBarVisible !== prev.statusBarVisible ||
      ui.previewVisible !== prev.previewVisible
    ) {
      try {
        localStorage.setItem(themeStorageKey.themeMode, ui.themeMode);
        if (ui.themeId) localStorage.setItem(themeStorageKey.themeId, ui.themeId);
        else localStorage.removeItem(themeStorageKey.themeId);
        if (ui.activePanel) {
          localStorage.setItem(themeStorageKey.activePanel, ui.activePanel);
        } else {
          localStorage.removeItem(themeStorageKey.activePanel);
        }
        localStorage.setItem(themeStorageKey.sidebarView, ui.sidebarView);
        localStorage.setItem(
          themeStorageKey.sidebarCollapsed,
          String(ui.sidebarCollapsed),
        );
        localStorage.setItem(
          themeStorageKey.inspectorVisible,
          String(ui.inspectorVisible),
        );
        localStorage.setItem(
          themeStorageKey.statusBarVisible,
          String(ui.statusBarVisible),
        );
        localStorage.setItem(
          themeStorageKey.previewVisible,
          String(ui.previewVisible),
        );
      } catch {
        // ignore quota errors
      }
      prev = ui;
    }
  });

  if (window.matchMedia) {
    const listener = (event: MediaQueryListEvent) => {
      const nextTheme = event.matches ? "dark" : "light";
      useStore.getState().applySystemTheme(nextTheme);
    };
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    if (media.addEventListener) {
      media.addEventListener("change", listener);
    } else if ((media as any).addListener) {
      (media as any).addListener(listener);
    }
  }
}

export const selectFile = (s: StoreState) => s.file;
export const selectParse = (s: StoreState) => s.parse;
export const selectCompile = (s: StoreState) => s.compile;
export const selectUI = (s: StoreState) => s.ui;
export const selectNavigation = (s: StoreState) => s.navigation;






