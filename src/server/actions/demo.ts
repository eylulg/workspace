"use server";

import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { type ActionResult, ok } from "@/lib/action-result";
import { teamTag, workspaceTag } from "../cache-tags";
import { getDb } from "../db/client";
import { teams } from "../db/schema";
import { resetDemoWorkspace } from "../reset-demo";
import { getViewer } from "../session";

/** Lets a visitor put the shared demo back to its starting state without waiting for the nightly reset. */
export async function resetDemo(): Promise<ActionResult<{ issueCount: number }>> {
    const viewer = await getViewer();
    const db = await getDb();
    const oldTeams = await db.select({ id: teams.id }).from(teams).where(eq(teams.workspaceId, viewer.workspaceId));
    const result = await resetDemoWorkspace();
    updateTag(workspaceTag(viewer.workspaceId));
    for (const team of oldTeams) updateTag(teamTag(team.id));
    return ok({ issueCount: result.issueCount });
}
