import { useEffect, useRef } from "react";
import { useStore, selectFile, type RootState } from "../store/store.js";

export function useDebouncedParse() {
  const file = useStore(selectFile);
  const applyParseResult = useStore((s: RootState) => s.applyParseResult);
  const debounceMs = useStore((s: RootState) => s.ui.parseDebounceMs);
  const requestParse = useStore((s: RootState) => s.requestParse);
  const scheduleParseDebounce = useStore(
    (s: RootState) => s.scheduleParseDebounce,
  );
  const timerRef = useRef<number | null>(null);
  const latestContentRef = useRef(file.content);
  latestContentRef.current = file.content;

  useEffect(() => {
    if (!file.path && !file.content) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    scheduleParseDebounce();
    timerRef.current = window.setTimeout(async () => {
      requestParse();
      try {
        const content = latestContentRef.current ?? "";
        const result = await window.storymode.parse(
          content,
          file.path ?? undefined,
        );
        applyParseResult(result);
      } catch (err: any) {
        applyParseResult({
          ok: false,
          error: err?.message || "IPC parse error",
        });
      }
    }, debounceMs);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [file.content, file.path, debounceMs]);
}
