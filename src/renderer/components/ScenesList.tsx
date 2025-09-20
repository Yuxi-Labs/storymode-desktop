import React from 'react';
import { useStore, selectParse } from '../store/store.js';

export const ScenesList: React.FC = () => {
  const parse = useStore(selectParse);
  const scenes = parse.sceneIndex || [];
  function jump(s: any) {
    if (!s) return;
    window.dispatchEvent(new CustomEvent('reveal-position', { detail: { line: (s.line || 0) + 1, column: 1 } }));
  }
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      <div style={{ padding: '4px 6px', fontSize: 11, fontWeight: 600, letterSpacing: '.5px', borderBottom: '1px solid var(--border)' }}>SCENES</div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 6, fontSize: 12, lineHeight: 1.5 }}>
        {scenes.length === 0 && <li style={{ opacity: .55 }}>No scenes parsed</li>}
        {scenes.map((s: any) => (
          <li key={s.id} style={{ cursor: 'pointer', padding: '2px 4px', borderRadius: 4 }} onClick={() => jump(s)}
              onKeyDown={(e) => { if (e.key === 'Enter') jump(s); }} tabIndex={0}>
            <span style={{ color: 'var(--accent)' }}>{s.id}</span>
            <span style={{ opacity: .5, marginLeft: 6 }}>Ln {s.line + 1}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
