"use server";

import { and, count, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { type ActionResult, fail, fromZodError, ok } from "@/lib/action-result";
import { createLabelSchema, issueIdSchema, updateLabelSchema } from "@/lib/validation";
import { teamTag, workspaceTag } from "../cache-tags";
import { getDb } from "../db/client";
import { single } from "../db/rows";
import { labels, teams } from "../db/schema";
import { getWritingViewer } from "../session";

const MAX_LABELS = 30;

const isUniqueViolation = (error: unknown) => {
    const candidate = error as { code?: string; cause?: { code?: string } };
    return candidate?.code === "23505" || candidate?.cause?.code === "23505";
};

/** Labels show up on issues in every team, so label changes refresh the workspace and all team tags. */
async function refreshWorkspace(workspaceId: string) {
    const db = await getDb();
    const teamRows = await db.select({ id: teams.id }).from(teams).where(eq(teams.workspaceId, workspaceId));
    updateTag(workspaceTag(workspaceId));
    for (const team of teamRows) updateTag(teamTag(team.id));
}

export async function createLabel(input: { name: string; color: string }): Promise<ActionResult<{ id: string }>> {
    const parsed = createLabelSchema.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    const viewer = await getWritingViewer();
    if (!viewer) return fail("rateLimited");
    const db = await getDb();
    const [{ total = 0 } = {}] = await db.select({ total: count() }).from(labels).where(eq(labels.workspaceId, viewer.workspaceId));
    if (total >= MAX_LABELS) return fail("limitReached");
    try {
        const label = single(
            await db
                .insert(labels)
                .values({ workspaceId: viewer.workspaceId, ...parsed.data })
                .returning({ id: labels.id }),
        );
        await refreshWorkspace(viewer.workspaceId);
        return ok({ id: label.id });
    } catch (error) {
        if (isUniqueViolation(error)) return fail("duplicate");
        throw error;
    }
}

export async function updateLabel(input: { id: string; name: string; color: string }): Promise<ActionResult<{ id: string }>> {
    const parsed = updateLabelSchema.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    const { id, ...values } = parsed.data;
    const viewer = await getWritingViewer();
    if (!viewer) return fail("rateLimited");
    const db = await getDb();
    try {
        const updated = await db
            .update(labels)
            .set(values)
            .where(and(eq(labels.id, id), eq(labels.workspaceId, viewer.workspaceId)))
            .returning({ id: labels.id });
        if (!updated.length) return fail("notFound");
        await refreshWorkspace(viewer.workspaceId);
        return ok({ id });
    } catch (error) {
        if (isUniqueViolation(error)) return fail("duplicate");
        throw error;
    }
}

export async function deleteLabel(input: { id: string }): Promise<ActionResult<{ id: string }>> {
    const parsed = issueIdSchema.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    const viewer = await getWritingViewer();
    if (!viewer) return fail("rateLimited");
    const db = await getDb();
    const deleted = await db
        .delete(labels)
        .where(and(eq(labels.id, parsed.data.id), eq(labels.workspaceId, viewer.workspaceId)))
        .returning({ id: labels.id });
    if (!deleted.length) return fail("notFound");
    await refreshWorkspace(viewer.workspaceId);
    return ok({ id: parsed.data.id });
}
