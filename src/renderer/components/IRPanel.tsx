import React from 'react';
import { useAutoHideScrollbar } from '../hooks/useAutoHideScrollbar.js';
import { useStore, selectCompile } from '../store/store.js';

export const IRPanel: React.FC = () => {
  const compile = useStore(selectCompile);
  if (compile.status === 'idle') return <div style={{ padding: 8 }}>No compile yet.</div>;
  if (compile.status === 'compiling') return <div style={{ padding: 8 }}>Compiling...</div>;
  if (compile.status === 'error') return <div style={{ padding: 8, color: '#c33' }}>Compile error: {compile.error}</div>;
  const ref = useAutoHideScrollbar<HTMLDivElement>();
  return (
    <div ref={ref} style={{ padding: 8, fontSize: 12, lineHeight: 1.4 }}>
      <pre style={{ margin: 0 }}>{safeStringify(compile.ir)}</pre>
      {compile.stats && (
        <div style={{ marginTop: 8, opacity: 0.8 }}>
          IR Nodes: {compile.stats.irNodeCount} | Symbols: {compile.stats.symbolCount} | Gen: {compile.stats.genTimeMs} ms
        </div>
      )}
    </div>
  );
};

function safeStringify(v: any): string {
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}
