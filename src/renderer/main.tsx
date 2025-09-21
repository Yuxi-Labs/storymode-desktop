import React, { useEffect, useMemo, useState } from "react";
import "./styles.css";
import { createRoot } from "react-dom/client";
import "./monacoSetup";
import {
  useStore,
  selectFile,
  selectParse,
  selectCompile,
  selectUI,
  type RootState,
  type ParseState,
} from "./store/store.js";
import { Editor } from "./components/Editor.js";
import { DiagnosticsPanel } from "./components/DiagnosticsPanel.js";
import { useDebouncedParse } from "./hooks/useDebouncedParse.js";
import { useAutoCompile } from "./hooks/useAutoCompile.js";
import { ASTPanel } from "./components/ASTPanel.js";
import { IRPanel } from "./components/IRPanel.js";
import { InfoPanel } from "./components/InfoPanel.js";
import { PreviewPanel } from "./components/PreviewPanel.js";
import { TokensPanel } from "./components/TokensPanel.js";
import { TabBar } from "./components/TabBar.js";
import { FileList } from "./components/FileList.js";
const App: React.FC = () => {
  const file = useStore(selectFile);
  const ui = useStore(selectUI);
  useDebouncedParse();
  useAutoCompile();
  const setTheme = useStore((s: RootState) => s.setTheme);
  const openFileAction = useStore((s: RootState) => s.openFile);
  const setActivePanel = useStore((s: RootState) => s.setActivePanel);
  const requestCompile = useStore((s: RootState) => s.requestCompile);
  const markSaved = useStore((s: RootState) => s.markSaved);
  const newFile = useStore((s: RootState) => s.newFile);
  const closeFile = useStore((s: RootState) => s.closeFile);
  const isDark = ui.theme === "dark";
  useEffect(() => {
    const cls = document.documentElement.classList;
    if (isDark) cls.add("dark");
    else cls.remove("dark");
  }, [isDark]);
  useEffect(() => {
    function onFileOpenResult(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (!detail || !detail.path) return;
      openFileAction(
        detail.path,
        detail.content ?? "",
        detail.sizeBytes,
        detail.lastModifiedMs,
      );
    }
    function onToggleTheme() {
      setTheme(isDark ? "light" : "dark");
    }
    function onSetPanel(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail) setActivePanel(detail);
    }
    function onPrint() {
      window.print();
    }
    async function onFileNew() {
      newFile();
    }
    async function onFileClose() {
      closeFile();
    }
    async function onFileSave() {
      const state = useStore.getState();
      if (!state.file.path) {
        onFileSaveAs();
        return;
      }
      const res = await window.storymode.writeFile(
        state.file.path,
        state.file.content,
      );
      if (res?.ok) markSaved();
    }
    async function onFileSaveAs() {
      const state = useStore.getState();
      const result = await window.storymode.saveAsDialog();
      if (result?.canceled || !result?.path) return;
      const write = await window.storymode.writeFile(
        result.path,
        state.file.content,
      );
      if (write?.ok) markSaved(result.path);
    }
    async function onRecompile() {
      requestCompile();
      const state = useStore.getState();
      const payload = {
        content: state.file.content,
        filename: state.file.path ?? undefined,
        ast: state.parse.ast ?? undefined,
        kind: state.parse.fileKind ?? undefined,
      };
      const result = await window.storymode.compile(payload);
      useStore.getState().applyCompileResult(result);
    }
    window.addEventListener("menu:fileOpenResult", onFileOpenResult as any);
    window.addEventListener("menu:toggleTheme", onToggleTheme as any);
    window.addEventListener("menu:setPanel", onSetPanel as any);
    window.addEventListener("menu:print", onPrint as any);
    window.addEventListener("menu:recompile", onRecompile as any);
    window.addEventListener("menu:fileNew", onFileNew as any);
    window.addEventListener("menu:fileClose", onFileClose as any);
    window.addEventListener("menu:fileSave", onFileSave as any);
    window.addEventListener("menu:fileSaveAs", onFileSaveAs as any);
    return () => {
      window.removeEventListener(
        "menu:fileOpenResult",
        onFileOpenResult as any,
      );
      window.removeEventListener("menu:toggleTheme", onToggleTheme as any);
      window.removeEventListener("menu:setPanel", onSetPanel as any);
      window.removeEventListener("menu:print", onPrint as any);
      window.removeEventListener("menu:recompile", onRecompile as any);
      window.removeEventListener("menu:fileNew", onFileNew as any);
      window.removeEventListener("menu:fileClose", onFileClose as any);
      window.removeEventListener("menu:fileSave", onFileSave as any);
      window.removeEventListener("menu:fileSaveAs", onFileSaveAs as any);
    };
  }, [
    openFileAction,
    setTheme,
    isDark,
    setActivePanel,
    markSaved,
    requestCompile,
    newFile,
    closeFile,
  ]);
  const hasDocument = Boolean(file.path || file.content.length);
  return (
    <div className="app-shell">
      <div className="workspace">
        <Sidebar />
        <div className="center-stage">
          <TabBar />
          <div className="editor-stage">
            {hasDocument ? <Editor /> : <WelcomeEmptyState />}
          </div>
        </div>
        <Inspector />
      </div>
      <StatusBar />
    </div>
  );
};
const Sidebar: React.FC = () => {
  const openFileAction = useStore((s: RootState) => s.openFile);
  const newFile = useStore((s: RootState) => s.newFile);

  const handleOpen = async () => {
    const target = await window.storymode.openFileDialog();
    if (target?.canceled || !target.path) return;
    const read = await window.storymode.readFile(target.path);
    if (!read?.ok || typeof read.content !== "string") return;
    openFileAction(target.path, read.content);
  };

  const handleNew = () => {
    newFile();
  };

  return (
    <aside className="sidebar-outer">
      <div className="sidebar-section">
        <div className="sidebar-title">Workspace</div>
        <div className="sidebar-body">
          <div className="sidebar-actions">
            <button type="button" onClick={handleOpen}>
              Open Narrative...
            </button>
            <button type="button" onClick={handleNew}>
              New Narrative
            </button>
          </div>
          <div className="sidebar-hint">
            StoryMode works with `.story` manifests and `.narrative` scene
            files.
          </div>
        </div>
      </div>
      <div className="sidebar-section">
        <div className="sidebar-title">Documents</div>
        <div className="sidebar-body explorer">
          <FileList />
        </div>
      </div>
    </aside>
  );
};
interface InspectorProps {
  parse: ParseState;
  compile: ReturnType<typeof selectCompile>;
}
const inspectorTabs = [
  {
    id: "diagnostics",
    label: "Diagnostics",
    render: () => <DiagnosticsPanel />,
  },
  { id: "ast", label: "AST", render: () => <ASTPanel /> },
  { id: "ir", label: "IR", render: () => <IRPanel /> },
  { id: "info", label: "Info", render: () => <InfoPanel /> },
  { id: "preview", label: "Preview", render: () => <PreviewPanel /> },
  { id: "tokens", label: "Tokens", render: () => <TokensPanel /> },
];
const Inspector: React.FC = () => {
  const activePanel = useStore((s) => s.ui.activePanel);
  const setActivePanel = useStore((s: RootState) => s.setActivePanel);
  return (
    <aside className="inspector">
      <div className="inspector-header">
        <div className="inspector-title">Insights</div>
        <div className="inspector-subtitle">
          Secondary context for your narrative.
        </div>
      </div>
      <div className="inspector-tabs">
        {inspectorTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activePanel ? "active" : ""}
            onClick={() => setActivePanel(tab.id as any)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="inspector-content">
        {inspectorTabs.find((tab) => tab.id === activePanel)?.render()}
      </div>
    </aside>
  );
};
const WelcomeEmptyState: React.FC = () => {
  const handleOpen = async () => {
    const target = await window.storymode.openFileDialog();
    if (target?.canceled || !target.path) return;
    const read = await window.storymode.readFile(target.path);
    if (!read?.ok || typeof read.content !== "string") return;
    useStore.getState().openFile(target.path, read.content);
  };
  const handleNew = () => {
    useStore.getState().newFile();
  };
  return (
    <div className="welcome-card">
      <h1>Welcome to StoryMode</h1>
      <p>
        Draft interactive narratives, compile them for engines, and Preview
        pacing - all from a focused dark UI.
      </p>
      <div className="welcome-actions">
        <button type="button" onClick={handleNew}>
          Create Blank Narrative
        </button>
        <button type="button" onClick={handleOpen}>
          Open Existing File
        </button>
      </div>
      <ul className="welcome-tips">
        <li>
          Start with ::narrative and ::scene declarations to structure the
          document.
        </li>
        <li>
          Use metadata directives (@title:, @location:) to populate the info
          panel.
        </li>
        <li>
          Preview updates after each successful parse - watch the status bar for
          timings.
        </li>
      </ul>
    </div>
  );
};
const StatusBar: React.FC = () => {
  const file = useStore(selectFile);
  const parse = useStore(selectParse);
  const compile = useStore(selectCompile);
  const ui = useStore(selectUI);
  const [versions, setVersions] = useState<{
    coreVersion: string;
    compilerVersion: string;
    appVersion: string;
  } | null>(null);
  useEffect(() => {
    let mounted = true;
    window.storymode
      .versionInfo()
      .then((info) => {
        if (mounted) setVersions(info);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);
  const errorCount = useMemo(
    () => parse.diagnostics.filter((d) => d.severity === "error").length,
    [parse.diagnostics],
  );
  const warningCount = useMemo(
    () => parse.diagnostics.filter((d) => d.severity === "warning").length,
    [parse.diagnostics],
  );
  const words = useMemo(() => {
    const text = file.content || "";
    return text.trim().length ? text.trim().split(/\s+/).length : 0;
  }, [file.content]);
  const lines =
    file.lineCount ?? (file.content ? file.content.split(/\r?\n/).length : 0);
  const caret = { line: ui.caretLine ?? 1, column: ui.caretColumn ?? 1 };
  const parseTime =
    parse.status === "parsing"
      ? "Parsing..."
      : parse.parseTimeMs != null
        ? `${parse.parseTimeMs} ms`
        : " - ";
  const compileTime =
    compile.status === "compiling"
      ? "Compiling..."
      : compile.genTimeMs != null
        ? `${compile.genTimeMs} ms`
        : " - ";
  return (
    <footer className="status-bar">
      <span>
        Ln {caret.line}, Col {caret.column}
      </span>
      <span>Words {words}</span> <span>Lines {lines}</span>
      <span>Parse {parseTime}</span> <span>Errors {errorCount}</span>
      <span>Warnings {warningCount}</span> <span>Compile {compileTime}</span>
      <span>Core {versions?.coreVersion ?? " - "}</span>
      <span>Compiler {versions?.compilerVersion ?? " - "}</span>
    </footer>
  );
};
createRoot(document.getElementById("root")!).render(<App />);
