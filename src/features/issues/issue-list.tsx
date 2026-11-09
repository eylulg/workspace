"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { Link } from "@/i18n/navigation";
import { type IssueSummary, PRIORITIES, type Priority, STATUSES, type Status } from "@/lib/domain";
import type { Grouping, IssueGroup } from "@/lib/issue-query";
import type { IssuePatch } from "@/lib/optimistic";
import { DueDate } from "./due-date";
import { LabelDot, PriorityIcon, StatusIcon } from "./issue-icons";
import { MemberAvatar } from "./member-avatar";
import { AssigneeMenu, PriorityMenu, StatusMenu } from "./property-menus";

interface ListProps {
    groups: IssueGroup[];
    grouping: Grouping;
    onUpdate: (issue: IssueSummary, patch: IssuePatch) => void;
}

function GroupHeading({ grouping, groupKey, count, id }: { grouping: Grouping; groupKey: string; count: number; id: string }) {
    const t = useTranslations();
    const { data } = useWorkspace();
    if (grouping === "none") return null;
    const status = STATUSES.find((item) => item === groupKey);
    const priority = PRIORITIES.find((item) => String(item) === groupKey);
    let icon: ReactNode = null;
    let label = "";
    if (grouping === "status" && status) {
        icon = <StatusIcon status={status} />;
        label = t(`status.${status}`);
    } else if (grouping === "priority" && priority !== undefined) {
        icon = <PriorityIcon priority={priority} />;
        label = t(`priority.${priority}`);
    } else {
        const member = data.members.find((item) => item.id === groupKey);
        icon = <MemberAvatar member={member} size="xs" />;
        label = member?.name ?? t("issue.unassigned");
    }
    return (
        <h2
            id={id}
            className="bg-secondary_subtle sticky top-0 z-10 flex items-center gap-2 border-b border-secondary px-4 py-2 text-sm font-semibold text-primary"
        >
            {icon}
            {label}
            <span className="font-normal text-tertiary">{count}</span>
        </h2>
    );
}

function IssueRow({ issue, onUpdate }: { issue: IssueSummary; onUpdate: ListProps["onUpdate"] }) {
    const { data, setActiveIssue } = useWorkspace();
    const labels = data.labels.filter((label) => issue.labelIds.includes(label.id));

    function handleActivate() {
        setActiveIssue(issue);
    }
    function handleStatus(status: Status) {
        onUpdate(issue, { status });
    }
    function handlePriority(priority: Priority) {
        onUpdate(issue, { priority });
    }
    function handleAssignee(assigneeId: string | null) {
        onUpdate(issue, { assigneeId });
    }

    return (
        <li
            data-issue-row
            className="flex items-center gap-1 border-b border-secondary px-2 py-1 transition-colors focus-within:bg-primary_hover hover:bg-primary_hover sm:gap-2 sm:px-4"
            onFocusCapture={handleActivate}
            onPointerEnter={handleActivate}
        >
            <PriorityMenu compact value={issue.priority} onChange={handlePriority} />
            <span className="hidden w-16 shrink-0 text-xs text-tertiary tabular-nums sm:inline">{issue.identifier}</span>
            <StatusMenu compact value={issue.status} onChange={handleStatus} />
            <Link
                href={`/issue/${issue.identifier}`}
                data-issue-link
                className="min-w-0 flex-1 truncate rounded-sm py-1.5 text-sm font-medium text-primary outline-focus-ring hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
                <span className="sr-only sm:hidden">{issue.identifier} </span>
                {issue.title}
            </Link>
            {labels.length > 0 && (
                <span className="hidden items-center gap-1.5 md:flex">
                    {labels.map((label) => (
                        <span
                            key={label.id}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-secondary ring-1 ring-secondary ring-inset"
                        >
                            <LabelDot color={label.color} />
                            {label.name}
                        </span>
                    ))}
                </span>
            )}
            <DueDate dueDate={issue.dueDate} status={issue.status} className="hidden sm:inline-flex" />
            <AssigneeMenu compact value={issue.assigneeId} onChange={handleAssignee} />
        </li>
    );
}

export function IssueList({ groups, grouping, onUpdate }: ListProps) {
    return (
        <div className="overflow-hidden rounded-xl bg-primary ring-1 ring-secondary">
            {groups.map((group) => {
                const headingId = `group-${group.key}`;
                return (
                    <section key={group.key} aria-labelledby={grouping === "none" ? undefined : headingId}>
                        <GroupHeading grouping={grouping} groupKey={group.key} count={group.issues.length} id={headingId} />
                        <ul aria-labelledby={grouping === "none" ? undefined : headingId} className="-mb-px">
                            {group.issues.map((issue) => (
                                <IssueRow key={issue.id} issue={issue} onUpdate={onUpdate} />
                            ))}
                        </ul>
                    </section>
                );
            })}
        </div>
    );
}
