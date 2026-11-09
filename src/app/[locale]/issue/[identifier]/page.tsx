import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { IssueDetailView } from "@/features/issue-detail/issue-detail-view";
import { PageSkeleton } from "@/features/shell/page-skeleton";
import { parseIdentifier } from "@/lib/domain";
import { getIssueDetail, getWorkspaceData } from "@/server/queries";
import { getViewer } from "@/server/session";

export async function generateMetadata({ params }: PageProps<"/[locale]/issue/[identifier]">): Promise<Metadata> {
    const { identifier } = await params;
    return { title: decodeURIComponent(identifier).toUpperCase() };
}

export default function IssuePage({ params }: PageProps<"/[locale]/issue/[identifier]">) {
    // The identifier is only known at request time, so params are read inside the Suspense boundary.
    return (
        <Suspense fallback={<PageSkeleton />}>
            <IssueContent params={params} />
        </Suspense>
    );
}

async function IssueContent({ params }: { params: PageProps<"/[locale]/issue/[identifier]">["params"] }) {
    const { locale, identifier } = await params;
    setRequestLocale(locale);
    const parsed = parseIdentifier(decodeURIComponent(identifier));
    if (!parsed) notFound();
    const viewer = await getViewer();
    const data = await getWorkspaceData(viewer.workspaceId, viewer.memberId);
    const team = data.teams.find((item) => item.key === parsed.teamKey);
    if (!team) notFound();
    const detail = await getIssueDetail(team.id, parsed.number);
    if (!detail) notFound();
    return <IssueDetailView detail={detail} teamKey={team.key} />;
}
