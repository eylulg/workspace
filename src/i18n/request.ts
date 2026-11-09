import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
    const requested = await requestLocale;
    const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
    return {
        locale,
        messages: (await import(`../../messages/${locale}.json`)).default,
        // Server and client render the same relative times when they share a clock reference.
        timeZone: "Europe/Amsterdam",
    };
});
