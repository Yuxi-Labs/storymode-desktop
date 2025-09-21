import { useEffect, useRef } from "react";
import {
  useStore,
  selectParse,
  selectCompile,
  type RootState,
} from "../store/store.js";

export function useAutoCompile() {
  const parse = useStore(selectParse);
  const compile = useStore(selectCompile);
  const applyCompileResult = useStore((s: RootState) => s.applyCompileResult);
  const requestCompile = useStore((s: RootState) => s.requestCompile);
  const timerRef = useRef<number | null>(null);
  const lastCompiledParseVersionRef = useRef<number>(-1);

  useEffect(() => {
    if (parse.status !== "ready") return;
    if (parse.version === lastCompiledParseVersionRef.current) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      try {
        if (parse.version === lastCompiledParseVersionRef.current) return;
        requestCompile();
        const state = useStore.getState();
        const { content, path } = state.file;
        const payload = {
          content,
          filename: path ?? undefined,
          ast: state.parse.ast ?? undefined,
          kind: state.parse.fileKind ?? undefined,
        };
        const result = await window.storymode.compile(payload);
        applyCompileResult(result);
        lastCompiledParseVersionRef.current = parse.version;
      } catch (err: any) {
        applyCompileResult({
          ok: false,
          error: err?.message || "Compile IPC error",
        } as any);
      }
    }, 150);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [parse.version, parse.status]);

  return { compileStatus: compile.status };
}
