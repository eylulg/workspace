import { useEffect, useRef } from 'react';

/**
 * Lets an awaited Server Action result check that its component is still on screen
 * (the dialog is still open) before it writes state.
 */
export function useIsMounted() {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}
