import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { parseIdentifier } from "@/lib/domain";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/server/session-cookie";

const intl = createMiddleware(routing);

const PAGES = new Set(["", "issues", "projects", "labels"]);

function isLocale(value: string | undefined): value is (typeof routing.locales)[number] {
    return routing.locales.some((locale) => locale === value);
}

/** Streamed pages always answer 200, so unknown paths and missing issues are rejected here, where a status can still be set. */
async function notFoundResponse(request: NextRequest, locale: string, sessionId: string): Promise<NextResponse | null> {
    const [, , page = "", identifier, ...extra] = request.nextUrl.pathname.split("/");
    const isRender = !request.headers.has("rsc") && !request.headers.has("next-action");
    let missing = !PAGES.has(page) && page !== "issue";
    if (page === "issue") {
        const parsed = identifier && !extra.length ? parseIdentifier(decodeURIComponent(identifier)) : null;
        missing = !parsed;
        if (parsed && isRender && identifier !== `${parsed.teamKey.toUpperCase()}-${parsed.number}`) {
            const url = request.nextUrl.clone();
            url.pathname = `/${locale}/issue/${parsed.teamKey.toUpperCase()}-${parsed.number}`;
            return NextResponse.redirect(url);
        }
        if (parsed && isRender) {
            const check = new URL("/api/issue-exists", request.nextUrl.origin);
            check.searchParams.set("identifier", `${parsed.teamKey}-${parsed.number}`);
            const answer = await fetch(check, { headers: { cookie: `${SESSION_COOKIE}=${sessionId}` }, cache: "no-store" }).catch(
                () => null,
            );
            missing = answer?.status === 404;
        }
    } else if (page === "" && request.nextUrl.pathname.split("/").length > 3) {
        missing = true;
    }
    if (!missing || !isRender) return null;
    return NextResponse.rewrite(new URL(`/${locale}/404/missing`, request.url));
}

/**
 * Adds the locale prefix, hands every visitor a guest session cookie and answers 404 for unknown pages.
 * The cookie keys the visitor's own copy of the demo workspace, so the first request must already see it.
 */
export default async function proxy(request: NextRequest) {
    const [, first = ""] = request.nextUrl.pathname.split("/");
    if (/^[a-z]{2}$/.test(first) && !isLocale(first)) {
        const url = request.nextUrl.clone();
        url.pathname = `/${routing.defaultLocale}${request.nextUrl.pathname.slice(first.length + 1)}`;
        return NextResponse.redirect(url);
    }

    const existing = request.cookies.get(SESSION_COOKIE)?.value;
    const sessionId = existing ?? crypto.randomUUID();
    if (!existing) request.cookies.set(SESSION_COOKIE, sessionId);

    const notFound = isLocale(first) ? await notFoundResponse(request, first, sessionId) : null;
    const response = notFound ?? intl(request);
    if (!existing) {
        response.cookies.set(SESSION_COOKIE, sessionId, {
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
