import React from 'react';
import { useStore, selectParse } from '../store/store.js';

export const ASTPanel: React.FC = () => {
  const parse = useStore(selectParse);
  if (parse.status === 'idle') return <div style={{ padding: 8 }}>No parse yet.</div>;
  if (parse.status === 'parsing') return <div style={{ padding: 8 }}>Parsing...</div>;
  if (parse.status === 'error') return <div style={{ padding: 8, color: '#c33' }}>Parse error: {parse.error}</div>;
  return (
    <div style={{ padding: 8, overflow: 'auto', fontSize: 12, lineHeight: 1.4 }}>
      <pre style={{ margin: 0 }}>{safeStringify(parse.ast)}</pre>
    </div>
  );
};

function safeStringify(v: any): string {
  try { return JSON.stringify(v, replacer, 2); } catch { return String(v); }
}
function replacer(_k: string, val: any) {
  if (val && typeof val === 'object' && Object.keys(val).length > 100) {
    const trimmed: any = {}; let i = 0;
    for (const k of Object.keys(val)) { if (i++ > 100) { trimmed.__truncated = true; break; } trimmed[k] = val[k]; }
    return trimmed;
  }
  return val;
}
