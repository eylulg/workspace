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

/** Top bar: the product, the create button, search, the project switcher and the theme toggle. */
export function Nav() {
    const t = useTranslations();
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
            actions={
                <>
                    <IconButton icon={Search} variant="tertiary" size="sm" aria-label={t("nav.search")} onPress={handleSearch} />
                    <Button size="sm" iconLeading={Plus} onPress={handleCreate}>
                        {t("issues.newIssue")}
                    </Button>
                    <ProjectSwitcher currentId="workspace" label={t("nav.projectSwitcher")} />
                    <ThemeToggle aria-label={t("nav.theme")} />
                </>
            }
            mobileMenu={
                <Suspense>
                    <Sidebar />
                </Suspense>
            }
        />
    );
}
