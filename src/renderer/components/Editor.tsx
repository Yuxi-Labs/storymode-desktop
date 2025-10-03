import React, { useEffect, useRef, useState } from 'react';
import { useStore, selectFile, type StoreState } from '../store/store.js';

// Lazy load monaco only in browser runtime
let monacoPromise: Promise<typeof import('monaco-editor')> | null = null;
function getMonaco() {
  if (!monacoPromise) {
    monacoPromise = import('monaco-editor');
  }
  return monacoPromise;
}

export const Editor: React.FC = () => {
  const file = useStore(selectFile);
  const updateContent = useStore((s: StoreState) => s.updateContent);
  const setCaret = useStore((s: StoreState) => (s as any).setCaret);
  const updateDerivedFileStats = useStore((s: StoreState) => (s as any).updateDerivedFileStats);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<any>(null);
  const glyphDecosRef = useRef<string[]>([]);
  const glyphSchedule = useRef<number | null>(null);

  function applyGlyphDecorations(monaco: any) {
    if (!editorRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;
    const lines = model.getLineCount();
    const newDecos: any[] = [];
    // Glyph decoration disabled for core directives (::story:, ::narrative:, ::scene:, ::end:) and metadata lines.
    // These symbols are now plain text; previous glyphs (✤, ⧉, §, ◈) intentionally freed for future reuse.
    const glyphMap: Array<{ re: RegExp; glyph: string; cls: string }> = [];
    // Decoration loop no-op because glyphMap is empty (retained structure for potential future glyph features).
    if (glyphMap.length) {
      for (let i = 1; i <= lines; i++) {
        const text = model.getLineContent(i);
        for (const m of glyphMap) {
          if (m.re.test(text)) {
            newDecos.push({
              range: new monaco.Range(i, 1, i, 1),
              options: {
                isWholeLine: false,
                beforeContentClassName: `sm-glyph ${m.cls}`,
              },
            });
            break;
          }
        }
      }
    }
    glyphDecosRef.current = editorRef.current.deltaDecorations(glyphDecosRef.current, newDecos);
  }

  useEffect(() => {
    let disposed = false;
    if (!containerRef.current) return;
    let cancel = false;
    getMonaco().then(monaco => {
      if (cancel) return;
      if (disposed) return;
      editorRef.current = monaco.editor.create(containerRef.current!, {
        value: file.content,
        language: 'storymode',
        theme: 'storymode-dark',
        automaticLayout: true,
        minimap: { enabled: false }
      });
      editorRef.current.onDidChangeModelContent(() => {
        const val = editorRef.current.getValue();
        updateContent(val);
        updateDerivedFileStats();
        if (glyphSchedule.current) cancelAnimationFrame(glyphSchedule.current);
        glyphSchedule.current = requestAnimationFrame(() => applyGlyphDecorations(monaco));
      });
      editorRef.current.onDidChangeCursorPosition((e: any) => {
        setCaret(e.position.lineNumber, e.position.column);
      });
      applyGlyphDecorations(monaco);
    });
    return () => { cancel = true; if (editorRef.current) editorRef.current.dispose(); disposed = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update model value if external change (e.g., file open) replaced content
  useEffect(() => {
    if (editorRef.current) {
      const current = editorRef.current.getValue();
      if (current !== file.content) editorRef.current.setValue(file.content);
    }
  }, [file.content]);

  // Navigation listener
  const [decorations, setDecorations] = useState<string[]>([]);
  useEffect(() => {
    function handler(e: Event) {
      const ce = e as CustomEvent<any>;
      const detail = ce.detail;
      if (!editorRef.current || !detail) return;
      getMonaco().then(monaco => {
        editorRef.current.setPosition({ lineNumber: detail.line, column: detail.column });
        editorRef.current.revealLineInCenter(detail.line);
        if (detail.range) {
          const range = new monaco.Range(
            detail.range.startLine,
            detail.range.startColumn,
            detail.range.endLine,
            detail.range.endColumn
          );
          const newDecos = editorRef.current.deltaDecorations(decorations, [{
            range,
            options: { className: 'diag-highlight', inlineClassName: 'diag-highlight-inline' }
          }]);
          setDecorations(newDecos);
          setTimeout(() => {
            if (editorRef.current) {
              editorRef.current.deltaDecorations(newDecos, []);
            }
          }, 1600);
        }
      });
    }
    window.addEventListener('reveal-position', handler as any);
    return () => window.removeEventListener('reveal-position', handler as any);
  }, [decorations]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', border: '1px solid var(--editor-border)' }} />;
};
