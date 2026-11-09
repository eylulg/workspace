"use client";

import type { ReactNode } from "react";
import { AnalyticsInit } from "@/features/analytics/analytics-init";
import { RouteProvider } from "./router-provider";
import { Theme } from "./theme";

export const Providers = ({ children }: { children: ReactNode }) => (
    <RouteProvider>
        <Theme>
            <AnalyticsInit />
            {children}
        </Theme>
    </RouteProvider>
);
