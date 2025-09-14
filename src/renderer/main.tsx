import React, { useEffect, useState } from 'react';
import './styles.css';
import { createRoot } from 'react-dom/client';
import { useStore, selectFile, selectParse, selectCompile, type RootState, type ParseState } from './store/store.js';
import { Editor } from './components/Editor.js';
import { DiagnosticsPanel } from './components/DiagnosticsPanel.js';
import { useDebouncedParse } from './hooks/useDebouncedParse.js';
import { useAutoCompile } from './hooks/useAutoCompile.js';
import { ASTPanel } from './components/ASTPanel.js';
import { TokensPanel } from './components/TokensPanel.js';
import { IRPanel } from './components/IRPanel.js';

// helper removed: file open now handled purely via menu IPC

const App: React.FC = () => {
  const file = useStore(selectFile);
  const parse = useStore(selectParse);
  const compile = useStore(selectCompile);
  useDebouncedParse();
  useAutoCompile();
  const openFile = useStore((s: RootState) => s.openFile);
  const setTheme = useStore((s: RootState) => s.setTheme);
  const beginCompile = useStore((s: RootState) => s.beginCompile);
  const setActivePanel = useStore((s: RootState) => s.setActivePanel);
  const isDark = useStore((s: RootState) => s.ui.theme === 'dark');
  // toggle root html class for dark mode
  useEffect(() => {
    const cls = document.documentElement.classList; if (isDark) cls.add('dark'); else cls.remove('dark');
  }, [isDark]);

  // IPC channel listeners from main menu events
  useEffect(() => {
    const { ipcRenderer } = (window as any).require ? (window as any).require('electron') : {};
    // Fallback: attach to global if preload later exposes dedicated events via contextBridge; for now use window.addEventListener custom events
    // Because contextIsolation is true, we cannot directly require electron here; instead we listen for custom events dispatched in preload (future enhancement).
    // Temporary implementation: listen to raw DOM events fired by preload using window.dispatchEvent(new CustomEvent(...)).
    function onFileOpenResult(e: any) {
      const detail = e.detail;
      if (!detail || !detail.path) return;
      openFile(detail.path, detail.content ?? '');
    }
    function onToggleTheme() { setTheme(isDark ? 'light' : 'dark'); }
    function onSetPanel(e: any) { if (e.detail) setActivePanel(e.detail); }
    async function onRecompile() {
      beginCompile();
      const { content, path } = useStore.getState().file;
      const result = await window.storymode.compile(content, path ?? undefined);
      useStore.getState().applyCompileResult(result);
    }
    window.addEventListener('menu:fileOpenResult', onFileOpenResult as any);
    window.addEventListener('menu:toggleTheme', onToggleTheme as any);
    window.addEventListener('menu:setPanel', onSetPanel as any);
    window.addEventListener('menu:recompile', onRecompile as any);
    return () => {
      window.removeEventListener('menu:fileOpenResult', onFileOpenResult as any);
      window.removeEventListener('menu:toggleTheme', onToggleTheme as any);
      window.removeEventListener('menu:setPanel', onSetPanel as any);
      window.removeEventListener('menu:recompile', onRecompile as any);
    };
  }, [openFile, setTheme, isDark, setActivePanel, beginCompile]);
  return (
    <div className="app-shell">
      <div className="workspace">
        <LeftPanel />
        <div className="editor-column">
          <div className="editor-wrapper"><Editor /></div>
        </div>
        <RightPanel parse={parse} compile={compile} />
      </div>
      <FooterStatus parse={parse} />
    </div>
  );
};

const LeftPanel: React.FC = () => (
  <div style={{ width: 160, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--panel-bg)', fontSize: 11, padding: '6px 6px 4px 6px' }}>
    <div style={{ fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>STORYMODE</div>
    {/* Reserved space for future project/file tree; intentionally no instructional text */}
  </div>
);

interface RightPanelProps { parse: ParseState; compile: any; }
const tabs: Array<{ id: string; render: () => JSX.Element }> = [
  { id: 'diagnostics', render: () => <DiagnosticsPanel /> },
  { id: 'ast', render: () => <ASTPanel /> },
  { id: 'tokens', render: () => <TokensPanel /> },
  { id: 'ir', render: () => <IRPanel /> }
];
const RightPanel: React.FC<RightPanelProps> = ({ parse, compile }) => {
  const active = useStore(s => s.ui.activePanel);
  const setActivePanel = useStore(s => s.setActivePanel);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  useEffect(() => {
    // lazy init after mount to avoid SSR mismatch (not that we SSR, but keeps predictable)
    try {
      const stored = localStorage.getItem('storymode.rightPanelCollapsed');
      if (stored === 'true') setCollapsed(true);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem('storymode.rightPanelCollapsed', String(collapsed)); } catch { /* ignore */ }
  }, [collapsed]);
  if (collapsed) return <div style={{ width: 8, background: 'var(--panel-bg)', borderLeft: '1px solid var(--border)' }} />;
  return (
    <div className="sidebar" style={{ position: 'relative', width: 360 }}>
      <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)', background: 'var(--bg-alt)', fontSize: 11, fontWeight: 600 }}>{active.toUpperCase()}</div>
      <div className="sidebar-body mono" style={{ flex: 1 }}>
        <div style={{ marginBottom: 8, fontSize: 11, opacity: 0.8 }}>
          Parse: {parse.status} v{parse.version} {parse.parseTimeMs != null && `(${parse.parseTimeMs} ms)`} | Compile: {compile.status} v{compile.version} {compile.genTimeMs != null && `(${compile.genTimeMs} ms)`}
        </div>
        <div style={{ position: 'absolute', inset: '70px 0 0 0' }}>
          <div style={{ position: 'absolute', inset: 0, overflow: 'auto' }}>
            {tabs.find(t => t.id === active)?.render()}
          </div>
        </div>
      </div>
    </div>
  );
};

// TopBar removed per spec

interface FooterStatusProps { parse: ParseState; }
const FooterStatus: React.FC<FooterStatusProps> = ({ parse }: FooterStatusProps) => {
  const errorCount = parse.diagnostics.filter((d: any) => d.severity === 'error').length;
  const warnCount = parse.diagnostics.filter((d: any) => d.severity === 'warning').length;
  return (
    <div className="status-footer">
      <span>Parse: {parse.parseTimeMs != null ? parse.parseTimeMs + ' ms' : '-'}</span>
      <span>Errors: {errorCount}</span>
      <span>Warnings: {warnCount}</span>
      <span>Tokens: {parse.tokens?.length ?? 0}</span>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);

// window.storymode types provided by global.d.ts
