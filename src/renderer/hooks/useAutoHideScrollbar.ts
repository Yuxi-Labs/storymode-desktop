import { useEffect, useRef } from 'react';

/**
 * useAutoHideScrollbar
 * Attach to a scroll container; it will set style.overflow = 'hidden' when scroll not needed
 * and 'auto' when content exceeds client size. Recomputes on resize + mutation.
 */
export function useAutoHideScrollbar<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      if (!el) return;
      const needsV = el.scrollHeight > el.clientHeight + 1; // small epsilon
      const needsH = el.scrollWidth > el.clientWidth + 1;
      if (!needsV && !needsH) {
        el.style.overflow = 'hidden';
      } else {
        el.style.overflow = 'auto';
      }
    };

    update();
    const resizeObs = new ResizeObserver(update);
    resizeObs.observe(el);
    const mutObs = new MutationObserver(update);
    mutObs.observe(el, { childList: true, subtree: true, characterData: true });
    window.addEventListener('resize', update);
    return () => {
      resizeObs.disconnect();
      mutObs.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return ref;
}

export default useAutoHideScrollbar;