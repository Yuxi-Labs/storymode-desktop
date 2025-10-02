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
  fileType?: "story" | "narrative" | "scene" | "unknown";
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
  sidebarWidthPx: number; // user-adjustable
  inspectorWidthPx: number; // user-adjustable
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
    story?: { internalId: string; externalId: string; title: string; narrativeIds: string[]; _managedId?: boolean };
    storyContent?: string;
    narratives: Record<string, { internalId: string; externalId: string; title: string; sceneIds: string[]; order: number; content?: string; _managedId?: boolean }>;
    scenes: Record<string, { internalId: string; externalId: string; title: string; narrativeInternalId: string; content: string; order: number; _managedId?: boolean }>;
    activeSceneId?: string;
    activeEntity?: { type: 'story'; internalId: string } | { type: 'narrative'; internalId: string } | { type: 'scene'; internalId: string };
  };
  notifications: { items: Array<{ id: string; message: string; level: 'info' | 'warn' | 'error'; read?: boolean }>; unread: number };
  pushNotification: (n: { id?: string; message: string; level?: 'info' | 'warn' | 'error' }) => void;
  markAllRead: () => void;
  openFile: (
    path: string | undefined,
    content: string,
    sizeBytes?: number,
    lastModifiedMs?: number | null,
    encoding?: string,
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
  setSidebarWidth: (px: number) => void;
  setInspectorWidth: (px: number) => void;
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

const defaultEncoding = "utf-8";

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
      sidebarWidthPx: 240,
      inspectorWidthPx: 320,
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
    sidebarWidthPx: parseInt(storage.getItem('storymode.sidebarWidthPx') || '240', 10) || 240,
    inspectorWidthPx: parseInt(storage.getItem('storymode.inspectorWidthPx') || '320', 10) || 320,
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
    encoding: undefined,
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

function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]+/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || 'untitled';
}

// External IDs are author-visible (underscored). Internal IDs are stable UUIDs.
function toExternalId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]+/g, "")
    .replace(/[\s_-]+/g, "_")
    .replace(/^_+|_+$/g, "") || 'untitled';
}

function uuid(): string {
  // Simple UUID v4 generator (non-crypto acceptable for editor internal references)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random()*16|0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function buildStoryDSL(story: { externalId: string; title: string; narrativeIds: string[] }, narratives: Record<string, any>): string {
  // Emit canonical formatted story block with indentation and inline files array, plus closing ::end:
  // Example:
  // ::story: echoes_of_starlight
  //   @title: Echoes of Starlight
  //   files: [ intro.narrative, main.narrative ]
  // ::end: {{ echoes_of_starlight }}
  const indent = '  ';
  const lines: string[] = [];
  lines.push(`::story: ${story.externalId}`);
  if (story.title) lines.push(`${indent}@title: ${story.title}`);
  // Future additional metadata would be emitted here with same indent
  if (story.narrativeIds.length) {
    lines.push(`${indent}files:`);
    for (const nid of story.narrativeIds) {
      const n = narratives[nid];
      if (!n) continue;
      lines.push(`${indent}${indent}- ${n.externalId}.narrative`);
    }
  }
  lines.push(`::end: {{ ${story.externalId} }}`);
  return lines.join('\n');
}

function buildNarrativeDSL(narrative: { externalId: string; title: string; sceneIds: string[] }, scenes: Record<string, any>): string {
  // Emit canonical formatted narrative with indented scenes and ::end: closers per example.
  // Example:
  // ::narrative: intro
  //   @title: Intro
  //
  //   ::scene: arrival
  //     @title: Arrival
  //   ::end: {{ arrival }}
  // ::end: {{ intro }}
  const nIndent = '  ';
  const sIndent = '    ';
  const lines: string[] = [];
  lines.push(`::narrative: ${narrative.externalId}`);
  if (narrative.title) lines.push(`${nIndent}@title: ${narrative.title}`);
  for (const sid of narrative.sceneIds) {
    const sc = scenes[sid];
    if (!sc) continue;
    lines.push('', `${nIndent}::scene: ${sc.externalId}`);
    if (sc.title) lines.push(`${sIndent}@title: ${sc.title}`);
    // Scene content: indent each non-empty line by sIndent (two levels) if present
    if (sc.content) {
      const trimmed = sc.content.replace(/\s+$/,'');
      if (trimmed.length) {
  const contentLines = trimmed.split(/\r?\n/).map((l: string) => l.length ? `${sIndent}${l}` : l);
        lines.push(...contentLines);
      }
    }
    lines.push('', `${nIndent}::end: {{ ${sc.externalId} }}`);
  }
  lines.push('', `::end: {{ ${narrative.externalId} }}`);
  return lines.join('\n');
}

function createSeedStory(title = "Untitled Story") {
  // Rich scaffold: three narratives (intro, main, outro) with populated scene content.
  // Content demonstrates characters, dialogue, media/effect cues, footnotes, and a goto.
  const storyTitle = title || "Untitled Story";
  const storyExternalId = toExternalId(storyTitle);
  const storyInternalId = uuid();

  type TmpNarr = { key: string; title: string; scenes: Array<{ title: string; body: string }> };
  const template: TmpNarr[] = [
    {
      key: 'intro',
      title: 'Intro',
      scenes: [
        { title: 'Opening Beat', body: `[[ Aria ]]\n"We made it."\n!!: ambient: soft_wind\n**: fade_in: 2s\n[[ Dax ]]\n"You sure this is the place?"\n### Footnote: The ruined gate has ancient glyphs.` },
        { title: 'Inciting Event', body: `[[ Aria ]]\n"The signal originated here."\n~~: sparks: gate_core\n[[ Dax ]]\n"Gate's waking up— back!"\n::goto: Rising Action` },
      ],
    },
    {
      key: 'main',
      title: 'Main',
      scenes: [
        { title: 'Rising Action', body: `[[ Aria ]]\n"Systems cycling."\n<>: holo: schematic_gate\n[[ Dax ]]\n"Power surge climbing."` },
        { title: 'Reversal', body: `[[ Aria ]]\n"It's rewriting coordinates."\n[[ Dax ]]\n"Then it's not a gate— it's a recorder."` },
        { title: 'Complication', body: `[[ Aria ]]\n"Transmission fragment inbound."\n**: flash: white\n[[ Dax ]]\n"That... sounded like my voice."` },
      ],
    },
    {
      key: 'outro',
      title: 'Outro',
      scenes: [
        { title: 'Climax', body: `[[ Aria ]]\n"Stabilize the field!"\n~~: distortion: temporal_field\n[[ Dax ]]\n"Holding— can't guarantee duration."` },
        { title: 'Resolution', body: `[[ Aria ]]\n"Log everything. We'll need a council."\n[[ Dax ]]\n"And a stronger battery."\n### Footnote: End of sample narrative.` },
      ],
    },
  ];

  const narratives: Record<string, any> = {};
  const scenes: Record<string, any> = {};
  const narrativeIds: string[] = [];

  template.forEach((tpl, nIdx) => {
    const nInternal = uuid();
    const nExternal = toExternalId(tpl.title || `Narrative_${nIdx+1}`);
    const sceneIds: string[] = [];
    tpl.scenes.forEach((sceneSpec, sIdx) => {
      const scInternal = uuid();
      const scExternal = toExternalId(sceneSpec.title || `Scene_${sIdx+1}`);
      sceneIds.push(scInternal);
      scenes[scInternal] = {
        internalId: scInternal,
        externalId: scExternal,
        title: sceneSpec.title,
        narrativeInternalId: nInternal,
        content: sceneSpec.body,
        order: sIdx,
        _managedId: true,
      };
    });
    narratives[nInternal] = {
      internalId: nInternal,
      externalId: nExternal,
      title: tpl.title,
      sceneIds,
      order: nIdx,
      content: '',
      _managedId: true,
    };
    narrativeIds.push(nInternal);
  });

  const story = { internalId: storyInternalId, externalId: storyExternalId, title: storyTitle, narrativeIds, _managedId: true };
  const storyContent = buildStoryDSL(story, narratives);
  // Precompute each narrative's DSL with embedded scene content.
  for (const nid of narrativeIds) {
    narratives[nid].content = buildNarrativeDSL(narratives[nid], scenes);
  }
  const firstSceneId = narratives[narrativeIds[0]].sceneIds[0];
  // Requirement change: initial selection should be the story (not a scene).
  return { story, storyContent, narratives, scenes, activeSceneId: firstSceneId, activeEntity: { type: 'story', internalId: story.internalId } } as StoreState['storyModel'];
}

function ensureUniqueExternalId(existing: Set<string>, base: string): string {
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}
function buildCompositePayload(sm: StoreState['storyModel'], encoding: string | undefined) {
  if (!sm.story) return { version:1, empty: true };
  const story = sm.story;
  return {
    version: 1,
    encoding: encoding || defaultEncoding,
    activeSceneExternalId: sm.activeSceneId ? sm.scenes[sm.activeSceneId]?.externalId : undefined,
    story: {
      id: story.externalId,
      title: story.title,
      narratives: story.narrativeIds.map(nInternalId => {
        const n = sm.narratives[nInternalId];
        if (!n) return null;
        return {
          id: n.externalId,
          title: n.title,
          order: n.order,
          scenes: n.sceneIds.map(sInternalId => {
            const sc = sm.scenes[sInternalId];
            return !sc ? null : { id: sc.externalId, title: sc.title, order: sc.order, content: sc.content };
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
    const n = sm.narratives[active.internalId];
    if (!n) return;
    set(() => ({ storyModel: { ...sm, narratives: { ...sm.narratives, [active.internalId]: { ...n, content } } } }));
  } else if (active.type === 'scene') {
    const sc = sm.scenes[active.internalId];
    if (!sc) return;
    set(() => ({ storyModel: { ...sm, scenes: { ...sm.scenes, [active.internalId]: { ...sc, content } } } }));
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
      const storyJson = parsed.story;
      if (!Array.isArray(storyJson.narratives)) return false;
      const narratives: StoreState['storyModel']['narratives'] = {};
      const scenes: StoreState['storyModel']['scenes'] = {};
      const narrativeInternalIds: string[] = [];
      storyJson.narratives.forEach((n: any, nIdx: number) => {
        if (!n || !n.id || !Array.isArray(n.scenes)) return;
        const nInternal = uuid();
        narrativeInternalIds.push(nInternal);
        narratives[nInternal] = { internalId: nInternal, externalId: toExternalId(n.id), title: n.title || `Narrative ${nIdx+1}`, sceneIds: [], order: typeof n.order === 'number' ? n.order : nIdx };
        n.scenes.forEach((sc: any, sIdx: number) => {
          if (!sc || !sc.id) return;
          const scInternal = uuid();
          narratives[nInternal].sceneIds.push(scInternal);
          scenes[scInternal] = { internalId: scInternal, externalId: toExternalId(sc.id), title: sc.title || `Scene ${sIdx+1}`, narrativeInternalId: nInternal, content: sc.content || '', order: typeof sc.order === 'number' ? sc.order : sIdx };
        });
      });
      const storyInternalId = uuid();
      const story = { internalId: storyInternalId, externalId: toExternalId(storyJson.id || 'story'), title: storyJson.title || 'Untitled', narrativeIds: narrativeInternalIds };
      const firstSceneInternal = narrativeInternalIds.length ? narratives[narrativeInternalIds[0]].sceneIds[0] : undefined;
      const activeSceneId: string | undefined = firstSceneInternal;
      const content = activeSceneId ? scenes[activeSceneId].content : '';
      set((state) => ({
        storyModel: { story, narratives, scenes, activeSceneId, storyContent: buildStoryDSL(story, narratives), activeEntity: { type: 'story', internalId: storyInternalId } },
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
  openFile: (path, content, sizeBytes, lastModifiedMs, encoding) => {
    set((state) => ({
      file: {
        path: path ?? null,
        content,
        lastDiskContent: content,
        isDirty: false,
        sizeBytes: sizeBytes ?? content.length,
        lastModifiedMs: lastModifiedMs ?? null,
        // Use provided encoding; do not silently coerce unknown -> utf-8.
        encoding: encoding || undefined,
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
        encoding: undefined,
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
        encoding: undefined,
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
      let fileType: "story" | "narrative" | "scene" | "unknown" = "unknown";
      if (path?.endsWith(".story")) fileType = "story";
      else if (path?.endsWith(".narrative")) fileType = "narrative";
      else if (path?.endsWith('.scene')) fileType = 'scene';
      return {
        file: {
          ...state.file,
          lineCount: lines,
          fileType,
          encoding: state.file.encoding,
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
  setSidebarWidth: (px: number) => set((state) => ({ ui: { ...state.ui, sidebarWidthPx: Math.min(600, Math.max(140, Math.round(px))) } })),
  setInspectorWidth: (px: number) => set((state) => ({ ui: { ...state.ui, inspectorWidthPx: Math.min(800, Math.max(220, Math.round(px))) } })),
  // Hierarchical model actions
  newStory: (title) => {
    const seed = createSeedStory(title || 'Untitled Story');
    const story = seed.story!;
    set((state) => ({
      storyModel: seed,
      file: { ...state.file, path: `${story.externalId}.story`, content: seed.storyContent || '', isDirty: false, encoding: state.file.encoding || undefined },
      parse: { ...state.parse, status: 'idle', ast: null, diagnostics: [], tokens: [] },
    }));
  },
  addNarrative: (title) => {
    const state = get();
    if (!state.storyModel.story) return undefined;
    const order = state.storyModel.story.narrativeIds.length;
    const narrativeTitle = title || `Untitled Narrative ${order + 1}`;
    const baseExternal = toExternalId(narrativeTitle);
    const existing = new Set(Object.values(state.storyModel.narratives).map(n => n.externalId));
    const externalId = ensureUniqueExternalId(existing, baseExternal);
    const internalId = uuid();
    // Create default first scene
    const sceneTitle = 'Untitled Scene 1';
    const sceneExternal = ensureUniqueExternalId(new Set(), toExternalId(sceneTitle));
    const sceneInternal = uuid();
    const newNarrative = { internalId, externalId, title: narrativeTitle, sceneIds: [sceneInternal], order, content: '', _managedId: true };
    const narratives = { ...state.storyModel.narratives, [internalId]: newNarrative };
    const scenes = { ...state.storyModel.scenes, [sceneInternal]: { internalId: sceneInternal, externalId: sceneExternal, title: sceneTitle, narrativeInternalId: internalId, content: '', order: 0, _managedId: true } };
    const story = { ...state.storyModel.story, narrativeIds: [...state.storyModel.story.narrativeIds, internalId] };
    const storyContent = buildStoryDSL(story!, narratives);
    set(() => ({ storyModel: { ...state.storyModel, narratives, scenes, story, storyContent, activeEntity: { type: 'narrative', internalId } } }));
    return internalId;
  },
  addScene: (narrativeId, title) => {
    const state = get();
    const narrative = state.storyModel.narratives[narrativeId];
    if (!narrative) return undefined;
    const index = narrative.sceneIds.length;
    const sceneTitle = title || `Untitled Scene ${index + 1}`;
    const baseExternal = toExternalId(sceneTitle);
    const existing = new Set(narrative.sceneIds.map(sid => state.storyModel.scenes[sid]?.externalId).filter(Boolean) as string[]);
    const externalId = ensureUniqueExternalId(existing, baseExternal);
    const internalId = uuid();
    set(() => ({ storyModel: { ...state.storyModel, narratives: { ...state.storyModel.narratives, [narrativeId]: { ...narrative, sceneIds: [...narrative.sceneIds, internalId] } }, scenes: { ...state.storyModel.scenes, [internalId]: { internalId, externalId, title: sceneTitle, narrativeInternalId: narrativeId, content: '', order: index, _managedId: true } } } }));
    return internalId;
  },
  setActiveScene: (sceneId) => {
    const state = get();
    const sm = state.storyModel;
    if (!sm.scenes[sceneId]) return;
    flushActiveEntity(get, set, state.file.content);
    const sc = sm.scenes[sceneId];
    const narrative = sm.narratives[sc.narrativeInternalId];
    const story = sm.story;
    const newContent = sc.content;
    const syntheticPath = `${story?.externalId || 'story'}/${narrative?.externalId || 'narrative'}/${sc.externalId}.scene`;
    set(() => ({ storyModel: { ...sm, activeSceneId: sceneId, activeEntity: { type: 'scene', internalId: sceneId } }, file: { ...state.file, path: syntheticPath, content: newContent, isDirty: false, fileType: 'scene' as any } }));
  },
  setActiveStory: () => {
    const state = get();
    const sm = state.storyModel;
    if (!sm.story) return;
    flushActiveEntity(get, set, state.file.content);
    set(() => ({ storyModel: { ...sm, activeEntity: { type: 'story', internalId: sm.story!.internalId } }, file: { ...state.file, path: `${sm.story!.externalId}.story`, content: sm.storyContent || '', isDirty: false, fileType: 'story' as any } }));
  },
  setActiveNarrative: (id: string) => {
    const state = get();
    const sm = state.storyModel;
    const n = sm.narratives[id];
    if (!n) return;
    flushActiveEntity(get, set, state.file.content);
    const narrativeDsl = buildNarrativeDSL(n, sm.scenes);
    set(() => ({ storyModel: { ...sm, activeEntity: { type: 'narrative', internalId: id } }, file: { ...state.file, path: `${n.externalId}.narrative`, content: narrativeDsl, isDirty: false, fileType: 'narrative' as any } }));
  },
  deleteNarrative: (id: string) => {
    const state = get();
    const sm = state.storyModel;
    if (!sm.story || !sm.narratives[id]) return;
    const remainingIds = sm.story.narrativeIds.filter(nid => nid !== id);
    const newNarratives = { ...sm.narratives };
    delete newNarratives[id];
    const newScenes = { ...sm.scenes };
    Object.values(sm.scenes).forEach(sc => { if (sc.narrativeInternalId === id) delete newScenes[sc.internalId]; });
    let activeEntity = sm.activeEntity;
    let fileUpdate: Partial<FileState> = {};
    if (activeEntity && activeEntity.type === 'narrative' && activeEntity.internalId === id) {
      // Choose next narrative if any, else story
      if (remainingIds.length) {
        const nextNarrId = remainingIds[0];
        activeEntity = { type: 'narrative', internalId: nextNarrId };
        const nextNarr = newNarratives[nextNarrId];
        const narrativeDsl = buildNarrativeDSL(nextNarr, newScenes);
        fileUpdate = { path: `${nextNarr.externalId}.narrative`, content: narrativeDsl, isDirty: false } as any;
      } else {
        activeEntity = sm.story ? { type: 'story', internalId: sm.story.internalId } : undefined;
        fileUpdate = sm.story ? { path: `${sm.story.externalId}.story`, content: sm.storyContent || '', isDirty: false } as any : { path: null, content: '', isDirty: false } as any;
      }
    }
    // If no narratives remain, clear story model entirely
    if (!remainingIds.length) {
      set((s) => ({ storyModel: { story: undefined, narratives: {}, scenes: {}, activeSceneId: undefined, activeEntity: undefined }, file: { ...s.file, ...fileUpdate } }));
      return;
    }
    set((s) => ({ storyModel: { ...sm, story: { ...sm.story!, narrativeIds: remainingIds }, narratives: newNarratives, scenes: newScenes, activeEntity }, file: { ...s.file, ...fileUpdate } }));
  },
  renameStory: (title: string) => {
    const state = get();
    const sm = state.storyModel;
    if (!sm.story) return;
    const externalId = sm.story._managedId ? toExternalId(title || 'Untitled') : sm.story.externalId;
    const story = { ...sm.story, title, externalId };
    const storyContent = buildStoryDSL(story, sm.narratives);
    let file = state.file;
    if (sm.activeEntity?.type === 'story') {
      file = { ...file, path: `${story.externalId}.story`, content: storyContent };
    } else if (sm.activeEntity?.type === 'scene') {
      const scene = sm.scenes[sm.activeEntity.internalId];
      const narrative = sm.narratives[scene.narrativeInternalId];
      file = { ...file, path: `${story.externalId}/${narrative.externalId}/${scene.externalId}.scene` };
    } else if (sm.activeEntity?.type === 'narrative') {
      const narrative = sm.narratives[sm.activeEntity.internalId];
      file = { ...file, path: `${narrative.externalId}.narrative` };
    }
    set(() => ({ storyModel: { ...sm, story, storyContent }, file }));
  },
  renameNarrative: (id: string, title: string) => {
    const state = get();
    const sm = state.storyModel;
    const n = sm.narratives[id];
    if (!n) return;
    const externalId = n._managedId ? toExternalId(title || 'Untitled') : n.externalId;
    const updatedNarrative = { ...n, title, externalId };
    const narratives = { ...sm.narratives, [id]: updatedNarrative };
    const story = sm.story ? { ...sm.story } : undefined;
    const storyContent = story ? buildStoryDSL(story, narratives) : sm.storyContent;
    let file = state.file;
    if (sm.activeEntity?.type === 'narrative' && sm.activeEntity.internalId === id) {
      file = { ...file, path: `${updatedNarrative.externalId}.narrative` };
    } else if (sm.activeEntity?.type === 'scene') {
      const sc = sm.scenes[sm.activeEntity.internalId];
      if (sc && sc.narrativeInternalId === id && story) {
        file = { ...file, path: `${story.externalId}/${updatedNarrative.externalId}/${sc.externalId}.scene` };
      }
    }
    set(() => ({ storyModel: { ...sm, narratives, story, storyContent }, file }));
  },
  renameScene: (id: string, title: string) => {
    const state = get();
    const sm = state.storyModel;
    const sc = sm.scenes[id];
    if (!sc) return;
    const externalId = sc._managedId ? toExternalId(title || 'Untitled') : sc.externalId;
    const newScene = { ...sc, title, externalId };
    const scenes = { ...sm.scenes, [id]: newScene };
    let file = state.file;
    if (sm.activeEntity?.type === 'scene' && sm.activeEntity.internalId === id) {
      const story = sm.story;
      const narrative = sm.narratives[sc.narrativeInternalId];
      if (story && narrative) {
        file = { ...file, path: `${story.externalId}/${narrative.externalId}/${newScene.externalId}.scene` };
      }
    }
    set(() => ({ storyModel: { ...sm, scenes }, file }));
  },
  deleteScene: (id: string) => {
    const state = get();
    const sm = state.storyModel;
    const sc = sm.scenes[id];
    if (!sc) return;
    const narrative = sm.narratives[sc.narrativeInternalId];
    if (!narrative) return;
    const newScenes = { ...sm.scenes };
    delete newScenes[id];
    const newNarrative = { ...narrative, sceneIds: narrative.sceneIds.filter(sid => sid !== id) };
    const narratives = { ...sm.narratives, [narrative.internalId]: newNarrative };
    let activeEntity = sm.activeEntity;
    let file = state.file;
    if (activeEntity?.type === 'scene' && activeEntity.internalId === id) {
      // fallback to narrative or story
      if (newNarrative.sceneIds.length > 0) {
        const first = newNarrative.sceneIds[0];
        const nextScene = newScenes[first];
        if (nextScene) {
          activeEntity = { type: 'scene', internalId: first };
          const story = sm.story;
          file = { ...file, path: `${story?.externalId || 'story'}/${narrative.externalId}/${nextScene.externalId}.scene`, content: nextScene.content, isDirty: false };
        }
      } else {
        // No scenes left: remove narrative entirely (cascading) using deleteNarrative
        get().deleteNarrative(narrative.internalId);
        return;
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
        localStorage.setItem('storymode.sidebarWidthPx', String(ui.sidebarWidthPx));
        localStorage.setItem('storymode.inspectorWidthPx', String(ui.inspectorWidthPx));
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






