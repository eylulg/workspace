"use client";

import { Button } from "@eylulg/ui/button";
import { ProjectSwitcher, ThemeToggle, TopNav } from "@eylulg/ui/chrome";
import { IconButton } from "@eylulg/ui/icon-button";
import { Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { Link } from "@/i18n/navigation";
import { Sidebar } from "./sidebar";

/** Top bar: the product, the create button, search, the project switcher and the theme toggle, which stays in the bar at 375px. */
export function Nav() {
    const t = useTranslations();
    const themeLabels = {
        ariaLabel: t("chrome.themeToggle.ariaLabel"),
        light: t("chrome.themeToggle.light"),
        dark: t("chrome.themeToggle.dark"),
        system: t("chrome.themeToggle.system"),
    };
    const { openPalette, setCreateOpen } = useWorkspace();

    function handleCreate() {
        setCreateOpen(true);
    }

    function handleSearch() {
        openPalette();
    }

    return (
        <TopNav
            productName={t("common.appName")}
            homeHref="/issues"
            LinkComponent={Link}
            navLabel={t("nav.main")}
            labels={{ openMenu: t("chrome.topNav.openMenu"), closeMenu: t("chrome.topNav.closeMenu") }}
            actions={
                <>
                    <IconButton icon={Search} variant="tertiary" size="sm" aria-label={t("nav.search")} onPress={handleSearch} />
                    <Button size="sm" iconLeading={Plus} onPress={handleCreate}>
                        {t("issues.newIssue")}
                    </Button>
                    <ProjectSwitcher
                        currentId="workspace"
                        labels={{
                            label: t("chrome.projectSwitcher.label"),
                            heading: t("chrome.projectSwitcher.heading"),
                            youAreHere: t("chrome.projectSwitcher.youAreHere"),
                            sourceCode: t("chrome.projectSwitcher.sourceCode"),
                        }}
                    />
                    <ThemeToggle compact labels={themeLabels} />
                </>
            }
            compactActions={<ThemeToggle compact labels={themeLabels} />}
            mobileMenu={
                <Suspense>
                    <Sidebar />
                </Suspense>
            }
        />
    );
}
