import { useEffect, useRef } from 'react';
import { useStore, selectParse, selectCompile, type RootState } from '../store/store.js';

/**
 * Automatically triggers a compile after a successful parse result.
 * Strategy: when parse.version increments and parse.status === 'ready', schedule compile.
 * Debounce logic (simple): wait 150ms after last qualifying parse to avoid thrash for rapid edits.
 */
export function useAutoCompile() {
  const parse = useStore(selectParse);
  const compile = useStore(selectCompile);
  const applyCompileResult = useStore((s: RootState) => s.applyCompileResult);
  const timerRef = useRef<number | null>(null);
  const lastCompiledParseVersionRef = useRef<number>(-1);

  useEffect(() => {
    if (parse.status !== 'ready') return;
    if (parse.version === lastCompiledParseVersionRef.current) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      try {
        // Guard: ensure we still have new parse version
        if (parse.version === lastCompiledParseVersionRef.current) return;
        const content = useStore.getState().file.content;
        const filePath = useStore.getState().file.path ?? undefined;
        const result = await window.storymode.compile(content, filePath);
        applyCompileResult(result);
        lastCompiledParseVersionRef.current = parse.version;
      } catch (err: any) {
        applyCompileResult({ ok: false, error: err?.message || 'Compile IPC error' } as any);
      }
    }, 150);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [parse.version, parse.status]);

  return { compileStatus: compile.status };
}
