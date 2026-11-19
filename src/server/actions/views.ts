'use server';

import { and, count, eq } from 'drizzle-orm';
import { updateTag } from 'next/cache';
import { type ActionResult, fail, fromZodError, ok } from '@/lib/action-result';
import { serializeIssueQuery, parseIssueQuery } from '@/lib/issue-query';
import { issueIdSchema, savedViewSchema } from '@/lib/validation';
import { workspaceTag } from '../cache-tags';
import { getDb } from '../db/client';
import { single } from '../db/rows';
import { savedViews } from '../db/schema';
import { getWritingViewer } from '../session';

const MAX_VIEWS = 20;

export async function saveView(input: {
  name: string;
  query: string;
}): Promise<ActionResult<{ id: string }>> {
  const parsed = savedViewSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const viewer = await getWritingViewer();
  if (!viewer) return fail('rateLimited');
  const db = await getDb();
  const [{ total = 0 } = {}] = await db
    .select({ total: count() })
    .from(savedViews)
    .where(eq(savedViews.workspaceId, viewer.workspaceId));
  if (total >= MAX_VIEWS) return fail('limitReached');
  // Normalise through the parser so only known filters are stored.
  const query = serializeIssueQuery(parseIssueQuery(new URLSearchParams(parsed.data.query)));
  const view = single(
    await db
      .insert(savedViews)
      .values({ workspaceId: viewer.workspaceId, name: parsed.data.name, query })
      .returning({ id: savedViews.id }),
  );
  updateTag(workspaceTag(viewer.workspaceId));
  return ok({ id: view.id });
}

export async function deleteView(input: { id: string }): Promise<ActionResult<{ id: string }>> {
  const parsed = issueIdSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const viewer = await getWritingViewer();
  if (!viewer) return fail('rateLimited');
  const db = await getDb();
  const deleted = await db
    .delete(savedViews)
    .where(and(eq(savedViews.id, parsed.data.id), eq(savedViews.workspaceId, viewer.workspaceId)))
    .returning({ id: savedViews.id });
  if (!deleted.length) return fail('notFound');
  updateTag(workspaceTag(viewer.workspaceId));
  return ok({ id: parsed.data.id });
}
