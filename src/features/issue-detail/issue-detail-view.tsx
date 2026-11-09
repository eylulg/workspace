"use client";

import { ChevronLeft, Trash01 } from "@untitledui/icons";
import { useFormatter, useTranslations } from "next-intl";
import { type ChangeEvent, type FormEvent, type KeyboardEvent, useEffect, useOptimistic, useState, useTransition } from "react";
import { Button } from "@/components/base/buttons/button";
import { TextArea } from "@/components/base/textarea/textarea";
import { DATE_INPUT_CLASS } from "@/features/issues/create-issue-dialog";
import { MemberAvatar } from "@/features/issues/member-avatar";
import { AssigneeMenu, LabelsMenu, PriorityMenu, ProjectMenu, StatusMenu } from "@/features/issues/property-menus";
import { useIssueMutations } from "@/features/issues/use-issue-mutations";
import { toastStore } from "@/features/toast/toast-store";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { Link, useRouter } from "@/i18n/navigation";
import type { Priority, Status } from "@/lib/domain";
import type { IssuePatch, OptimisticAction } from "@/lib/optimistic";
import { addComment } from "@/server/actions/issues";
import type { IssueDetail } from "@/server/queries";
import { ActivityLine } from "./activity-line";
import { DescriptionEditor } from "./description-editor";
import { Markdown } from "./markdown";

type DetailIssue = IssueDetail["issue"];
type DetailPatch = IssuePatch & { description?: string };

const DATE_TIME = { dateStyle: "medium", timeStyle: "short" } as const;

function reduce(state: DetailIssue, action: OptimisticAction): DetailIssue {
    return action.type === "update" ? { ...state, ...action.patch } : state;
}

export function IssueDetailView({ detail, teamKey }: { detail: IssueDetail; teamKey: string }) {
    const t = useTranslations();
    const format = useFormatter();
    const router = useRouter();
    const { data, setActiveIssue, registerUpdater } = useWorkspace();
    const [issue, apply] = useOptimistic(detail.issue, reduce);
    const mutations = useIssueMutations(apply);

    const timeline = [
        ...detail.activity.map((entry) => ({ type: "activity" as const, at: entry.createdAt, entry })),
        ...detail.comments.map((entry) => ({ type: "comment" as const, at: entry.createdAt, entry })),
    ].sort((a, b) => a.at.localeCompare(b.at));

    // s, p and a and the palette act on this issue while the page is open.
    useEffect(() => {
        setActiveIssue(issue);
    }, [issue, setActiveIssue]);

    useEffect(() => () => setActiveIssue(null), [setActiveIssue]);

    useEffect(() => {
        registerUpdater(mutations.update);
        return () => registerUpdater(null);
    }, [mutations.update, registerUpdater]);

    function update(patch: DetailPatch) {
        mutations.update(issue, patch);
    }
    function handleStatus(status: Status) {
        update({ status });
    }
    function handlePriority(priority: Priority) {
        update({ priority });
    }
    function handleAssignee(assigneeId: string | null) {
        update({ assigneeId });
    }
    function handleProject(projectId: string | null) {
        update({ projectId });
    }
    function handleLabels(labelIds: string[]) {
        update({ labelIds });
    }
    function handleDueDate(event: ChangeEvent<HTMLInputElement>) {
        update({ dueDate: event.target.value || null });
    }
    function handleDescription(description: string) {
        update({ description });
    }
    function handleTitle(title: string) {
        update({ title });
    }
    function handleDelete() {
        mutations.remove(issue, () => router.push(`/issues?team=${teamKey}`));
    }

    return (
        <div className="flex flex-col gap-6 px-4 py-6 sm:px-8 xl:flex-row xl:items-start">
            <article aria-labelledby="issue-title" className="flex min-w-0 flex-1 flex-col gap-6">
                <nav aria-label={t("issue.breadcrumb")}>
                    <Link
                        href={`/issues?team=${teamKey}`}
                        className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-tertiary outline-focus-ring hover:text-secondary focus-visible:outline-2"
                    >
                        <ChevronLeft aria-hidden="true" className="size-4" />
                        {t("issue.backToIssues")}
                    </Link>
                </nav>

                <div className="flex flex-col gap-1">
                    <p className="text-sm text-tertiary tabular-nums">{issue.identifier}</p>
                    <h1 id="issue-title" className="sr-only">
                        {issue.title}
                    </h1>
                    <TitleField key={issue.title} value={issue.title} onSave={handleTitle} />
                </div>

                <DescriptionEditor key={issue.description} value={issue.description} onSave={handleDescription} />

                <section aria-labelledby="activity-heading" className="flex flex-col gap-4 border-t border-secondary pt-6">
                    <h2 id="activity-heading" className="text-sm font-semibold text-primary">
                        {t("issue.activity")}
                    </h2>
                    <ol className="flex flex-col gap-3">
                        {timeline.map((item) =>
                            item.type === "activity" ? (
                                <li key={item.entry.id}>
                                    <ActivityLine entry={item.entry} />
                                </li>
                            ) : (
                                <li key={item.entry.id} className="rounded-xl bg-primary p-4 ring-1 ring-secondary">
                                    <div className="mb-2 flex items-center gap-2 text-sm">
                                        <MemberAvatar member={data.members.find((member) => member.id === item.entry.authorId)} size="xs" />
                                        <span className="font-semibold text-primary">
                                            {data.members.find((member) => member.id === item.entry.authorId)?.name ?? t("issue.someone")}
                                        </span>
                                        <time dateTime={item.at} className="text-tertiary">
                                            {format.dateTime(new Date(item.at), DATE_TIME)}
                                        </time>
                                    </div>
                                    <Markdown>{item.entry.body}</Markdown>
                                </li>
                            ),
                        )}
                    </ol>
                    <CommentForm issueId={issue.id} />
                </section>
            </article>

            <aside
                aria-labelledby="properties-heading"
                className="bg-secondary_subtle flex w-full shrink-0 flex-col gap-4 rounded-xl p-4 ring-1 ring-secondary xl:sticky xl:top-6 xl:w-80"
            >
                <h2 id="properties-heading" className="text-sm font-semibold text-primary">
                    {t("issue.properties")}
                </h2>
                <dl className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 text-sm">
                    <dt className="text-tertiary">{t("issue.status")}</dt>
                    <dd>
                        <StatusMenu value={issue.status} onChange={handleStatus} />
                    </dd>
                    <dt className="text-tertiary">{t("issue.priority")}</dt>
                    <dd>
                        <PriorityMenu value={issue.priority} onChange={handlePriority} />
                    </dd>
                    <dt className="text-tertiary">{t("issue.assignee")}</dt>
                    <dd>
                        <AssigneeMenu value={issue.assigneeId} onChange={handleAssignee} />
                    </dd>
                    <dt className="text-tertiary">{t("issue.project")}</dt>
                    <dd>
                        <ProjectMenu teamId={issue.teamId} value={issue.projectId} onChange={handleProject} />
                    </dd>
                    <dt className="text-tertiary">{t("issue.labels")}</dt>
                    <dd>
                        <LabelsMenu value={issue.labelIds} onChange={handleLabels} />
                    </dd>
                    <dt className="text-tertiary">
                        <label htmlFor="issue-due-date">{t("issue.dueDate")}</label>
                    </dt>
                    <dd>
                        <input
                            id="issue-due-date"
                            type="date"
                            value={issue.dueDate ?? ""}
                            onChange={handleDueDate}
                            className={DATE_INPUT_CLASS}
                        />
                    </dd>
                    <dt className="text-tertiary">{t("issue.created")}</dt>
                    <dd className="text-secondary">
                        <time dateTime={issue.createdAt}>{format.dateTime(new Date(issue.createdAt), { dateStyle: "medium" })}</time>
                    </dd>
                    <dt className="text-tertiary">{t("issue.updated")}</dt>
                    <dd className="text-secondary">
                        <time dateTime={issue.updatedAt}>{format.dateTime(new Date(issue.updatedAt), DATE_TIME)}</time>
                    </dd>
                </dl>
                <Button color="secondary-destructive" size="sm" iconLeading={Trash01} onClick={handleDelete}>
                    {t("issue.delete")}
                </Button>
            </aside>
        </div>
    );
}

/** Inline title editor. Keyed by the saved title, so it starts from the latest value after every save. */
function TitleField({ value, onSave }: { value: string; onSave: (title: string) => void }) {
    const t = useTranslations("issue");
    const [title, setTitle] = useState(value);

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        setTitle(event.target.value);
    }

    function handleBlur() {
        const next = title.trim();
        if (!next) setTitle(value);
        else if (next !== value) onSave(next);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
            setTitle(value);
            event.currentTarget.blur();
        }
    }

    return (
        <>
            <label htmlFor="issue-title-input" className="sr-only">
                {t("titleLabel")}
            </label>
            <input
                id="issue-title-input"
                value={title}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                maxLength={200}
                className="-mx-2 rounded-md bg-transparent px-2 py-1 text-display-xs font-semibold text-primary outline-focus-ring hover:bg-primary_hover focus-visible:outline-2"
            />
        </>
    );
}

function CommentForm({ issueId }: { issueId: string }) {
    const t = useTranslations();
    const mounted = useIsMounted();
    const [comment, setComment] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function submit() {
        if (!comment.trim()) {
            setError(t("errors.commentRequired"));
            return;
        }
        startTransition(async () => {
            const result = await addComment({ issueId, body: comment });
            if (!mounted.current) return;
            if (!result.ok) {
                setError(t(`errors.${result.error}`));
                return;
            }
            setComment("");
            setError(null);
            toastStore.show({ message: t("issue.commentAdded") });
        });
    }

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        submit();
    }

    function handleChange(value: string) {
        setComment(value);
        setError(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return;
        event.preventDefault();
        submit();
    }

    return (
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <TextArea
                label={t("issue.addComment")}
                placeholder={t("issue.commentPlaceholder")}
                value={comment}
                onChange={handleChange}
                rows={3}
                isInvalid={error !== null}
                hint={error ?? undefined}
                onKeyDown={handleKeyDown}
            />
            <div className="flex justify-end">
                <Button type="submit" size="sm" isLoading={isPending}>
                    {t("issue.comment")}
                </Button>
            </div>
        </form>
    );
}
