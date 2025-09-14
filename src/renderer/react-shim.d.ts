// Temporary shim to satisfy TS if React types fail to load due to project reference resolution issues.
// Real types are installed (@types/react, @types/react-dom). Remove this once TS server picks them up.
// Minimal surface just for current files.

declare module 'react' {
  export interface FC<P = {}> { (props: P & { children?: any }): any; }
  export type ReactNode = any;
  export function useEffect(...args: any[]): void;
  export function useRef<T = any>(init: T | null): { current: T | null };
  export function useState<S>(init: S): [S, (v: S) => void];
  const React: { createElement: any };
  export default React;
}

declare module 'react-dom/client' {
  export function createRoot(el: Element | null): { render(node: any): void };
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}
