import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { IssuesView } from "@/features/issues/issues-view";
import { PageSkeleton } from "@/features/shell/page-skeleton";
import { filterIssues, parseIssueQuery } from "@/lib/issue-query";
import { getWorkspaceData, getWorkspaceIssues } from "@/server/queries";
import { getViewer } from "@/server/session";

export async function generateMetadata({ params }: PageProps<"/[locale]/issues">): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "issues" });
    return { title: t("title") };
}

export default async function IssuesPage({ params, searchParams }: PageProps<"/[locale]/issues">) {
    const { locale } = await params;
    setRequestLocale(locale);
    return (
        <Suspense fallback={<PageSkeleton />}>
            <IssuesContent searchParams={searchParams} />
        </Suspense>
    );
}

async function IssuesContent({ searchParams }: { searchParams: PageProps<"/[locale]/issues">["searchParams"] }) {
    const query = parseIssueQuery(await searchParams);
    const viewer = await getViewer();
    const data = await getWorkspaceData(viewer.workspaceId, viewer.memberId);
    const issues = filterIssues(await getWorkspaceIssues(data), query, data.teams);
    return <IssuesView issues={issues} query={query} />;
}
