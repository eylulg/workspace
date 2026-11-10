import { and, eq, lt, like } from "drizzle-orm";
import type { Database } from "./db/client";
import { workspaces } from "./db/schema";
import { seedDemoWorkspace } from "./db/seed";

const PREFIX = "visitor-";

/** A visitor's workspace is a private copy of the demo, thrown away and rebuilt after this long. */
const VISITOR_TTL_MS = 24 * 60 * 60 * 1000;

export const visitorSlug = (sessionId: string) => `${PREFIX}${sessionId}`;

const isUniqueViolation = (error: unknown) => {
    const candidate = error as { code?: string; cause?: { code?: string } };
    return candidate?.code === "23505" || candidate?.cause?.code === "23505";
};

async function findWorkspace(db: Database, slug: string) {
    const [row] = await db.select({ id: workspaces.id, createdAt: workspaces.createdAt }).from(workspaces).where(eq(workspaces.slug, slug));
    return row;
}

/**
 * The workspace of this visitor. The first visit copies the seed; after a day the copy is replaced,
 * so nothing a visitor typed outlives their session and nobody sees another visitor's edits.
 */
export async function ensureVisitorWorkspace(db: Database, sessionId: string, now = new Date()): Promise<string> {
    const slug = visitorSlug(sessionId);
    const existing = await findWorkspace(db, slug);
    if (existing && now.getTime() - existing.createdAt.getTime() < VISITOR_TTL_MS) return existing.id;
    try {
        return (await seedDemoWorkspace(db, slug, now)).workspaceId;
    } catch (error) {
        // Two requests of a new visitor can race; the loser reads the copy the winner made.
        const winner = isUniqueViolation(error) ? await findWorkspace(db, slug) : undefined;
        if (!winner) throw error;
        return winner.id;
    }
}

/** Puts this visitor's copy back to the seed. The new copy has new ids, so old cache entries are never read again. */
export async function resetVisitorWorkspace(db: Database, sessionId: string) {
    return seedDemoWorkspace(db, visitorSlug(sessionId));
}

/** The nightly cron: removes every visitor copy that has outlived its day. */
export async function deleteExpiredVisitorWorkspaces(db: Database, now = new Date()) {
    const expired = await db
        .delete(workspaces)
        .where(and(like(workspaces.slug, `${PREFIX}%`), lt(workspaces.createdAt, new Date(now.getTime() - VISITOR_TTL_MS))))
        .returning({ id: workspaces.id });
    return expired.length;
}
