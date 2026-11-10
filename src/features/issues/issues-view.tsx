"use client";

import { Button } from "@eylulg/ui/button";
import { EmptyState } from "@eylulg/ui/empty-state";
import { PageHeader } from "@eylulg/ui/page-header";
import { ListChecks, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useOptimistic, useTransition } from "react";
import { Board } from "@/features/board/board";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { useRouter } from "@/i18n/navigation";
import type { IssueSummary } from "@/lib/domain";
import { CLEARED_FILTERS, type IssueQuery, groupIssues, hasActiveFilters, serializeIssueQuery, sortIssues } from "@/lib/issue-query";
import { applyOptimistic } from "@/lib/optimistic";
import { SHORTCUT_EVENT } from "@/lib/shortcuts";
import { IssueList } from "./issue-list";
import { IssueToolbar } from "./issue-toolbar";
import { useIssueMutations } from "./use-issue-mutations";

interface IssuesViewProps {
    issues: IssueSummary[];
    query: IssueQuery;
}

export function IssuesView({ issues, query }: IssuesViewProps) {
    const t = useTranslations();
    const router = useRouter();
    const { data, registerUpdater, setCreateOpen } = useWorkspace();
    const [optimisticIssues, apply] = useOptimistic(issues, applyOptimistic);
    const mutations = useIssueMutations(apply);
    const [isNavigating, startNavigation] = useTransition();

    const team = data.teams.find((item) => item.key === query.team);
    const groups = groupIssues(
        sortIssues(optimisticIssues, query.sort),
        query.group,
        data.members.map((member) => member.id),
    );
    const filtered = hasActiveFilters(query);
    // Remounting the toolbar on outside navigation (a saved view, clearing filters) resets its search draft,
    // while typing, which only changes q, keeps the field and its focus.
    const toolbarKey = serializeIssueQuery({ ...query, q: "" });

    function handleQueryChange(patch: Partial<IssueQuery>) {
        const search = serializeIssueQuery({ ...query, ...patch });
        startNavigation(() => router.replace(`/issues${search ? `?${search}` : ""}`, { scroll: false }));
    }

    // The palette and the s, p and a shortcuts update issues through this view, so they are optimistic too.
    useEffect(() => {
        registerUpdater(mutations.update);
        return () => registerUpdater(null);
    }, [registerUpdater, mutations.update]);

    useEffect(() => {
        function handleShortcut(event: Event) {
            if (!(event instanceof CustomEvent) || event.detail !== "toggleView") return;
            const search = serializeIssueQuery({ ...query, view: query.view === "list" ? "board" : "list" });
            startNavigation(() => router.replace(`/issues${search ? `?${search}` : ""}`, { scroll: false }));
        }
        window.addEventListener(SHORTCUT_EVENT, handleShortcut);
        return () => window.removeEventListener(SHORTCUT_EVENT, handleShortcut);
    }, [query, router]);

    function handleCreate() {
        setCreateOpen(true);
    }

    function handleClearFilters() {
        handleQueryChange(CLEARED_FILTERS);
    }

    return (
        <div className="flex flex-col gap-4">
            <PageHeader
                headingLevel={1}
                title={team ? t("issues.teamTitle", { team: team.name }) : t("issues.title")}
                description={<span aria-live="polite">{t("issues.count", { count: optimisticIssues.length })}</span>}
                actions={
                    // The top bar has this button from the md breakpoint up.
                    <Button iconLeading={Plus} onPress={handleCreate} className="md:hidden">
                        {t("issues.newIssue")}
                    </Button>
                }
            />

            <IssueToolbar key={toolbarKey} query={query} onChange={handleQueryChange} />

            <div aria-busy={isNavigating} className={isNavigating ? "opacity-70 transition-opacity" : undefined}>
                {optimisticIssues.length === 0 ? (
                    <EmptyState
                        size="sm"
                        icon={ListChecks}
                        title={filtered ? t("issues.emptyFilteredTitle") : t("issues.emptyTitle")}
                        description={filtered ? t("issues.emptyFilteredBody") : t("issues.emptyBody")}
                        primaryAction={
                            filtered ? (
                                <Button variant="secondary" onPress={handleClearFilters}>
                                    {t("issues.clearFilters")}
                                </Button>
                            ) : (
                                <Button iconLeading={Plus} onPress={handleCreate}>
                                    {t("issues.newIssue")}
                                </Button>
                            )
                        }
                    />
                ) : query.view === "board" ? (
                    <Board
                        issues={sortIssues(optimisticIssues, "manual")}
                        statuses={query.status}
                        onMove={mutations.move}
                        onUpdate={mutations.update}
                    />
                ) : (
                    <IssueList groups={groups} grouping={query.group} onUpdate={mutations.update} />
                )}
            </div>
        </div>
    );
}
