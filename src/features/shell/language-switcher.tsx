"use client";

import { ChevronSelectorVertical, Globe01 } from "@untitledui/icons";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button as AriaButton, type Key } from "react-aria-components";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { LOCALE_NAMES, localeName } from "@/i18n/locale-names";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales } from "@/i18n/routing";

export function LanguageSwitcher() {
    const t = useTranslations("nav");
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();

    function handleAction(key: Key) {
        const next = locales.find((item) => item === key);
        if (!next || next === locale) return;
        startTransition(() => router.replace(`${pathname}${window.location.search}`, { locale: next }));
    }

    return (
        <Dropdown.Root>
            <AriaButton
                aria-label={`${t("language")}: ${localeName(locale)}`}
                className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-semibold text-secondary shadow-xs ring-1 ring-primary outline-focus-ring ring-inset hover:bg-primary_hover focus-visible:outline-2 focus-visible:outline-offset-2 aria-busy:opacity-70"
                aria-busy={isPending}
            >
                <Globe01 aria-hidden="true" className="size-4 text-fg-quaternary" />
                <span className="flex-1 text-left">{localeName(locale)}</span>
                <ChevronSelectorVertical aria-hidden="true" className="size-4 text-fg-quaternary" />
            </AriaButton>
            <Dropdown.Popover placement="top start" className="w-48">
                <Dropdown.Menu aria-label={t("language")} selectionMode="single" selectedKeys={[locale]} onAction={handleAction}>
                    {locales.map((item) => (
                        <Dropdown.Item key={item} id={item} textValue={LOCALE_NAMES[item]}>
                            <span lang={item}>{LOCALE_NAMES[item]}</span>
                        </Dropdown.Item>
                    ))}
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown.Root>
    );
}
