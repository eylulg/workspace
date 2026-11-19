import { startTransition, useEffect, useState } from 'react';

/**
 * A count that starts at `first` and grows by `step` while the returned `sentinelRef` element is near the viewport,
 * until it reaches `total`. The server and the hydrating client both render `first`, so a long list costs nothing
 * until it is scrolled. Each step is a low priority update.
 */
export function useGrowingLimit(total: number, first: number, step: number) {
  const [limit, setLimit] = useState(first);
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!sentinel || limit >= total) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) startTransition(() => setLimit((current) => current + step));
      },
      { rootMargin: '100px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel, limit, total, step]);
  return { limit, sentinelRef: setSentinel };
}
