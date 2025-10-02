import React from 'react';
import { useAutoHideScrollbar } from '../hooks/useAutoHideScrollbar.js';
import { useStore, selectFile } from '../store/store.js';

function buildPreview(text: string): { __html: string } {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    if (/^@\w+:/i.test(line)) continue; // skip directives
    if (!line.trim()) { out.push('<div class="pv-blank"></div>'); continue; }
    if (/^::(story|scene|end)/i.test(line)) {
      out.push(`<div class="pv-scene">${escapeHtml(line)}</div>`);
      continue;
    }
    out.push(`<div class="pv-line">${escapeHtml(line)}</div>`);
  }
  return { __html: out.join('') };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c] as string));
}

export const PreviewPanel: React.FC = () => {
  const file = useStore(selectFile);
  if (!file.content) return <div style={{ padding: 12, fontSize: 12, opacity: .6 }}>No file loaded.</div>;
  const html = buildPreview(file.content);
  const ref = useAutoHideScrollbar<HTMLDivElement>();
  return <div ref={ref} className="preview-root" style={{ padding: 16, fontSize: 13, lineHeight: 1.6, fontFamily: 'serif' }} dangerouslySetInnerHTML={html} />;
};
