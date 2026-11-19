import { startTransition, useEffect, useState } from "react";

/** False on the server and during hydration, true once the page is interactive. The change renders at low priority. */
export function useAfterHydration() {
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => {
        startTransition(() => setHydrated(true));
    }, []);
    return hydrated;
}
