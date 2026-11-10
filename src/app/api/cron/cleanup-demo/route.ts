import { getDb } from "@/server/db/client";
import { deleteExpiredVisitorWorkspaces } from "@/server/visitor-workspace";

/**
 * Called by Vercel Cron every night (see vercel.json). Vercel sends
 * `Authorization: Bearer $CRON_SECRET`, so nobody else can trigger it.
 * Visitors get a fresh copy when theirs is a day old; this only deletes the copies nobody came back to.
 */
export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
        return new Response("Unauthorized", { status: 401 });
    }
    const removed = await deleteExpiredVisitorWorkspaces(await getDb());
    return Response.json({ ok: true, removed });
}
