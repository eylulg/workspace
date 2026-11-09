import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/server/session-cookie";

const intl = createMiddleware(routing);

/**
 * Adds the locale prefix and hands every visitor a guest session cookie.
 * The cookie only identifies the browser (for analytics and future per-user data);
 * everyone edits the same demo workspace, which resets every night.
 */
export default function proxy(request: NextRequest) {
    const response = intl(request);
    if (!request.cookies.has(SESSION_COOKIE)) {
        response.cookies.set(SESSION_COOKIE, crypto.randomUUID(), {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: SESSION_MAX_AGE,
            path: "/",
        });
    }
    return response;
}

export const config = {
    // Everything except API routes, Next internals and files with an extension.
    matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
