import React from 'react';
import { useStore, selectParse } from '../store/store.js';

export const DiagnosticsPanel: React.FC = () => {
  const parse = useStore(selectParse);
  const diags = parse.diagnostics;
  if (!diags.length) return <div style={{ padding: 8, fontSize: 12 }}>No diagnostics.</div>;
  // All navigation disabled per spec: diagnostics are read-only, non-interactive.

  return (
    <div style={{ padding: 0, fontSize: 12, overflow: 'auto', maxHeight: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>Severity</th>
            <th style={th}>Message</th>
            <th style={th}>Range</th>
            <th style={th}>Code</th>
          </tr>
        </thead>
        <tbody>
          {diags.map((d, i) => (
            <tr
              key={i}
              style={{ background: i % 2 ? '#222' : '#1a1a1a' }}
            >
              <td style={td}>{d.severity}</td>
              <td style={td}>{d.message}</td>
              <td style={td}>{`${d.start.line + 1}:${d.start.column + 1}-${d.end.line + 1}:${d.end.column + 1}`}</td>
              <td style={td}>{d.code || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const th: React.CSSProperties = { textAlign: 'left', padding: '4px 6px', borderBottom: '1px solid #444', position: 'sticky', top: 0, background: '#111' };
const td: React.CSSProperties = { padding: '2px 6px', verticalAlign: 'top' };
