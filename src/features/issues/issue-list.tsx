"use client";

import { Badge } from "@eylulg/ui/badge";
import { Cell, Column, Row, Table, TableBody, TableHeader } from "@eylulg/ui/table";
import { useTranslations } from "next-intl";
import type { FocusEvent, PointerEvent, ReactNode } from "react";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { Link } from "@/i18n/navigation";
import { type IssueSummary, PRIORITIES, type Priority, STATUSES, type Status } from "@/lib/domain";
import type { Grouping, IssueGroup } from "@/lib/issue-query";
import type { IssuePatch } from "@/lib/optimistic";
import { DueDate } from "./due-date";
import { LabelDot, PriorityIcon, StatusIcon } from "./issue-icons";
import { MemberAvatar } from "./member-avatar";
import { AssigneeMenu, PriorityMenu, StatusMenu } from "./property-menus";

// Phone rows give the space to the title: tight cell padding and a title that wraps onto a second line.
const TIGHT = "px-1! sm:px-cell-x!";
const TITLE_CELL = "w-full max-w-0 px-1! sm:px-cell-x!";

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
        icon = <MemberAvatar member={member} />;
        label = member?.name ?? t("issue.unassigned");
    }
    return (
        <h2 id={id} className="flex items-center gap-2 pb-2 text-sm font-semibold text-primary">
            {icon}
            {label}
            <span className="font-normal text-tertiary">{count}</span>
        </h2>
    );
}

function IssueRow({ issue, onUpdate }: { issue: IssueSummary; onUpdate: ListProps["onUpdate"] }) {
    const { data } = useWorkspace();
    const labels = data.labels.filter((label) => issue.labelIds.includes(label.id));

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
        <Row id={issue.id} data-issue-row data-issue-id={issue.id}>
            <Cell className={TIGHT}>
                <PriorityMenu compact value={issue.priority} onChange={handlePriority} />
            </Cell>
            <Cell className="hidden whitespace-nowrap text-tertiary tabular-nums sm:table-cell">{issue.identifier}</Cell>
            <Cell className={TIGHT}>
                <StatusMenu compact value={issue.status} onChange={handleStatus} />
            </Cell>
            <Cell className={TITLE_CELL}>
                <Link
                    href={`/issue/${issue.identifier}`}
                    prefetch={false}
                    data-issue-link
                    className="line-clamp-2 rounded-sm font-medium wrap-anywhere text-primary outline-focus hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 sm:line-clamp-none sm:block sm:truncate"
                >
                    <span className="sr-only sm:hidden">{issue.identifier} </span>
                    {issue.title}
                </Link>
            </Cell>
            <Cell className="hidden md:table-cell">
                {labels.length > 0 && (
                    <span className="flex items-center gap-1.5">
                        {labels.map((label) => (
                            <Badge key={label.id} size="sm">
                                <LabelDot color={label.color} />
                                {label.name}
                            </Badge>
                        ))}
                    </span>
                )}
            </Cell>
            <Cell className="hidden sm:table-cell">
                <DueDate dueDate={issue.dueDate} status={issue.status} />
            </Cell>
            <Cell className={TIGHT}>
                <AssigneeMenu compact value={issue.assigneeId} onChange={handleAssignee} />
            </Cell>
        </Row>
    );
}

export function IssueList({ groups, grouping, onUpdate }: ListProps) {
    const t = useTranslations();
    const { setActiveIssue } = useWorkspace();
    const issuesById = new Map(groups.flatMap((group) => group.issues).map((issue) => [issue.id, issue]));

    // One handler for every row: the row under the pointer or holding focus is the one s, p and a act on.
    function activate(target: EventTarget) {
        if (!(target instanceof Element)) return;
        const id = target.closest<HTMLElement>("[data-issue-id]")?.dataset.issueId;
        const issue = id ? issuesById.get(id) : undefined;
        if (issue) setActiveIssue(issue);
    }

    function handleFocus(event: FocusEvent) {
        activate(event.target);
    }

    function handlePointerOver(event: PointerEvent) {
        activate(event.target);
    }

    return (
        // Focus and pointer events from the rows bubble here, so one handler covers every row.
        <div className="flex flex-col gap-6" onFocusCapture={handleFocus} onPointerOver={handlePointerOver}>
            {groups.map((group) => {
                const headingId = `group-${group.key}`;
                return (
                    <section key={group.key} aria-labelledby={grouping === "none" ? undefined : headingId}>
                        <GroupHeading grouping={grouping} groupKey={group.key} count={group.issues.length} id={headingId} />
                        <Table
                            aria-label={grouping === "none" ? t("issues.title") : undefined}
                            aria-labelledby={grouping === "none" ? undefined : headingId}
                        >
                            <TableHeader>
                                <Column>{t("issue.priority")}</Column>
                                <Column className="hidden sm:table-cell">{t("issues.identifier")}</Column>
                                <Column>{t("issue.status")}</Column>
                                <Column isRowHeader>{t("issue.titleLabel")}</Column>
                                <Column className="hidden md:table-cell">{t("issue.labels")}</Column>
                                <Column className="hidden sm:table-cell">{t("issue.dueDate")}</Column>
                                <Column>{t("issue.assignee")}</Column>
                            </TableHeader>
                            <TableBody items={group.issues}>
                                {(issue) => <IssueRow key={issue.id} issue={issue} onUpdate={onUpdate} />}
                            </TableBody>
                        </Table>
                    </section>
                );
            })}
        </div>
    );
}
