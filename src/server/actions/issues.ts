"use server";

import { and, asc, eq, gt, inArray, isNull, min, ne, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { type ActionResult, fail, fromZodError, ok } from "@/lib/action-result";
import { identifierOf } from "@/lib/domain";
import { sortOrderBetween } from "@/lib/issue-query";
import {
    type CreateIssueInput,
    type UpdateIssueInput,
    commentSchema,
    createIssueSchema,
    issueIdSchema,
    moveIssueSchema,
    updateIssueSchema,
} from "@/lib/validation";
import { teamTag } from "../cache-tags";
import { type Database, getDb } from "../db/client";
import { single } from "../db/rows";
import { type ActivityKind, activities, comments, issueLabels, issues, labels, members, projects, teams } from "../db/schema";
import { getViewer } from "../session";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Checks that every referenced member, project and label belongs to the viewer's workspace. */
async function referencesBelongTo(
    tx: Tx,
    workspaceId: string,
    refs: { assigneeId?: string | null; projectId?: string | null; labelIds?: string[] },
): Promise<boolean> {
    if (refs.assigneeId) {
        const found = await tx
            .select({ id: members.id })
            .from(members)
            .where(and(eq(members.id, refs.assigneeId), eq(members.workspaceId, workspaceId)));
        if (!found.length) return false;
    }
    if (refs.projectId) {
        const found = await tx
            .select({ id: projects.id })
            .from(projects)
            .where(and(eq(projects.id, refs.projectId), eq(projects.workspaceId, workspaceId)));
        if (!found.length) return false;
    }
    if (refs.labelIds?.length) {
        const found = await tx
            .select({ id: labels.id })
            .from(labels)
            .where(and(inArray(labels.id, refs.labelIds), eq(labels.workspaceId, workspaceId)));
        if (found.length !== new Set(refs.labelIds).size) return false;
    }
    return true;
}

async function findIssue(db: Database | Tx, workspaceId: string, id: string, options: { includeDeleted?: boolean } = {}) {
    const [row] = await db
        .select()
        .from(issues)
        .where(and(eq(issues.id, id), eq(issues.workspaceId, workspaceId), options.includeDeleted ? undefined : isNull(issues.deletedAt)));
    return row;
}

export async function createIssue(input: CreateIssueInput): Promise<ActionResult<{ id: string; identifier: string }>> {
    const parsed = createIssueSchema.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    const data = parsed.data;
    const viewer = await getViewer();
    const db = await getDb();

    const created = await db.transaction(async (tx) => {
        if (!(await referencesBelongTo(tx, viewer.workspaceId, data))) return null;
        // Bumping the counter in the same statement that reads it keeps numbers unique under concurrent creates.
        const [team] = await tx
            .update(teams)
            .set({ issueCounter: sql`${teams.issueCounter} + 1` })
            .where(and(eq(teams.id, data.teamId), eq(teams.workspaceId, viewer.workspaceId)))
            .returning({ key: teams.key, number: teams.issueCounter });
        if (!team) return null;
        const { top } = single(
            await tx
                .select({ top: min(issues.sortOrder) })
                .from(issues)
                .where(and(eq(issues.teamId, data.teamId), eq(issues.status, data.status), isNull(issues.deletedAt))),
        );
        const issue = single(
            await tx
                .insert(issues)
                .values({
                    workspaceId: viewer.workspaceId,
                    teamId: data.teamId,
                    number: team.number,
                    title: data.title,
                    description: data.description,
                    status: data.status,
                    priority: data.priority,
                    assigneeId: data.assigneeId,
                    projectId: data.projectId,
                    dueDate: data.dueDate,
                    creatorId: viewer.memberId,
                    // New issues go to the top of their column.
                    sortOrder: sortOrderBetween(null, top ?? null),
                })
                .returning({ id: issues.id }),
        );
        if (data.labelIds.length) {
            await tx.insert(issueLabels).values([...new Set(data.labelIds)].map((labelId) => ({ issueId: issue.id, labelId })));
        }
        await tx.insert(activities).values({ issueId: issue.id, actorId: viewer.memberId, kind: "created" });
        return { id: issue.id, identifier: identifierOf(team.key, team.number) };
    });

    if (!created) return fail("notFound");
    updateTag(teamTag(data.teamId));
    return ok(created);
}

const FIELD_ACTIVITY: Record<"status" | "priority" | "assigneeId" | "projectId" | "dueDate" | "title" | "description", ActivityKind> = {
    status: "status",
    priority: "priority",
    assigneeId: "assignee",
    projectId: "project",
    dueDate: "due_date",
    title: "title",
    description: "description",
};

export async function updateIssue(input: UpdateIssueInput): Promise<ActionResult<{ id: string }>> {
    const parsed = updateIssueSchema.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    const { id, patch } = parsed.data;
    const viewer = await getViewer();
    const db = await getDb();

    const result = await db.transaction(async (tx) => {
        const current = await findIssue(tx, viewer.workspaceId, id);
        if (!current) return null;
        if (!(await referencesBelongTo(tx, viewer.workspaceId, patch))) return null;

        const { labelIds, ...columns } = patch;
        const changes: { kind: ActivityKind; fromValue: string | null; toValue: string | null }[] = [];
        for (const field of Object.keys(FIELD_ACTIVITY) as (keyof typeof FIELD_ACTIVITY)[]) {
            if (!(field in columns)) continue;
            const value = columns[field];
            const before = current[field];
            if (before === value) continue;
            // Description edits are logged without their text to keep the activity log short.
            const keepValues = field !== "description";
            changes.push({
                kind: FIELD_ACTIVITY[field],
                fromValue: keepValues && before !== null ? String(before) : null,
                toValue: keepValues && value !== null ? String(value) : null,
            });
        }

        let sortOrder: number | undefined;
        if (columns.status && columns.status !== current.status) {
            // Changing status from a menu puts the issue at the top of its new column.
            const { top } = single(
                await tx
                    .select({ top: min(issues.sortOrder) })
                    .from(issues)
                    .where(and(eq(issues.teamId, current.teamId), eq(issues.status, columns.status), isNull(issues.deletedAt))),
            );
            sortOrder = sortOrderBetween(null, top ?? null);
        }

        if (labelIds) {
            const existing = await tx.select({ labelId: issueLabels.labelId }).from(issueLabels).where(eq(issueLabels.issueId, id));
            const before = existing.map((row) => row.labelId).sort();
            const after = [...new Set(labelIds)].sort();
            if (before.join() !== after.join()) {
                await tx.delete(issueLabels).where(eq(issueLabels.issueId, id));
                if (after.length) await tx.insert(issueLabels).values(after.map((labelId) => ({ issueId: id, labelId })));
                changes.push({ kind: "labels", fromValue: before.join(",") || null, toValue: after.join(",") || null });
            }
        }

        if (!changes.length) return { teamId: current.teamId };
        await tx
            .update(issues)
            .set({ ...columns, ...(sortOrder === undefined ? {} : { sortOrder }), updatedAt: new Date() })
            .where(eq(issues.id, id));
        await tx.insert(activities).values(changes.map((change) => ({ issueId: id, actorId: viewer.memberId, ...change })));
        return { teamId: current.teamId };
    });

    if (!result) return fail("notFound");
    updateTag(teamTag(result.teamId));
    return ok({ id });
}

export async function moveIssue(input: {
    id: string;
    status: string;
    afterId: string | null;
}): Promise<ActionResult<{ sortOrder: number }>> {
    const parsed = moveIssueSchema.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    const { id, status, afterId } = parsed.data;
    const viewer = await getViewer();
    const db = await getDb();

    const result = await db.transaction(async (tx) => {
        const current = await findIssue(tx, viewer.workspaceId, id);
        if (!current) return null;
        const sameColumn = and(eq(issues.teamId, current.teamId), eq(issues.status, status), isNull(issues.deletedAt), ne(issues.id, id));

        let before: number | null = null;
        if (afterId) {
            const [anchor] = await tx
                .select({ sortOrder: issues.sortOrder })
                .from(issues)
                .where(and(eq(issues.id, afterId), sameColumn));
            if (!anchor) return null;
            before = anchor.sortOrder;
        }
        const [next] = await tx
            .select({ sortOrder: issues.sortOrder })
            .from(issues)
            .where(before === null ? sameColumn : and(sameColumn, gt(issues.sortOrder, before)))
            .orderBy(asc(issues.sortOrder))
            .limit(1);
        const sortOrder = sortOrderBetween(before, next?.sortOrder ?? null);

        await tx.update(issues).set({ status, sortOrder, updatedAt: new Date() }).where(eq(issues.id, id));
        if (status !== current.status) {
            await tx
                .insert(activities)
                .values({ issueId: id, actorId: viewer.memberId, kind: "status", fromValue: current.status, toValue: status });
        }
        return { teamId: current.teamId, sortOrder };
    });

    if (!result) return fail("notFound");
    updateTag(teamTag(result.teamId));
    return ok({ sortOrder: result.sortOrder });
}

export async function deleteIssue(input: { id: string }): Promise<ActionResult<{ id: string }>> {
    return setDeleted(input, true);
}

/** Undo for deleteIssue. Deletes are soft, so restoring brings back labels, comments and history. */
export async function restoreIssue(input: { id: string }): Promise<ActionResult<{ id: string }>> {
    return setDeleted(input, false);
}

async function setDeleted(input: { id: string }, deleted: boolean): Promise<ActionResult<{ id: string }>> {
    const parsed = issueIdSchema.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    const viewer = await getViewer();
    const db = await getDb();
    const current = await findIssue(db, viewer.workspaceId, parsed.data.id, { includeDeleted: true });
    if (!current || (current.deletedAt !== null) === deleted) return fail("notFound");
    await db.transaction(async (tx) => {
        await tx
            .update(issues)
            .set({ deletedAt: deleted ? new Date() : null })
            .where(eq(issues.id, current.id));
        await tx.insert(activities).values({ issueId: current.id, actorId: viewer.memberId, kind: deleted ? "deleted" : "restored" });
    });
    updateTag(teamTag(current.teamId));
    return ok({ id: current.id });
}

export async function addComment(input: { issueId: string; body: string }): Promise<ActionResult<{ id: string }>> {
    const parsed = commentSchema.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    const viewer = await getViewer();
    const db = await getDb();
    const current = await findIssue(db, viewer.workspaceId, parsed.data.issueId);
    if (!current) return fail("notFound");
    const comment = single(
        await db
            .insert(comments)
            .values({ issueId: current.id, authorId: viewer.memberId, body: parsed.data.body })
            .returning({ id: comments.id }),
    );
    updateTag(teamTag(current.teamId));
    return ok({ id: comment.id });
}
