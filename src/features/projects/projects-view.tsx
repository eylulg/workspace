"use client";

import { ArrowRight } from "@untitledui/icons";
import { useFormatter, useTranslations } from "next-intl";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import { StatusIcon } from "@/features/issues/issue-icons";
import { MemberAvatar } from "@/features/issues/member-avatar";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { Link } from "@/i18n/navigation";
import { type ProjectSummary, STATUSES, type Status } from "@/lib/domain";

export interface ProjectProgress extends ProjectSummary {
    counts: Record<Status, number>;
    total: number;
    done: number;
    percent: number;
}

const STATE_COLOR = { planned: "gray", in_progress: "blue", completed: "success" } as const;

export function ProjectsView({ projects }: { projects: ProjectProgress[] }) {
    const t = useTranslations();
    const format = useFormatter();
    const { data } = useWorkspace();

    return (
        <div className="flex flex-col gap-6 px-4 py-6 sm:px-8">
            <div>
                <h1 className="text-display-xs font-semibold text-primary">{t("projects.title")}</h1>
                <p className="mt-1 text-sm text-tertiary">{t("projects.subtitle")}</p>
            </div>
            <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {projects.map((project) => {
                    const lead = data.members.find((member) => member.id === project.leadId);
                    const team = data.teams.find((item) => item.id === project.teamId);
                    const headingId = `project-${project.id}`;
                    return (
                        <li key={project.id}>
                            <article
                                aria-labelledby={headingId}
                                className="flex h-full flex-col gap-4 rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h2 id={headingId} className="text-lg font-semibold text-primary">
                                            {project.name}
                                        </h2>
                                        <p className="text-sm text-tertiary">{team?.name}</p>
                                    </div>
                                    <BadgeWithDot type="pill-color" color={STATE_COLOR[project.state]} size="sm">
                                        {t(`projectState.${project.state}`)}
                                    </BadgeWithDot>
                                </div>
                                <p className="text-sm text-secondary">{project.description}</p>

                                <div className="flex flex-col gap-2">
                                    <div className="flex items-baseline justify-between text-sm">
                                        <span className="font-medium text-secondary">
                                            {t("projects.progress", { done: project.done, total: project.total })}
                                        </span>
                                        <span className="font-semibold text-primary tabular-nums">
                                            {format.number(project.percent / 100, { style: "percent" })}
                                        </span>
                                    </div>
                                    <div
                                        role="progressbar"
                                        aria-label={t("projects.progressLabel", { project: project.name })}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={project.percent}
                                        aria-valuetext={format.number(project.percent / 100, { style: "percent" })}
                                    >
                                        <div aria-hidden="true">
                                            <ProgressBarBase value={project.percent} />
                                        </div>
                                    </div>
                                    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-tertiary">
                                        {STATUSES.filter((status) => project.counts[status] > 0).map((status) => (
                                            <li key={status} className="inline-flex items-center gap-1">
                                                <StatusIcon status={status} className="size-3.5" />
                                                {t(`status.${status}`)} {format.number(project.counts[status])}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-secondary pt-4 text-sm">
                                    <div>
                                        <dt className="text-xs text-tertiary">{t("projects.lead")}</dt>
                                        <dd className="mt-1 flex items-center gap-2 text-secondary">
                                            <MemberAvatar member={lead} size="xs" />
                                            {lead?.name ?? t("issue.unassigned")}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-tertiary">{t("projects.target")}</dt>
                                        <dd className="mt-1 text-secondary">
                                            {project.targetDate
                                                ? format.dateTime(new Date(`${project.targetDate}T12:00:00Z`), { dateStyle: "medium" })
                                                : t("projects.noTarget")}
                                        </dd>
                                    </div>
                                </dl>
                                <Link
                                    href={`/issues?project=${project.id}`}
                                    className="inline-flex items-center gap-1 self-start rounded-sm text-sm font-semibold text-brand-secondary outline-focus-ring hover:underline focus-visible:outline-2"
                                >
                                    {t("projects.viewIssues", { project: project.name })}
                                    <ArrowRight aria-hidden="true" className="size-4" />
                                </Link>
                            </article>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
