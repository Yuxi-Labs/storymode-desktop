// Global renderer declarations
import type { ParseResponse, CompileResponse } from '@shared/types';

declare global {
  // Augment Window with lightly typed API; detailed type not critical yet
  interface Window {
    storymode: {
      openFileDialog(): Promise<{ canceled: boolean; path?: string }>;
      readFile(path: string): Promise<{ ok: boolean; content?: string; error?: string }>;
      parse(content: string, filename?: string): Promise<ParseResponse>;
      compile(content: string, filename?: string): Promise<CompileResponse>;
      versionInfo(): Promise<{ coreVersion: string; compilerVersion: string; appVersion: string }>; 
    };
  }
}
export {};