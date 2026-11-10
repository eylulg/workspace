"use client";

import { Badge } from "@eylulg/ui/badge";
import { Card, CardBody, CardFooter, CardHeader } from "@eylulg/ui/card";
import { PageHeader } from "@eylulg/ui/page-header";
import { ProgressBar } from "@eylulg/ui/progress-bar";
import { ArrowRight } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
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

const STATE_COLOR = { planned: "gray", in_progress: "brand", completed: "success" } as const;

export function ProjectsView({ projects }: { projects: ProjectProgress[] }) {
    const t = useTranslations();
    const format = useFormatter();
    const { data } = useWorkspace();

    return (
        <div className="flex flex-col gap-6">
            <PageHeader headingLevel={1} title={t("projects.title")} description={t("projects.subtitle")} />
            <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {projects.map((project) => {
                    const lead = data.members.find((member) => member.id === project.leadId);
                    const team = data.teams.find((item) => item.id === project.teamId);
                    const percent = format.number(project.percent / 100, { style: "percent" });
                    return (
                        <li key={project.id}>
                            <Card className="h-full">
                                <CardHeader
                                    headingLevel={2}
                                    title={project.name}
                                    description={team?.name}
                                    actions={
                                        <Badge dot size="sm" color={STATE_COLOR[project.state]}>
                                            {t(`projectState.${project.state}`)}
                                        </Badge>
                                    }
                                />
                                <CardBody className="flex flex-1 flex-col gap-4">
                                    <p>{project.description}</p>
                                    <div className="flex flex-col gap-2">
                                        <ProgressBar
                                            aria-label={t("projects.progressLabel", { project: project.name })}
                                            label={t("projects.progress", { done: project.done, total: project.total })}
                                            value={project.percent}
                                            valueLabel={percent}
                                        />
                                        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-tertiary">
                                            {STATUSES.filter((status) => project.counts[status] > 0).map((status) => (
                                                <li key={status} className="inline-flex items-center gap-1">
                                                    <StatusIcon status={status} className="size-3.5" />
                                                    {t(`status.${status}`)} {format.number(project.counts[status])}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-subtle pt-4">
                                        <div>
                                            <dt className="text-xs text-tertiary">{t("projects.lead")}</dt>
                                            <dd className="mt-1 flex items-center gap-2 text-secondary">
                                                <MemberAvatar member={lead} />
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
                                </CardBody>
                                <CardFooter className="justify-start">
                                    <Link
                                        href={`/issues?project=${project.id}`}
                                        className="inline-flex items-center gap-1 rounded-sm text-sm font-semibold text-brand outline-focus hover:underline focus-visible:outline-2"
                                    >
                                        {t("projects.viewIssues", { project: project.name })}
                                        <ArrowRight aria-hidden="true" className="size-4" />
                                    </Link>
                                </CardFooter>
                            </Card>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
