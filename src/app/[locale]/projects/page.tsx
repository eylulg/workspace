import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { ProjectsView, type ProjectProgress } from "@/features/projects/projects-view";
import { PageSkeleton } from "@/features/shell/page-skeleton";
import { STATUSES } from "@/lib/domain";
import { getWorkspaceData, getWorkspaceIssues } from "@/server/queries";
import { getViewer } from "@/server/session";

export async function generateMetadata({ params }: PageProps<"/[locale]/projects">): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "projects" });
    return { title: t("title") };
}

export default async function ProjectsPage({ params }: PageProps<"/[locale]/projects">) {
    const { locale } = await params;
    setRequestLocale(locale);
    return (
        <Suspense fallback={<PageSkeleton />}>
            <ProjectsContent />
        </Suspense>
    );
}

async function ProjectsContent() {
    const viewer = await getViewer();
    const data = await getWorkspaceData(viewer.workspaceId, viewer.memberId);
    const issues = await getWorkspaceIssues(data);
    const projects: ProjectProgress[] = data.projects.map((project) => {
        const own = issues.filter((issue) => issue.projectId === project.id);
        const counts = Object.fromEntries(
            STATUSES.map((status) => [status, own.filter((issue) => issue.status === status).length]),
        ) as ProjectProgress["counts"];
        // Canceled issues do not count towards progress, like in Linear.
        const scope = own.length - counts.canceled;
        return { ...project, counts, total: own.length, done: counts.done, percent: scope ? Math.round((counts.done / scope) * 100) : 0 };
    });
    return <ProjectsView projects={projects} />;
}
