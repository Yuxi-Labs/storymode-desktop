import React, { useEffect } from "react";
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
} from "./store/store.js";
import { Editor } from "./components/Editor.js";
import { useDebouncedParse } from "./hooks/useDebouncedParse.js";
import { useAutoCompile } from "./hooks/useAutoCompile.js";
import { TabBar } from "./components/TabBar.js";
import { ActivityBar } from "./components/ActivityBar.js";
import { FileList } from "./components/FileList.js";
import { PreviewPanel } from "./components/PreviewPanel.js";
import { selectUI as _selectUI } from './store/store.js';

const Inspector: React.FC = () => {
  // Inspector panel remains, but is empty
  return (
    <aside className="inspector">
      <div className="inspector-content" />
    </aside>
  );
};

const WelcomeEmptyState: React.FC = () => {
  const interact = (
    event: React.KeyboardEvent | React.MouseEvent,
    action: () => void,
  ) => {
    if ("key" in event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        action();
      }
    } else {
      action();
    }
  };

  const handleNew = () => useStore.getState().newFile();
  const handleOpen = async () => {
    const target = await window.storymode.openFileDialog();
    if (target?.canceled || !target.path) return;
    const read = await window.storymode.readFile(target.path);
    if (!read?.ok || typeof read.content !== "string") return;
    useStore.getState().openFile(target.path, read.content);
  };

  const handleSettings = () => {
    window.dispatchEvent(new CustomEvent("open-settings"));
  };

  const handleDocs = () => {
    window.dispatchEvent(new CustomEvent("open-documentation"));
  };

  const Action: React.FC<{
    label: string;
    onActivate: () => void;
    children: React.ReactNode;
  }> = ({ label, onActivate, children }) => (
    <div
      className="welcome-action"
      role="link"
      tabIndex={0}
      onClick={(e) => interact(e, onActivate)}
      onKeyDown={(e) => interact(e, onActivate)}
    >
      <div className="welcome-icon" aria-hidden="true" data-tip={label}>{children}</div>
      <div className="welcome-label">{label}</div>
    </div>
  );

  return (
    <div className="welcome-state">
      <div className="welcome-pane" role="presentation">
        <div className="welcome-headings">
          <h1 className="welcome-title">Welcome to StoryMode</h1>
          <p className="welcome-subtitle">Select an action to begin.</p>
        </div>
        <div className="welcome-grid" role="list">
          <Action label="New Story" onActivate={handleNew}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" /><path d="M14 3v6h6" /><path d="M12 11v6" /><path d="M9 14h6" /></svg>
          </Action>
          <Action label="Open Story" onActivate={handleOpen}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h5l2 2h11v9a2 2 0 0 1-2 2H3z" /></svg>
          </Action>
          <Action label="Settings" onActivate={handleSettings}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9.4 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9.4a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H10a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09c0 .69.4 1.3 1 1.51a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V10c.69 0 1.3.4 1.51 1H21a2 2 0 0 1 0 4h-.09c-.69 0-1.3.4-1.51 1Z" /></svg>
          </Action>
          <Action label="Documentation" onActivate={handleDocs}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 2h8l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" /><path d="M12 12h4" /><path d="M12 16h4" /><path d="M8 12h.01" /><path d="M8 16h.01" /></svg>
          </Action>
        </div>
      </div>
    </div>
  );
};

const Sidebar: React.FC = () => {
  const { sidebarCollapsed } = useStore(selectUI);

  if (sidebarCollapsed) {
    return <aside className="sidebar-outer sidebar-collapsed" aria-hidden />;
  }

  return (
    <aside className="sidebar-outer">
      <header className="sidebar-header">
        <span className="sidebar-title">STORY</span>
      </header>
      <div className="sidebar-scroll">
        <div className="sidebar-pane">
          <FileList />
        </div>
      </div>
    </aside>
  );
};

const IconFile: React.FC<{ kind: string }> = ({ kind }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'story' ? (
      <>
        <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
        <path d="M14 3v6h6" />
      </>
    ) : (
      <path d="M4 4h16v16H4z" />
    )}
  </svg>
);

const IconDiagnostics: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 9v4" />
    <path d="M12 5v0" />
    <path d="M5.07 19h13.86a2 2 0 0 0 1.74-3l-6.93-12a2 2 0 0 0-3.48 0l-6.93 12a2 2 0 0 0 1.74 3Z" />
  </svg>
);

const IconError: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M9 9l6 6" />
    <path d="M15 9l-6 6" />
  </svg>
);

const IconWarning: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 9v4" />
    <path d="M12 17v0" />
    <path d="m3 17 7.89-13.26a1 1 0 0 1 1.72 0L20.5 17a1 1 0 0 1-.86 1.5H3.86A1 1 0 0 1 3 17Z" />
  </svg>
);

const IconBell: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 16v-5a6 6 0 1 0-12 0v5" />
    <path d="M5 16h14" />
    <path d="M10 20a2 2 0 0 0 4 0" />
    {active && <circle cx="18" cy="6" r="3" fill="currentColor" />}
  </svg>
);

const StatusBar: React.FC = () => {
  const file = useStore(selectFile);
  const parse = useStore(selectParse);
  const ui = useStore(selectUI);
  const compile = useStore(selectCompile);
  const notifications = useStore((s) => s.notifications);
  const markAllRead = useStore((s) => s.markAllRead);

  const kind = parse.fileKind || file.fileType || (file.path || file.content ? "story" : null);
  const encoding = file.encoding ? file.encoding.toUpperCase() : null;
  const caretLine = ui.caretLine ?? 1;
  const caretColumn = ui.caretColumn ?? 1;
  const diagnostics = parse.diagnostics;
  const errors = diagnostics.filter(d => d.severity === 'error').length;
  const warnings = diagnostics.filter(d => d.severity === 'warning').length;

  return (
    <footer className="status-bar" role="contentinfo">
  <div className="sb-left">
        {kind && (
          <div className="sb-item sb-kind" data-tip={`File: ${kind}`}>
            <IconFile kind={kind} />
            <span className="sb-text">{kind}</span>
          </div>
        )}
        {encoding && (
          <div className="sb-item sb-encoding" data-tip="Encoding">
            <span className="sb-text">{encoding}</span>
          </div>
        )}
        <div className="sb-item" data-tip="Line / Column">
          <span className="sb-text">Ln {caretLine}, Col {caretColumn}</span>
        </div>
      </div>
  <div className="sb-right">
        <div
          className="sb-item"
          data-tip={`${errors} error${errors!==1?'s':''}, ${warnings} warning${warnings!==1?'s':''}`}
          aria-label={`Diagnostics: ${errors} error${errors!==1?'s':''}, ${warnings} warning${warnings!==1?'s':''}`}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <IconError /> {errors}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <IconWarning /> {warnings}
            </span>
          </span>
        </div>
        <div
          className={`sb-item sb-bell${notifications.unread ? ' active' : ''}`}
          data-tip={notifications.unread ? `${notifications.unread} notification(s)` : 'Notifications'}
          role="button"
          tabIndex={0}
          onClick={() => notifications.unread && markAllRead()}
        >
          <IconBell active={!!notifications.unread} />
        </div>
      </div>
    </footer>
  );
};

const App: React.FC = () => {
  const file = useStore(selectFile);
  const ui = useStore(selectUI);
  useDebouncedParse();
  useAutoCompile();

  const hasStory = Boolean(file.path || file.content.length);
  const showPreview = hasStory && ui.previewVisible;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = ui.theme;
    root.dataset.themeId = ui.themeId ?? "";
  }, [ui.theme, ui.themeId]);

  useEffect(() => {
    if (!window.storymode?.syncShellState) return;
    window.storymode.syncShellState({
      previewVisible: ui.previewVisible,
      inspectorVisible: ui.inspectorVisible,
      statusBarVisible: ui.statusBarVisible,
      sidebarCollapsed: ui.sidebarCollapsed,
      themeMode: ui.themeMode,
      themeId: ui.themeId,
    });
  }, [
    ui.previewVisible,
    ui.inspectorVisible,
    ui.statusBarVisible,
    ui.sidebarCollapsed,
    ui.themeMode,
    ui.themeId,
  ]);

    // Menu event handlers for file operations
    useEffect(() => {
      const handleNew = () => useStore.getState().newStory();
      const handleSave = async () => {
        const st = useStore.getState();
        const composite = st.serializeStoryComposite();
        let targetPath = st.file.path;
        if (!targetPath) {
          const dialog = await window.storymode.saveAsDialog();
          if (dialog?.canceled || !dialog.path) return;
          targetPath = dialog.path.endsWith('.story.json') ? dialog.path : dialog.path + '.story.json';
          useStore.getState().setFilePath(targetPath);
        }
        const res = await window.storymode.writeFile(targetPath!, composite);
        if (res?.ok) useStore.getState().markSaved(targetPath!);
      };
      const handleSaveAs = async () => {
        const st = useStore.getState();
        const composite = st.serializeStoryComposite();
        const dialog = await window.storymode.saveAsDialog();
        if (dialog?.canceled || !dialog.path) return;
        const targetPath = dialog.path.endsWith('.story.json') ? dialog.path : dialog.path + '.story.json';
        const res = await window.storymode.writeFile(targetPath, composite);
        if (res?.ok) useStore.getState().markSaved(targetPath);
      };
      const handleSaveAll = () => handleSave(); // composite covers all for now
      const handleClose = () => useStore.getState().closeFile();
      const handleOpenResult = (e: Event) => {
        const detail: any = (e as CustomEvent).detail;
        if (detail && typeof detail.content === 'string') {
          // Try composite load first
          const loaded = useStore.getState().loadStoryComposite(detail.content, detail.path);
          if (!loaded) {
            useStore.getState().openFile(detail.path, detail.content);
          }
        }
      };
      window.addEventListener('menu:newStory', handleNew);
      window.addEventListener('menu:saveStory', handleSave);
      window.addEventListener('menu:saveStoryAs', handleSaveAs);
      window.addEventListener('menu:saveAllNarratives', handleSaveAll);
      window.addEventListener('menu:closeStory', handleClose);
      window.addEventListener('menu:fileOpenResult', handleOpenResult as any);
      return () => {
        window.removeEventListener('menu:newStory', handleNew);
        window.removeEventListener('menu:saveStory', handleSave);
        window.removeEventListener('menu:saveStoryAs', handleSaveAs);
        window.removeEventListener('menu:saveAllNarratives', handleSaveAll);
        window.removeEventListener('menu:closeStory', handleClose);
        window.removeEventListener('menu:fileOpenResult', handleOpenResult as any);
      };
    }, []);

  return (
    <div className="app-shell">
      <div className="workspace">
        <ActivityBar />
        <Sidebar />
        <div className="center-stage">
          {hasStory && <TabBar />}
          <div className="editor-stage">
            {hasStory ? (showPreview ? <PreviewPanel /> : <Editor />) : <WelcomeEmptyState />}
          </div>
        </div>
        <Inspector />
      </div>
      {ui.statusBarVisible && <StatusBar />}
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<App />);







