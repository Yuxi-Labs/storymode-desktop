import React from 'react';
import { useAutoHideScrollbar } from '../hooks/useAutoHideScrollbar.js';
import { useStore, selectParse } from '../store/store.js';

export const TokensPanel: React.FC = () => {
  const parse = useStore(selectParse);
  if (!parse.tokens.length) return <div style={{ padding: 8 }}>No tokens.</div>;
  const ref = useAutoHideScrollbar<HTMLDivElement>();
  return (
    <div ref={ref} style={{ padding: 8, fontSize: 12 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={th}>#</th>
            <th style={th}>Type</th>
            <th style={th}>Lexeme</th>
            <th style={th}>Start</th>
            <th style={th}>End</th>
          </tr>
        </thead>
        <tbody>
          {parse.tokens.slice(0, 2000).map(t => (
            <tr key={t.index} style={{ borderBottom: '1px solid #333' }}>
              <td style={td}>{t.index}</td>
              <td style={td}>{t.type}</td>
              <td style={td}>{t.lexeme}</td>
              <td style={td}>{t.start.line}:{t.start.column}</td>
              <td style={td}>{t.end.line}:{t.end.column}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const th: React.CSSProperties = { textAlign: 'left', padding: '2px 4px', borderBottom: '1px solid #555', position: 'sticky', top: 0, background: '#222' };
const td: React.CSSProperties = { padding: '2px 4px', fontFamily: 'monospace' };
