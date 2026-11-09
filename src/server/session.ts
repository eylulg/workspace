import "server-only";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { getDb } from "./db/client";
import { members, workspaces } from "./db/schema";
import { DEMO_GUEST_EMAIL, DEMO_WORKSPACE } from "./db/seed-data";
import { SESSION_COOKIE } from "./session-cookie";

export interface Viewer {
    /** Random id from the guest cookie. Stable per browser. */
    sessionId: string;
    workspaceId: string;
    /** The member that this visitor acts as. */
    memberId: string;
}

/**
 * The single place that decides who is making a request.
 * Today every visitor is the guest member of the shared demo workspace.
 * To add Auth.js later, read `auth()` here and map the signed in user to their member row;
 * pages and actions only ever call `getViewer()` and do not change.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
    const store = await cookies();
    const sessionId = store.get(SESSION_COOKIE)?.value ?? "anonymous";
    // Database drivers read the clock, which Cache Components only allows at request time, not in a prefetch prerender.
    await connection();
    const db = await getDb();
    const [row] = await db
        .select({ workspaceId: workspaces.id, memberId: members.id })
        .from(workspaces)
        .innerJoin(members, and(eq(members.workspaceId, workspaces.id), eq(members.email, DEMO_GUEST_EMAIL)))
        .where(eq(workspaces.slug, DEMO_WORKSPACE.slug));
    if (!row) throw new Error("The demo workspace is missing. Run `npm run db:migrate && npm run db:seed`.");
    return { sessionId, ...row };
});
