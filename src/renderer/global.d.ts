// Global renderer declarations
import type { ParseResponse, CompileResponse } from "@shared/types";

declare global {
  interface Window {
    storymode: {
      openFileDialog(): Promise<{ canceled: boolean; path?: string }>;
      readFile(
        path: string,
      ): Promise<{ ok: boolean; content?: string; error?: string }>;
      parse(content: string, filename?: string): Promise<ParseResponse>;
      compile(
        input:
          | string
          | {
              content?: string;
              filename?: string;
              ast?: unknown;
              kind?: string;
            },
      ): Promise<CompileResponse>;
      versionInfo(): Promise<{
        coreVersion: string;
        compilerVersion: string;
        appVersion: string;
      }>;
      writeFile(
        path: string,
        content: string,
      ): Promise<{ ok: boolean; error?: string }>;
      saveAsDialog(): Promise<{ canceled: boolean; path?: string }>;
      syncShellState(state: {
        previewVisible?: boolean;
        inspectorVisible?: boolean;
        statusBarVisible?: boolean;
        sidebarCollapsed?: boolean;
        themeMode?: "light" | "dark" | "auto";
        themeId?: string | null;
      }): void;
      explorerContextMenu(payload: { id: string; type: 'story'|'narrative'|'scene'; narrativeId?: string; sceneId?: string; title?: string }): void;
      telemetryEvent?(event: string, props?: Record<string, any>): void;
    };
  }
}
export {};
