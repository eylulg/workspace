import 'server-only';
import { and, eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { cache } from 'react';
import { getDb } from './db/client';
import { members } from './db/schema';
import { DEMO_GUEST_EMAIL } from './db/seed-data';
import { allowWrite } from './rate-limit';
import { SESSION_COOKIE } from './session-cookie';
import { ensureVisitorWorkspace } from './visitor-workspace';

export interface Viewer {
  /** Random id from the guest cookie. Stable per browser. */
  sessionId: string;
  workspaceId: string;
  /** The member that this visitor acts as. */
  memberId: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The single place that decides who is making a request.
 * Every visitor acts as the guest member of a private copy of the demo workspace, keyed by the guest cookie.
 * To add Auth.js later, read `auth()` here and map the signed in user to their member row;
 * pages and actions only ever call `getViewer()` and do not change.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE)?.value;
  const sessionId = cookie && UUID.test(cookie) ? cookie : 'anonymous';
  // Database drivers read the clock, which Cache Components only allows at request time, not in a prefetch prerender.
  await connection();
  const db = await getDb();
  const workspaceId = await ensureVisitorWorkspace(db, sessionId);
  const [member] = await db
    .select({ memberId: members.id })
    .from(members)
    .where(and(eq(members.workspaceId, workspaceId), eq(members.email, DEMO_GUEST_EMAIL)));
  if (!member) throw new Error('The guest member of the visitor workspace is missing.');
  return { sessionId, workspaceId, memberId: member.memberId };
});

/** The viewer for a write, or null when this visitor is writing too fast. */
export async function getWritingViewer(): Promise<Viewer | null> {
  const viewer = await getViewer();
  return allowWrite(viewer.sessionId) ? viewer : null;
}
