"use client";

import type { ReactNode } from "react";
import { CreateIssueDialog } from "@/features/issues/create-issue-dialog";
import { CommandPalette } from "@/features/palette/command-palette";
import { ShortcutsDialog } from "@/features/shortcuts/shortcuts-dialog";
import { useGlobalShortcuts } from "@/features/shortcuts/use-global-shortcuts";

/** Client side layer around the page: global dialogs and keyboard shortcuts. */
export function WorkspaceChrome({ children }: { children: ReactNode }) {
    useGlobalShortcuts();

    return (
        <>
            {children}
            <CommandPalette />
            <CreateIssueDialog />
            <ShortcutsDialog />
        </>
    );
}
