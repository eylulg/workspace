"use client";

import { ThemeProvider } from "next-themes";

/** next-themes writes the `dark-mode` class before first paint, so there is no flash on load. */
export function Theme({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider attribute="class" value={{ light: "light-mode", dark: "dark-mode" }} enableSystem disableTransitionOnChange>
            {children}
        </ThemeProvider>
    );
}
