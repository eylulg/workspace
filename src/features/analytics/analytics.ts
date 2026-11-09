/**
 * A thin PostHog hook point. Nothing is downloaded unless NEXT_PUBLIC_POSTHOG_KEY is set,
 * and events captured before the library finishes loading are queued.
 */
export type AnalyticsEvent = "issue_created" | "status_changed" | "palette_opened";

type Capture = (event: AnalyticsEvent, properties?: Record<string, unknown>) => void;

let capture: Capture | null = null;
let queue: [AnalyticsEvent, Record<string, unknown> | undefined][] = [];

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>) {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    if (capture) capture(event, properties);
    else queue.push([event, properties]);
}

export async function initAnalytics() {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || capture) return;
    const { default: posthog } = await import("posthog-js");
    posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
        person_profiles: "identified_only",
        capture_pageview: "history_change",
    });
    capture = (event, properties) => posthog.capture(event, properties);
    const pending = queue;
    queue = [];
    for (const [event, properties] of pending) capture(event, properties);
}
