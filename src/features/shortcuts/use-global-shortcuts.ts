"use client";

import { useEffect } from "react";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { useRouter } from "@/i18n/navigation";
import { SHORTCUT_EVENT, isTypingTarget } from "@/lib/shortcuts";

const SEQUENCE_TIMEOUT = 1200;

/** Moves focus between issue rows or cards, like j and k in Linear. */
function moveFocus(direction: 1 | -1) {
    const links = [...document.querySelectorAll<HTMLElement>("[data-issue-link]")];
    if (!links.length) return;
    const current = links.findIndex(
        (link) => link === document.activeElement || link.closest("[data-issue-row]")?.contains(document.activeElement),
    );
    const next = current === -1 ? (direction === 1 ? 0 : links.length - 1) : Math.min(links.length - 1, Math.max(0, current + direction));
    links[next]?.focus();
    links[next]?.scrollIntoView({ block: "nearest" });
}

/** Global keyboard shortcuts. The list lives in lib/shortcuts.ts and is shown by the ? dialog. */
export function useGlobalShortcuts() {
    const router = useRouter();
    const { palette, openPalette, closePalette, setCreateOpen, setHelpOpen, activeIssue } = useWorkspace();

    useEffect(() => {
        let pending: string | null = null;
        let timer: number | undefined;

        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                if (palette.open) closePalette();
                else openPalette();
                return;
            }
            if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
            if (isTypingTarget(event.target)) return;
            const key = event.key.toLowerCase();

            if (pending === "g") {
                pending = null;
                window.clearTimeout(timer);
                const destination = { i: "/issues", p: "/projects", l: "/labels" }[key];
                if (destination) {
                    event.preventDefault();
                    router.push(destination);
                }
                return;
            }

            const actions: Record<string, () => void> = {
                g: () => {
                    pending = "g";
                    timer = window.setTimeout(() => (pending = null), SEQUENCE_TIMEOUT);
                },
                c: () => setCreateOpen(true),
                "?": () => setHelpOpen(true),
                "/": () => document.getElementById("issue-search")?.focus(),
                v: () => window.dispatchEvent(new CustomEvent(SHORTCUT_EVENT, { detail: "toggleView" })),
                j: () => moveFocus(1),
                k: () => moveFocus(-1),
                s: () => activeIssue && openPalette("status"),
                p: () => activeIssue && openPalette("priority"),
                a: () => activeIssue && openPalette("assignee"),
            };
            const action = actions[event.key === "?" ? "?" : key];
            if (action) {
                event.preventDefault();
                action();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.clearTimeout(timer);
        };
    }, [router, palette.open, openPalette, closePalette, setCreateOpen, setHelpOpen, activeIssue]);
}
