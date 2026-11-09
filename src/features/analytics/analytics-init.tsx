"use client";

import { useEffect } from "react";
import { initAnalytics } from "./analytics";

export function AnalyticsInit() {
    useEffect(() => {
        // Analytics is optional: a blocked or failed script must never surface to the user.
        initAnalytics().catch(() => undefined);
    }, []);
    return null;
}
