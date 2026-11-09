import { resetDemoWorkspace } from "@/server/reset-demo";

/**
 * Called by Vercel Cron every night (see vercel.json). Vercel sends
 * `Authorization: Bearer $CRON_SECRET`, so nobody else can trigger a reset.
 */
export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
        return new Response("Unauthorized", { status: 401 });
    }
    const result = await resetDemoWorkspace();
    return Response.json({ ok: true, issues: result.issueCount });
}
