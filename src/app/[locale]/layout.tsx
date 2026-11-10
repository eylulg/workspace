import { themeInitScript } from "@eylulg/ui/chrome";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { ShellFallback, WorkspaceShell } from "@/features/shell/workspace-shell";
import { routing } from "@/i18n/routing";
import { Providers } from "@/providers/providers";
import "@/styles/globals.css";

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

    return (
        <html lang={locale} suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
            </head>
            <body className="bg-primary antialiased">
                <NextIntlClientProvider>
                    <Providers>
                        <Suspense fallback={<ShellFallback />}>
                            <WorkspaceShell>{children}</WorkspaceShell>
                        </Suspense>
                    </Providers>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
