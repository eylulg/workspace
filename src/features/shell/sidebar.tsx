"use client";

import { Button } from "@eylulg/ui/button";
import { SidebarNav, type SidebarNavSection } from "@eylulg/ui/chrome";
import { IconButton } from "@eylulg/ui/icon-button";
import { useToast } from "@eylulg/ui/toast";
import { Bookmark, Columns3, Folder, Hash, Keyboard, List, RefreshCcw, Tag, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";
import { useContext, useTransition } from "react";
import { OverlayTriggerStateContext } from "react-aria-components";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { Link, usePathname } from "@/i18n/navigation";
import { deleteView } from "@/server/actions/views";
import { LanguageSwitcher } from "./language-switcher";
import { useResetDemo } from "./use-reset-demo";

/** Inside the mobile drawer a followed link closes the drawer; in the desktop sidebar there is no overlay to close. */
function NavLink({ onClick, ...props }: ComponentProps<typeof Link>) {
    const overlay = useContext(OverlayTriggerStateContext);

    function handleClick(event: Parameters<NonNullable<typeof onClick>>[0]) {
        onClick?.(event);
        overlay?.close();
    }

    return <Link {...props} onClick={handleClick} />;
}

/** Sections, links and the demo controls below them. Rendered in the sidebar and in the mobile menu. */
export function Sidebar() {
    const t = useTranslations();
    const pathname = usePathname();
    const params = useSearchParams();
    const { data, setHelpOpen } = useWorkspace();
    const resetDemo = useResetDemo();
    const { toast } = useToast();
    const [, startTransition] = useTransition();
    const query = params.toString();

    function isCurrent(href: string) {
        const [path, search = ""] = href.split("?");
        if (path !== pathname) return false;
        if (path !== "/issues") return true;
        if (search === "view=board") return params.get("view") === "board";
        return search === query || (!search && !query.includes("="));
    }

    function deleteSavedView(view: { id: string; name: string }) {
        return () => {
            startTransition(async () => {
                const result = await deleteView({ id: view.id }).catch(() => null);
                toast(
                    !result
                        ? { title: t("errors.unknown"), variant: "error" }
                        : result.ok
                          ? { title: t("views.deleted", { name: view.name }), variant: "success" }
                          : { title: t(`errors.${result.error}`), variant: "error" },
                );
            });
        };
    }

    function handleHelp() {
        setHelpOpen(true);
    }

    const sections: SidebarNavSection[] = [
        {
            id: "main",
            items: [
                { href: "/issues", label: t("nav.issues"), icon: <List aria-hidden="true" /> },
                { href: "/issues?view=board", label: t("issues.board"), icon: <Columns3 aria-hidden="true" /> },
                { href: "/projects", label: t("nav.projects"), icon: <Folder aria-hidden="true" /> },
                { href: "/labels", label: t("nav.labels"), icon: <Tag aria-hidden="true" /> },
            ],
        },
        {
            id: "teams",
            title: t("nav.teams"),
            items: data.teams.map((team) => ({
                href: `/issues?team=${team.key}`,
                label: team.name,
                icon: <Hash aria-hidden="true" />,
            })),
        },
        ...(data.savedViews.length > 0
            ? [
                  {
                      id: "views",
                      title: t("nav.savedViews"),
                      items: data.savedViews.map((view) => ({
                          href: `/issues?${view.query}`,
                          label: view.name,
                          icon: <Bookmark aria-hidden="true" />,
                          action: (
                              <IconButton
                                  icon={Trash2}
                                  variant="tertiary"
                                  size="sm"
                                  aria-label={t("views.delete", { name: view.name })}
                                  onPress={deleteSavedView(view)}
                              />
                          ),
                      })),
                  },
              ]
            : []),
    ].map((section) => ({ ...section, items: section.items.map((item) => ({ ...item, isCurrent: isCurrent(item.href) })) }));

    return (
        <div className="flex h-full flex-col">
            <SidebarNav sections={sections} LinkComponent={NavLink} aria-label={t("nav.main")} />
            <section aria-label={t("nav.demoControls")} className="mt-auto flex flex-col gap-3 p-3 pt-6">
                <p className="rounded-md border border-subtle bg-secondary px-3 py-2 text-xs text-tertiary">{t("nav.demoNotice")}</p>
                <div className="flex flex-col items-start gap-1">
                    <Button size="sm" variant="tertiary" iconLeading={Keyboard} onPress={handleHelp}>
                        {t("nav.shortcuts")}
                    </Button>
                    <Button size="sm" variant="tertiary" iconLeading={RefreshCcw} onPress={resetDemo}>
                        {t("nav.resetDemo")}
                    </Button>
                </div>
                <LanguageSwitcher />
            </section>
        </div>
    );
}
