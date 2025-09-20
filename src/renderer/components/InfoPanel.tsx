import React from 'react';
import { useStore, selectFile } from '../store/store.js';

interface MetaItem { key: string; value: string; }

function extractMeta(text: string): MetaItem[] {
  const lines = text.split(/\r?\n/);
  const out: MetaItem[] = [];
  for (let i = 0; i < Math.min(lines.length, 500); i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const m = /^@([a-zA-Z0-9_]+):\s*(.*)$/.exec(line);
    if (m) {
      out.push({ key: m[1], value: m[2].trim() });
      continue;
    }
    // stop scanning when we hit non-directive content after some directives collected
    if (out.length > 0 && !line.startsWith('@')) break;
  }
  return out;
}

export const InfoPanel: React.FC = () => {
  const file = useStore(selectFile);
  const meta = (React as any).useMemo(() => extractMeta(file.content || ''), [file.content]);
  if (!file.content) return <div style={{ padding: 12, fontSize: 12, opacity: .6 }}>No file loaded.</div>;
  return (
    <div style={{ padding: 12, fontSize: 12, lineHeight: 1.6 }}>
      {meta.length === 0 && <div style={{ opacity: .6 }}>No directives detected at top of file.</div>}
  {meta.map((m: MetaItem) => (
        <div key={m.key} style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 10, letterSpacing: '.5px', fontWeight: 600, opacity: .7 }}>{m.key.toUpperCase()}</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{m.value}</div>
        </div>
      ))}
    </div>
  );
};
