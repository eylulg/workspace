'use server';

import { eq } from 'drizzle-orm';
import { updateTag } from 'next/cache';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import { teamTag, workspaceTag } from '../cache-tags';
import { getDb } from '../db/client';
import { teams } from '../db/schema';
import { getWritingViewer } from '../session';
import { resetVisitorWorkspace } from '../visitor-workspace';

/** Puts the visitor's own copy of the demo back to its starting state. Other visitors are not affected. */
export async function resetDemo(): Promise<ActionResult<{ issueCount: number }>> {
  const viewer = await getWritingViewer();
  if (!viewer) return fail('rateLimited');
  const db = await getDb();
  const oldTeams = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.workspaceId, viewer.workspaceId));
  const result = await resetVisitorWorkspace(db, viewer.sessionId);
  updateTag(workspaceTag(viewer.workspaceId));
  for (const team of oldTeams) updateTag(teamTag(team.id));
  return ok({ issueCount: result.issueCount });
}
