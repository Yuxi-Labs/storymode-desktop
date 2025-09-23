import React, { useEffect, useMemo } from "react";
import "./styles.css";
import { createRoot } from "react-dom/client";
import "./monacoSetup";
import {
  useStore,
  selectFile,
  selectParse,
  selectCompile,
  selectUI,
  selectNavigation,
  type RootState,
} from "./store/store.js";
import { Editor } from "./components/Editor.js";
import { DiagnosticsPanel } from "./components/DiagnosticsPanel.js";
import { useDebouncedParse } from "./hooks/useDebouncedParse.js";
import { useAutoCompile } from "./hooks/useAutoCompile.js";
import { InfoPanel } from "./components/InfoPanel.js";
import { TabBar } from "./components/TabBar.js";
import { ActivityBar } from "./components/ActivityBar.js";
import { FileList } from "./components/FileList.js";

const IconAddFile: React.FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3.5 1.75h5.3L12.5 5v9.25a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1V2.75a1 1 0 0 1 1-1z" />
    <path d="M8 7.5v5" />
    <path d="M5.5 10h5" />
  </svg>
);

const IconOpenFile: React.FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3.5h6.2L13 7v7.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
    <path d="M5 11h7" />
    <path d="M5 8h7" />
  </svg>
);

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
        <ActivityBar />
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

const inspectorTabs: Array<{
  id: RootState["ui"]["activePanel"];
  label: string;
  render: () => JSX.Element;
}> = [
  { id: "metadata", label: "Metadata", render: () => <InfoPanel /> },
  { id: "diagnostics", label: "Diagnostics", render: () => <DiagnosticsPanel /> },
];

const Sidebar: React.FC = () => {
  const openFileAction = useStore((s: RootState) => s.openFile);
  const newFile = useStore((s: RootState) => s.newFile);
  const { sidebarCollapsed } = useStore(selectUI);

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

  if (sidebarCollapsed) {
    return <aside className="sidebar-outer sidebar-collapsed" aria-hidden />;
  }

  return (
    <aside className="sidebar-outer">
      <header className="sidebar-header">
        <span className="sidebar-title">World</span>
        <div className="sidebar-actions">
          <button
            type="button"
            className="sidebar-action"
            title="New file"
            onClick={handleNew}
          >
            <IconAddFile />
          </button>
          <button
            type="button"
            className="sidebar-action"
            title="Open file"
            onClick={handleOpen}
          >
            <IconOpenFile />
          </button>
        </div>
      </header>
      <div className="sidebar-scroll">
        <SidebarWorldView />
      </div>
    </aside>
  );
};

const SidebarWorldView: React.FC = () => (
  <div className="sidebar-pane">
    <FileList />
  </div>
);

const Inspector: React.FC = () => {
  const activePanel = useStore((s) => s.ui.activePanel);
  const setActivePanel = useStore((s: RootState) => s.setActivePanel);
  return (
    <aside className="inspector">
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
    <div className="welcome-state">
      <div className="welcome-pane">
        <h2>Start Writing</h2>
        <p>Select an existing StoryMode document or launch a blank narrative to begin.</p>
        <div className="welcome-buttons">
          <button type="button" className="primary" onClick={handleNew}>
            New Narrative
          </button>
          <button type="button" onClick={handleOpen}>
            Open File...
          </button>
        </div>
        <dl className="welcome-shortcuts">
          <div>
            <dt>Open</dt>
            <dd>
              <kbd>Ctrl</kbd>
              <span>+</span>
              <kbd>O</kbd>
            </dd>
          </div>
          <div>
            <dt>Save</dt>
            <dd>
              <kbd>Ctrl</kbd>
              <span>+</span>
              <kbd>S</kbd>
            </dd>
          </div>
          <div>
            <dt>Scene Jump</dt>
            <dd>
              <kbd>Ctrl</kbd>
              <span>+</span>
              <kbd>J</kbd>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
};

const StatusBar: React.FC = () => {
  const file = useStore(selectFile);
  const parse = useStore(selectParse);
  const compile = useStore(selectCompile);
  const ui = useStore(selectUI);
  const navigation = useStore(selectNavigation);
  const errorCount = useMemo(
    () => parse.diagnostics.filter((d) => d.severity === "error").length,
    [parse.diagnostics],
  );
  const warningCount = useMemo(
    () => parse.diagnostics.filter((d) => d.severity === "warning").length,
    [parse.diagnostics],
  );
  const sceneCount = navigation.sceneIndex?.length ?? 0;
  const words = useMemo(() => {
    const text = file.content || "";
    return text.trim().length ? text.trim().split(/\s+/).length : 0;
  }, [file.content]);
  const lines =
    file.lineCount ?? (file.content ? file.content.split(/\r?\n/).length : 0);
  const caret = { line: ui.caretLine ?? 1, column: ui.caretColumn ?? 1 };
  const fileKindLabel = (parse.fileKind ?? file.fileType ?? "document").toString();
  const saveStatus = file.isDirty ? "Unsaved" : "Saved";
  return (
    <footer className="status-bar">
      <span>
        Ln {caret.line}, Col {caret.column}
      </span>
      <span>Words {words}</span>
      <span>Lines {lines}</span>
      <span>Scenes {sceneCount}</span>
      <span>{fileKindLabel.toUpperCase()}</span>
      <span>{saveStatus}</span>
      <span>Errors {errorCount}</span>
      <span>Warnings {warningCount}</span>
    </footer>
  );
};

createRoot(document.getElementById("root")!).render(<App />);
