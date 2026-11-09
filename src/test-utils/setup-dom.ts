import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, vi } from "vitest";
import * as matchers from "vitest-axe/matchers";
import { router } from "./navigation-mock";

expect.extend(matchers);

// The Next.js app router is the platform boundary for client components.
vi.mock("next/navigation", async () => (await import("./navigation-mock")).nextNavigation);
vi.mock("next/link", async () => (await import("./navigation-mock")).nextLink);

afterEach(() => {
    cleanup();
    router.reset();
});

// jsdom does not implement these browser APIs that React Aria, cmdk and next-themes use.
Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
    }),
});
window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};
Element.prototype.scrollIntoView ??= () => {};
