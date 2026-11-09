"use client";

import { Menu02, SearchLg } from "@untitledui/icons";
import { useTranslations } from "next-intl";
import { type ReactNode, Suspense, useState } from "react";
import { Button as AriaButton, Modal as AriaModal, ModalOverlay as AriaModalOverlay, Dialog as AriaDialog } from "react-aria-components";
import { CloseButton } from "@/components/base/buttons/close-button";
import { CreateIssueDialog } from "@/features/issues/create-issue-dialog";
import { CommandPalette } from "@/features/palette/command-palette";
import { ShortcutsDialog } from "@/features/shortcuts/shortcuts-dialog";
import { useGlobalShortcuts } from "@/features/shortcuts/use-global-shortcuts";
import { ToastRegion } from "@/features/toast/toast-region";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { SidebarContent } from "./sidebar";

const iconButton =
    "flex size-10 cursor-pointer items-center justify-center rounded-lg text-fg-secondary outline-focus-ring hover:bg-primary_hover focus-visible:outline-2";

/** Client side frame: sidebar, mobile header, global dialogs and shortcuts. */
export function WorkspaceChrome({ children }: { children: ReactNode }) {
    const t = useTranslations();
    const { openPalette } = useWorkspace();
    const [menuOpen, setMenuOpen] = useState(false);
    useGlobalShortcuts();

    function handleOpenMenu() {
        setMenuOpen(true);
    }

    function handleCloseMenu() {
        setMenuOpen(false);
    }

    function handleSearch() {
        openPalette();
    }

    return (
        <div className="flex min-h-dvh bg-primary">
            <nav
                aria-label={t("nav.main")}
                className="sticky top-0 hidden h-dvh w-64 shrink-0 overflow-y-auto border-r border-secondary bg-primary lg:block"
            >
                <Suspense>
                    <SidebarContent />
                </Suspense>
            </nav>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-secondary bg-primary px-2 py-1 lg:hidden">
                    <AriaButton aria-label={t("nav.openMenu")} className={iconButton} onPress={handleOpenMenu}>
                        <Menu02 aria-hidden="true" className="size-5" />
                    </AriaButton>
                    <span className="flex-1 text-md font-semibold text-primary">{t("common.appName")}</span>
                    <AriaButton aria-label={t("nav.search")} className={iconButton} onPress={handleSearch}>
                        <SearchLg aria-hidden="true" className="size-5" />
                    </AriaButton>
                </header>

                <main id="main" tabIndex={-1} className="min-w-0 flex-1 outline-hidden">
                    {children}
                </main>
            </div>

            <AriaModalOverlay
                isOpen={menuOpen}
                onOpenChange={setMenuOpen}
                isDismissable
                className="fixed inset-0 z-50 bg-overlay/70 lg:hidden"
            >
                <AriaModal className="h-dvh w-72 max-w-[85vw] overflow-y-auto bg-primary shadow-xl outline-hidden">
                    <AriaDialog aria-label={t("nav.main")} className="relative h-full outline-hidden">
                        <CloseButton
                            size="sm"
                            label={t("nav.closeMenu")}
                            onPress={handleCloseMenu}
                            className="absolute top-3 right-3 z-10"
                        />
                        <nav aria-label={t("nav.main")} className="h-full">
                            <Suspense>
                                <SidebarContent onNavigate={handleCloseMenu} />
                            </Suspense>
                        </nav>
                    </AriaDialog>
                </AriaModal>
            </AriaModalOverlay>

            <CommandPalette />
            <CreateIssueDialog />
            <ShortcutsDialog />
            <ToastRegion />
        </div>
    );
}
