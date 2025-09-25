// src/lib/useDebouncedCallback.js
import { useRef, useCallback } from "react";

/**
 * useDebouncedCallback(fn, delay)
 * Returns a stable function that waits `delay` ms after the last call
 * before invoking `fn(...args)`.
 */
export function useDebouncedCallback(fn, delay = 500) {
  const timerRef = useRef();

  return useCallback(
    (...args) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        fn(...args);
      }, delay);
    },
    [fn, delay]
  );
}
