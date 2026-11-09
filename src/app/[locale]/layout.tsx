import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { AppShell, ShellFallback } from "@/features/shell/app-shell";
import { routing } from "@/i18n/routing";
import { Providers } from "@/providers/providers";
import "@/styles/globals.css";
import { cx } from "@/utils/cx";

const inter = Inter({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-inter" });

export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "meta" });
    return {
        title: { default: t("title"), template: `%s · ${t("title")}` },
        description: t("description"),
    };
}

export const viewport: Viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#ffffff" },
        { media: "(prefers-color-scheme: dark)", color: "#0c0e12" },
    ],
    colorScheme: "light dark",
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
    const { locale } = await params;
    if (!hasLocale(routing.locales, locale)) notFound();
    setRequestLocale(locale);
    const t = await getTranslations({ locale, namespace: "common" });

    return (
        <html lang={locale} suppressHydrationWarning>
            <body className={cx(inter.variable, "bg-primary antialiased")}>
                <a
                    href="#main"
                    className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary shadow-lg ring-2 ring-brand focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
                >
                    {t("skipToContent")}
                </a>
                <NextIntlClientProvider>
                    <Providers>
                        <Suspense fallback={<ShellFallback />}>
                            <AppShell>{children}</AppShell>
                        </Suspense>
                    </Providers>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
