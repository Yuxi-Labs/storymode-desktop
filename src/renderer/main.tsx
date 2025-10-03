import React, { useEffect, useState, useRef } from "react";
import { I18nProvider, t, useI18n } from './i18n.js';
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
import { AboutDialog } from './components/AboutDialog.js';

// Renderer telemetry wrapper (no hooks inside, safe anywhere)
function rTrack(event: string, props?: Record<string, any>) {
  try {
    const enabled = useStore.getState().ui.telemetryEnabled;
    if (!enabled) return;
    window.storymode?.telemetryEvent?.(event, props);
  } catch { /* ignore */ }
}

interface RenameState { open: boolean; id: string; type: 'story'|'narrative'|'scene'; current: string; }
interface DeleteConfirmState { open: boolean; id: string; title: string; }
// useStore already imported above from './store/store.js'

// Set up global theme listeners exactly once.
function installThemeListeners() {
  const win = window as any;
  if (win.__storymodeThemeListenersInstalled) return;
  win.__storymodeThemeListenersInstalled = true;
  const rootEl = document.documentElement;
  const applyDomTheme = () => {
    const state = useStore.getState();
    rootEl.dataset.theme = state.ui.theme; // simple data attribute for CSS hooks
  };
  // Initial apply
  applyDomTheme();
  window.addEventListener('menu:setThemeMode', (e: any) => {
    const mode = e.detail as 'light' | 'dark' | 'auto';
    useStore.getState().setThemeMode(mode);
    try { localStorage.setItem('storymode.themeMode', mode); } catch { /* ignore */ }
    try { localStorage.removeItem('storymode.themeId'); } catch { /* ignore */ }
    applyDomTheme();
  });
  window.addEventListener('menu:applyThemePreset', (e: any) => {
    const themeId = (e.detail as string | null) || null;
    useStore.getState().applyThemePreset(themeId);
    try {
      if (themeId) localStorage.setItem('storymode.themeId', themeId); else localStorage.removeItem('storymode.themeId');
    } catch { /* ignore */ }
    applyDomTheme();
  });
  // React to system scheme changes if in auto mode
  try {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', () => {
      const st = useStore.getState();
      if (st.ui.themeMode === 'auto' && !st.ui.themeId) {
        st.applySystemTheme(mql.matches ? 'dark' : 'light');
        applyDomTheme();
      }
    });
  } catch { /* ignore */ }
  // Keep DOM attribute in sync with store changes triggered within app
  let prevTheme = useStore.getState().ui.theme;
  useStore.subscribe((state) => {
    const nextTheme = state.ui.theme;
    if (nextTheme !== prevTheme) {
      prevTheme = nextTheme;
      applyDomTheme();
    }
  });
}

installThemeListeners();

const Inspector: React.FC = () => {
  const { inspectorWidthPx } = useStore(selectUI);
  return (
    <aside className="inspector" style={{ width: inspectorWidthPx }}>
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

  // Create a new Story (was incorrectly calling newFile which leaves hasStory = false)
  const handleNew = () => { useStore.getState().newStory(); rTrack('story.new'); };
  const handleOpen = async () => {
    const target = await window.storymode.openFileDialog();
    if (target?.canceled || !target.path) return;
    const read = await window.storymode.readFile(target.path);
    if (!read?.ok || typeof read.content !== "string") return;
    useStore.getState().openFile(target.path, read.content);
  };

  const handleSettings = () => {
    window.dispatchEvent(new CustomEvent('menu:openSettings'));
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
          <h1 className="welcome-title">{t('app.name')}</h1>
          <p className="welcome-subtitle">{t('welcome.subtitle')}</p>
        </div>
        <div className="welcome-grid" role="list">
          <Action label={t('activity.newStory')} onActivate={handleNew}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" /><path d="M14 3v6h6" /><path d="M12 11v6" /><path d="M9 14h6" /></svg>
          </Action>
          <Action label={t('activity.openStory')} onActivate={handleOpen}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h5l2 2h11v9a2 2 0 0 1-2 2H3z" /></svg>
          </Action>
          <Action label={t('activity.settings')} onActivate={handleSettings}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9.4 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9.4a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H10a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09c0 .69.4 1.3 1 1.51a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V10c.69 0 1.3.4 1.51 1H21a2 2 0 0 1 0 4h-.09c-.69 0-1.3.4-1.51 1Z" /></svg>
          </Action>
          <Action label={t('activity.documentation')} onActivate={handleDocs}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 2h8l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" /><path d="M12 12h4" /><path d="M12 16h4" /><path d="M8 12h.01" /><path d="M8 16h.01" /></svg>
          </Action>
        </div>
      </div>
    </div>
  );
};

const Sidebar: React.FC = () => {
  const { sidebarCollapsed, sidebarWidthPx } = useStore(selectUI);

  if (sidebarCollapsed) {
    return <aside className="sidebar-outer sidebar-collapsed" aria-hidden />;
  }

  return (
    <aside className="sidebar-outer" style={{ width: sidebarWidthPx }}>
      <header className="sidebar-header">
  <span className="sidebar-title">{t('sidebar.title')}</span>
      </header>
      <div className="sidebar-scroll">
        <div className="sidebar-pane">
          <FileList />
        </div>
      </div>
    </aside>
  );
};

const VResizeHandle: React.FC<{ pos: 'after-sidebar' | 'before-inspector'; onDrag: (dx: number) => void; onDouble?: () => void; }> = ({ pos, onDrag, onDouble }) => {
  const dragging = useRef(false);
  const startX = useRef<number>(0);
  const cls = `v-resize-handle ${pos}`;
  const onMouseMove = (e: MouseEvent) => {
    if (!dragging.current) return;
  const dx = e.clientX - (startX.current ?? 0);
    onDrag(dx);
  };
  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    document.body.classList.remove('resizing-h');
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', endDrag);
  };
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragging.current = true;
    startX.current = e.clientX;
    document.body.classList.add('resizing-h');
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', endDrag);
  };
  return <div className={cls} onMouseDown={onMouseDown} onDoubleClick={onDouble} role="separator" aria-orientation="vertical" />;
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
  // Present encoding: map internal codes to human readable tokens
  const mapEncoding = (enc?: string | null) => {
    if (!enc) return null;
    const lower = enc.toLowerCase();
    switch (lower) {
      case 'utf-8-bom': return 'UTF-8 (BOM)';
      case 'utf-16le-bom': return 'UTF-16 LE (BOM)';
      case 'utf-16be-bom': return 'UTF-16 BE (BOM)';
      case 'utf-32le-bom': return 'UTF-32 LE (BOM)';
      case 'utf-32be-bom': return 'UTF-32 BE (BOM)';
      case 'utf-16le': return 'UTF-16 LE';
      case 'utf-16be': return 'UTF-16 BE';
      case 'utf-32le': return 'UTF-32 LE';
      case 'utf-32be': return 'UTF-32 BE';
      case 'utf-8': return 'UTF-8';
      case 'unknown': return 'Unknown';
      default: return enc.toUpperCase();
    }
  };
  const encoding = mapEncoding(file.encoding);
  // Derive file type label only (Story / Narrative / Scene)
  const activeEntity = useStore(s => s.storyModel.activeEntity);
  const entityLabel = activeEntity ? (activeEntity.type === 'story' ? t('count.stories') : activeEntity.type === 'narrative' ? t('count.narratives') : t('count.scenes')) : null;
  const caretLine = ui.caretLine ?? 1;
  const caretColumn = ui.caretColumn ?? 1;
  const diagnostics = parse.diagnostics;
  const errors = diagnostics.filter(d => d.severity === 'error').length;
  const warnings = diagnostics.filter(d => d.severity === 'warning').length;

  return (
    <footer className="status-bar" role="contentinfo">
  <div className="sb-left">
        {entityLabel && (
          <div className="sb-item sb-kind" data-tip={t('status.fileType')}>
            <span className="sb-text">{entityLabel}</span>
          </div>
        )}
        {encoding && (
          <div className="sb-item sb-encoding" data-tip={t('status.encoding')}>
            <span className="sb-text">{encoding}</span>
          </div>
        )}
        <div className="sb-item" data-tip={t('status.lineColumn').replace('{line}', String(caretLine)).replace('{col}', String(caretColumn))}>
          <span className="sb-text">{t('status.lineColumn').replace('{line}', String(caretLine)).replace('{col}', String(caretColumn))}</span>
        </div>
      </div>
  <div className="sb-right">
        <div
          className="sb-item"
          data-tip={t('status.diagnostics.tooltip').replace('{errors}', String(errors)).replace('{warnings}', String(warnings))}
          aria-label={t('status.diagnostics.aria').replace('{errors}', String(errors)).replace('{warnings}', String(warnings))}
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
          data-tip={notifications.unread ? t('status.notifications.count').replace('{count}', String(notifications.unread)) : t('status.notifications')}
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
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [renameState, setRenameState] = useState<RenameState>({ open:false, id:'', type:'scene', current:'' });
  const [deleteState, setDeleteState] = useState<DeleteConfirmState>({ open:false, id:'', title:'' });
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
  const handleNew = () => { useStore.getState().newStory(); rTrack('story.new'); };
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
          const loaded = useStore.getState().loadStoryComposite(detail.content, detail.path);
          if (!loaded) {
            useStore.getState().openFile(detail.path, detail.content, detail.sizeBytes, detail.lastModifiedMs, detail.encoding);
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

  // About dialog handler
  useEffect(() => {
    const open = () => setAboutOpen(true);
    window.addEventListener('menu:openAbout', open);
    return () => window.removeEventListener('menu:openAbout', open);
  }, []);

  // Settings open event
  useEffect(() => {
    const open = () => setSettingsOpen(true);
    window.addEventListener('menu:openSettings', open as any);
    return () => window.removeEventListener('menu:openSettings', open as any);
  }, []);

  // Handle context menu rename + delete requests from main
  useEffect(() => {
    const handleReqRename = (e: Event) => {
      const detail: any = (e as CustomEvent).detail;
      if (!detail) return;
      let current = '';
      const st = useStore.getState();
      if (detail.type === 'story') current = st.storyModel.story?.title || '';
      else if (detail.type === 'narrative') current = st.storyModel.narratives[detail.narrativeId!]?.title || '';
      else if (detail.type === 'scene') current = st.storyModel.scenes[detail.sceneId!]?.title || '';
      setRenameState({ open:true, id: detail.id, type: detail.type, current });
    };
    const handleReqDelete = (e: Event) => {
      const detail: any = (e as CustomEvent).detail;
      if (!detail) return;
      setDeleteState({ open:true, id: detail.id, title: detail.title || '' });
    };
    window.addEventListener('explorer:requestRename', handleReqRename as any);
    window.addEventListener('explorer:requestDeleteScene', handleReqDelete as any);
    return () => {
      window.removeEventListener('explorer:requestRename', handleReqRename as any);
      window.removeEventListener('explorer:requestDeleteScene', handleReqDelete as any);
    };
  }, []);

  const applyRename = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) { setRenameState({ ...renameState, open:false }); return; }
    const st = useStore.getState();
    if (renameState.type === 'story') st.renameStory(trimmed);
    else if (renameState.type === 'narrative') st.renameNarrative(renameState.id.split(':').pop()!, trimmed);
    else if (renameState.type === 'scene') st.renameScene(renameState.id.split(':').pop()!, trimmed);
    setRenameState({ ...renameState, open:false });
  };
  const applyDeleteScene = () => {
    const st = useStore.getState();
    st.deleteScene(deleteState.id);
    setDeleteState({ open:false, id:'', title:'' });
  };

  return (
    <div className="app-shell">
      <div className="workspace">
        <ActivityBar />
        <Sidebar />
        {hasStory && <ResizeSidebarHandle />}
        <div className="center-stage">
          {hasStory && <TabBar />}
          <div className="editor-stage">
            {hasStory ? (showPreview ? <PreviewPanel /> : <Editor />) : <WelcomeEmptyState />}
          </div>
        </div>
        {hasStory && <ResizeInspectorHandle />}
        <Inspector />
      </div>
      {ui.statusBarVisible && <StatusBar />}
    <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
      {renameState.open && (
  <div className="modal-overlay" role="presentation" onMouseDown={e => { if (e.target===e.currentTarget) setRenameState({ ...renameState, open:false }); }}>
          <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="rename-title">
            <header className="modal-header">
              <h1 id="rename-title" className="modal-title">{t('modal.rename.title')} {renameState.type === 'story' ? t('entity.story') : renameState.type === 'narrative' ? t('entity.narrative') : t('entity.scene')}</h1>
              <button className="modal-close" aria-label={t('action.close')} onClick={() => setRenameState({ ...renameState, open:false })}>×</button>
            </header>
            <div className="modal-body">
              <label className="modal-label">{t('modal.rename.label')}</label>
              <input
                className="modal-input"
                defaultValue={renameState.current}
                autoFocus
                onKeyDown={(e) => { if (e.key==='Enter') applyRename((e.target as HTMLInputElement).value); if (e.key==='Escape') setRenameState({ ...renameState, open:false }); }}
              />
            </div>
            <footer className="modal-footer">
              <button className="btn btn-neutral" onClick={() => setRenameState({ ...renameState, open:false })}>{t('modal.rename.cancel')}</button>
              <button className="btn btn-primary" onClick={() => {
                const el = (document.querySelector('.modal-input') as HTMLInputElement|undefined); if (el) applyRename(el.value);
              }}>{t('modal.rename.apply')}</button>
            </footer>
          </div>
        </div>
      )}
      {deleteState.open && (
        <div className="modal-overlay" role="presentation" onMouseDown={e => { if (e.target===e.currentTarget) setDeleteState({ open:false, id:'', title:'' }); }}>
          <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <header className="modal-header">
              <h1 id="delete-title" className="modal-title">{t('modal.delete.title.scene')}</h1>
              <button className="modal-close" aria-label={t('action.close')} onClick={() => setDeleteState({ open:false, id:'', title:'' })}>×</button>
            </header>
            <div className="modal-body">
              <p>{t('modal.delete.prompt.scene').replace('{title}', `<${deleteState.title || t('tab.untitled.scene')}>`)}</p>
            </div>
            <footer className="modal-footer">
              <button className="btn btn-neutral" onClick={() => setDeleteState({ open:false, id:'', title:'' })}>{t('modal.delete.cancel')}</button>
              <button className="btn btn-danger" onClick={applyDeleteScene}>{t('modal.delete.confirm')}</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};
import { useState as useReactState } from 'react';

const SettingsDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { locale, setLocale } = useI18n();
  const store = useStore();
  const [category, setCategory] = useReactState<'general'|'appearance'|'language'|'privacy'>('language');
  const themeMode = store.ui.themeMode;
  const applyMode = (mode: 'light'|'dark'|'auto') => store.setThemeMode(mode);
  const telemetryEnabled = store.ui.telemetryEnabled;
  const telemetryShareEnabled = store.ui.telemetryShareEnabled || false;
  const toggleTelemetry = (checked: boolean) => store.setTelemetryEnabled(checked);
  const toggleShare = (checked: boolean) => { store.setTelemetryShareEnabled(checked); try { (globalThis as any).__storymodeShareTelemetry = checked; } catch {} };
  const [summary, setSummary] = useReactState<{ total:number; lastN:number; counts:Record<string,number> }|null>(null);
  const loadSummary = async () => {
    try { const res = await (window as any).storymode?.telemetrySummary?.(); if (res?.ok) setSummary(res as any); } catch {}
  };
  return (
    <div className="modal-overlay" role="presentation" onMouseDown={e => { if (e.target===e.currentTarget) onClose(); }}>
      <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title" style={{ width:720, maxWidth:'90vw', display:'flex', flexDirection:'column' }}>
        <header className="modal-header" style={{ paddingBottom:8 }}>
          <h1 id="settings-title" className="modal-title" style={{ fontSize:16 }}>{t('activity.settings')}</h1>
          <button className="modal-close" aria-label={t('action.close')} onClick={onClose}>×</button>
        </header>
        <div style={{ display:'flex', minHeight:360, flex:'1 1 auto', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
          <nav aria-label="Settings Sections" style={{ width:180, borderRight:'1px solid rgba(255,255,255,0.08)', display:'flex', flexDirection:'column' }}>
            {[
              { id:'general', label:t('settings.categories.general') },
              { id:'appearance', label:t('settings.categories.appearance') },
              { id:'language', label:t('settings.categories.language') },
              { id:'privacy', label:t('settings.categories.privacy') },
            ].map(item => (
              <button key={item.id} onClick={() => setCategory(item.id as any)}
                className="sidebar-btn" aria-current={category===item.id}
                style={{
                  textAlign:'left', padding:'8px 12px', background: category===item.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border:'none', color:'inherit', cursor:'pointer', fontSize:13
                }}>{item.label}</button>
            ))}
          </nav>
          <section style={{ flex:1, padding:'16px 20px', overflowY:'auto', display:'flex', flexDirection:'column', gap:24 }}>
            {category==='appearance' && (
              <div>
                <h2 style={{ fontSize:14, margin:'0 0 12px 0', letterSpacing:0.5 }}>{t('settings.categories.appearance')}</h2>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div>
                    <label style={{ display:'block', fontSize:12, opacity:0.7, marginBottom:4 }}>{t('settings.theme.mode')}</label>
                    <div style={{ display:'flex', gap:8 }}>
                      {(['auto','light','dark'] as const).map(m => (
                        <button key={m} onClick={() => applyMode(m)}
                          className={themeMode===m ? 'btn btn-primary' : 'btn btn-neutral'}
                          style={{ fontSize:12, padding:'4px 10px' }}>
                          {t(m==='auto' ? 'settings.theme.auto' : m==='light' ? 'settings.theme.light' : 'settings.theme.dark')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {category==='language' && (
              <div>
                <h2 style={{ fontSize:14, margin:'0 0 12px 0', letterSpacing:0.5 }}>{t('settings.categories.language')}</h2>
                <label style={{ display:'flex', flexDirection:'column', gap:6, maxWidth:260 }}>
                  <span style={{ fontSize:12, opacity:0.7 }}>{t('settings.language.select')}</span>
                  <select value={locale} onChange={e => setLocale(e.target.value as any)} className="modal-input" style={{ height:32 }}>
                    <option value="en">English</option>
                    <option value="zh-CN">简体中文</option>
                  </select>
                </label>
              </div>
            )}
            {category==='general' && (
              <div>
                <h2 style={{ fontSize:14, margin:'0 0 12px 0', letterSpacing:0.5 }}>{t('settings.categories.general')}</h2>
                <p style={{ fontSize:12, opacity:0.75, lineHeight:1.5 }}>
                  StoryMode {t('settings.categories.general')} – minimal configuration for now. More options will appear here as features grow.
                </p>
              </div>
            )}
            {category==='privacy' && (
              <div>
                <h2 style={{ fontSize:14, margin:'0 0 12px 12px', letterSpacing:0.5 }}>{t('settings.categories.privacy')}</h2>
                <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:560 }}>
                  <label style={{ display:'flex', alignItems:'flex-start', gap:10, fontSize:13, background:'rgba(255,255,255,0.04)', padding:'12px 14px', borderRadius:4 }}>
                    <input type="checkbox" checked={telemetryEnabled} onChange={e => toggleTelemetry(e.target.checked)} style={{ marginTop:2 }} />
                    <span style={{ lineHeight:1.4 }}>
                      <strong style={{ display:'block', marginBottom:4 }}>{t('settings.telemetry.enable')}</strong>
                      <span style={{ opacity:0.75, fontSize:12 }}>{t('settings.telemetry.desc')}</span>
                    </span>
                  </label>
                  <label style={{ display:'flex', alignItems:'flex-start', gap:10, fontSize:13, background:'rgba(255,255,255,0.04)', padding:'12px 14px', borderRadius:4 }}>
                    <input type="checkbox" checked={telemetryShareEnabled} onChange={e => toggleShare(e.target.checked)} style={{ marginTop:2 }} />
                    <span style={{ lineHeight:1.4 }}>
                      <strong style={{ display:'block', marginBottom:4 }}>{t('settings.telemetry.share')}</strong>
                      <span style={{ opacity:0.75, fontSize:12 }}>{t('settings.telemetry.share.desc')}</span>
                    </span>
                  </label>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <button className="btn btn-neutral" style={{ fontSize:12, padding:'4px 10px' }} onClick={loadSummary}>Load Summary</button>
                    {summary && <span style={{ fontSize:11, opacity:0.7 }}>Events: {summary.total} (showing last {summary.lastN})</span>}
                  </div>
                  {summary && (
                    <pre style={{ background:'rgba(255,255,255,0.05)', padding:12, fontSize:11, maxHeight:160, overflow:'auto', margin:0 }}>
{JSON.stringify(summary.counts, null, 2)}
                    </pre>
                  )}
                  <p style={{ fontSize:11, opacity:0.5, margin:'0 0 4px 4px' }}>Log file lives in your user data directory and rotates at ~1MB. You can delete it anytime.</p>
                </div>
              </div>
            )}
          </section>
        </div>
        <footer className="modal-footer" style={{ borderTop:'1px solid rgba(255,255,255,0.08)', marginTop:0 }}>
          <button className="btn btn-neutral" onClick={onClose}>{t('settings.close')}</button>
        </footer>
      </div>
    </div>
  );
};

const ResizeSidebarHandle: React.FC = () => {
  const width = useStore(s => s.ui.sidebarWidthPx);
  const setWidth = useStore(s => s.setSidebarWidth);
  const onDrag = (dx: number) => setWidth(width + dx);
  const onDouble = () => setWidth(240);
  return <VResizeHandle pos="after-sidebar" onDrag={onDrag} onDouble={onDouble} />;
};
const ResizeInspectorHandle: React.FC = () => {
  const width = useStore(s => s.ui.inspectorWidthPx);
  const setWidth = useStore(s => s.setInspectorWidth);
  const onDrag = (dx: number) => setWidth(width - dx); // handle sits to left of inspector
  const onDouble = () => setWidth(320);
  return <VResizeHandle pos="before-inspector" onDrag={onDrag} onDouble={onDouble} />;
};

createRoot(document.getElementById("root")!).render(<I18nProvider initialLocale={navigator.language.startsWith('zh') ? 'zh-CN' : 'en'}><App /></I18nProvider>);







