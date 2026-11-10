"use client";

import { useLocale } from "next-intl";
import type { ReactNode } from "react";
import { I18nProvider } from "react-aria-components";
import { AnalyticsInit } from "@/features/analytics/analytics-init";
import { RouteProvider } from "./router-provider";
import { Theme } from "./theme";

/** React Aria's own strings (such as the hidden dismiss button) and date formats follow the page locale. */
export function Providers({ children }: { children: ReactNode }) {
    const locale = useLocale();
    return (
        <I18nProvider locale={locale}>
            <RouteProvider>
                <Theme>
                    <AnalyticsInit />
                    {children}
                </Theme>
            </RouteProvider>
        </I18nProvider>
    );
}
