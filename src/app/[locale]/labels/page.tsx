import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { LabelsManager } from "@/features/labels/labels-manager";
import { PageSkeleton } from "@/features/shell/page-skeleton";
import { getLabelUsage, getWorkspaceData } from "@/server/queries";
import { getViewer } from "@/server/session";

export async function generateMetadata({ params }: PageProps<"/[locale]/labels">): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "labels" });
    return { title: t("title") };
}

export default async function LabelsPage({ params }: PageProps<"/[locale]/labels">) {
    const { locale } = await params;
    setRequestLocale(locale);
    return (
        <Suspense fallback={<PageSkeleton />}>
            <LabelsContent />
        </Suspense>
    );
}

async function LabelsContent() {
    const viewer = await getViewer();
    const data = await getWorkspaceData(viewer.workspaceId, viewer.memberId);
    const usage = await getLabelUsage(
        viewer.workspaceId,
        data.teams.map((team) => team.id),
    );
    return <LabelsManager labels={data.labels} usage={usage} />;
}
