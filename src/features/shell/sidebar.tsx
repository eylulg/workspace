"use client";

import { Bookmark, Folder, Hash01, Keyboard01, List, Plus, RefreshCcw01, SearchLg, Tag01, Trash01 } from "@untitledui/icons";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ReactNode, startTransition } from "react";
import { Button as AriaButton } from "react-aria-components";
import { Button } from "@/components/base/buttons/button";
import { toastStore } from "@/features/toast/toast-store";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { Link, usePathname } from "@/i18n/navigation";
import type { SavedView } from "@/lib/domain";
import { deleteView } from "@/server/actions/views";
import { cx } from "@/utils/cx";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { useResetDemo } from "./use-reset-demo";

function linkClass(active: boolean) {
    return cx(
        "flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-semibold outline-focus-ring transition duration-100 ease-linear focus-visible:outline-2",
        active ? "bg-active text-secondary_hover" : "text-secondary hover:bg-primary_hover hover:text-secondary_hover",
    );
}

const SECTION_HEADING = "px-2.5 pt-5 pb-1 text-xs font-semibold text-quaternary";

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
    const t = useTranslations();
    const pathname = usePathname();
    const params = useSearchParams();
    const { data, openPalette, setCreateOpen, setHelpOpen } = useWorkspace();
    const resetDemo = useResetDemo();
    const query = params.toString();
    const team = params.get("team");

    function isActive(href: string) {
        const [path, search = ""] = href.split("?");
        if (path !== pathname) return false;
        if (path !== "/issues") return true;
        return search === query || (!search && !team && !query.includes("="));
    }

    function handleCreate() {
        setCreateOpen(true);
    }

    function handleSearch() {
        openPalette();
    }

    function handleHelp() {
        setHelpOpen(true);
    }

    return (
        <div className="flex h-full flex-col gap-1 px-3 py-4">
            <div className="flex items-center gap-2 px-2.5 pb-3">
                <span
                    aria-hidden="true"
                    className="flex size-7 items-center justify-center rounded-lg bg-brand-solid text-sm font-bold text-primary_on-brand"
                >
                    W
                </span>
                <span className="text-md font-semibold text-primary">{t("common.appName")}</span>
            </div>

            <div className="flex gap-2 pb-2">
                <Button size="sm" iconLeading={Plus} className="flex-1" onClick={handleCreate}>
                    {t("issues.newIssue")}
                </Button>
                <AriaButton
                    aria-label={t("nav.search")}
                    onPress={handleSearch}
                    className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-fg-quaternary shadow-xs ring-1 ring-primary outline-focus-ring ring-inset hover:bg-primary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                    <SearchLg aria-hidden="true" className="size-4" />
                </AriaButton>
            </div>

            <ul className="flex flex-col gap-0.5">
                <li className="flex">
                    <NavLink href="/issues" icon={List} isActive={isActive("/issues")} onNavigate={onNavigate}>
                        {t("nav.issues")}
                    </NavLink>
                </li>
                <li className="flex">
                    <NavLink href="/projects" icon={Folder} isActive={isActive("/projects")} onNavigate={onNavigate}>
                        {t("nav.projects")}
                    </NavLink>
                </li>
                <li className="flex">
                    <NavLink href="/labels" icon={Tag01} isActive={isActive("/labels")} onNavigate={onNavigate}>
                        {t("nav.labels")}
                    </NavLink>
                </li>
            </ul>

            <h2 className={SECTION_HEADING}>{t("nav.teams")}</h2>
            <ul className="flex flex-col gap-0.5">
                {data.teams.map((item) => (
                    <li key={item.id} className="flex">
                        <NavLink
                            href={`/issues?team=${item.key}`}
                            icon={Hash01}
                            isActive={isActive(`/issues?team=${item.key}`)}
                            onNavigate={onNavigate}
                        >
                            {item.name}
                        </NavLink>
                    </li>
                ))}
            </ul>

            {data.savedViews.length > 0 && (
                <>
                    <h2 className={SECTION_HEADING}>{t("nav.savedViews")}</h2>
                    <ul className="flex flex-col gap-0.5">
                        {data.savedViews.map((view) => (
                            <li key={view.id} className="group flex items-center">
                                <NavLink
                                    href={`/issues?${view.query}`}
                                    icon={Bookmark}
                                    isActive={isActive(`/issues?${view.query}`)}
                                    onNavigate={onNavigate}
                                >
                                    {view.name}
                                </NavLink>
                                <DeleteViewButton view={view} />
                            </li>
                        ))}
                    </ul>
                </>
            )}

            <div className="mt-auto flex flex-col gap-3 pt-6">
                <p className="bg-secondary_subtle rounded-lg px-3 py-2 text-xs text-tertiary ring-1 ring-secondary">
                    {t("nav.demoNotice")}
                </p>
                <div className="flex flex-col items-start gap-1">
                    <Button size="sm" color="tertiary" iconLeading={Keyboard01} onClick={handleHelp}>
                        {t("nav.shortcuts")}
                    </Button>
                    <Button size="sm" color="tertiary" iconLeading={RefreshCcw01} onClick={resetDemo}>
                        {t("nav.resetDemo")}
                    </Button>
                </div>
                <LanguageSwitcher />
                <ThemeToggle />
            </div>
        </div>
    );
}

function DeleteViewButton({ view }: { view: SavedView }) {
    const t = useTranslations();

    function handlePress() {
        startTransition(async () => {
            const result = await deleteView({ id: view.id });
            toastStore.show(
                result.ok ? { message: t("views.deleted", { name: view.name }) } : { message: t(`errors.${result.error}`), tone: "error" },
            );
        });
    }

    return (
        <AriaButton
            aria-label={t("views.delete", { name: view.name })}
            className="ml-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-quaternary opacity-60 outline-focus-ring group-hover:opacity-100 hover:bg-primary_hover hover:text-fg-secondary focus-visible:opacity-100 focus-visible:outline-2"
            onPress={handlePress}
        >
            <Trash01 aria-hidden="true" className="size-3.5" />
        </AriaButton>
    );
}

interface NavLinkProps {
    href: string;
    icon: typeof List;
    isActive: boolean;
    onNavigate?: () => void;
    children: ReactNode;
}

function NavLink({ href, icon: Icon, isActive, onNavigate, children }: NavLinkProps) {
    return (
        <Link href={href} className={linkClass(isActive)} aria-current={isActive ? "page" : undefined} onClick={onNavigate}>
            <Icon aria-hidden="true" className="size-4 shrink-0 text-fg-quaternary" />
            <span className="truncate">{children}</span>
        </Link>
    );
}
