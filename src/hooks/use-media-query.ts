import { useSyncExternalStore } from 'react';

/** Reads a media query without a hydration mismatch: the server and the first client render use `fallback`. */
export function useMediaQuery(query: string, fallback: boolean) {
  function subscribe(onChange: () => void) {
    const list = window.matchMedia(query);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }
  function getSnapshot() {
    return window.matchMedia(query).matches;
  }
  function getServerSnapshot() {
    return fallback;
  }
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
