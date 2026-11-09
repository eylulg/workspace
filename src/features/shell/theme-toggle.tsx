"use client";

import { Monitor01, Moon01, Sun } from "@untitledui/icons";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import type { Selection } from "react-aria-components";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";

const subscribe = () => () => {};
const isClient = () => true;
const isServer = () => false;

export function ThemeToggle() {
    const t = useTranslations("nav");
    const { theme, setTheme } = useTheme();
    // The stored theme is only known in the browser, so the server renders no selection.
    const mounted = useSyncExternalStore(subscribe, isClient, isServer);

    function handleSelectionChange(keys: Selection) {
        if (keys === "all") return;
        const [next] = [...keys];
        if (next !== undefined) setTheme(String(next));
    }

    return (
        <ButtonGroup
            aria-label={t("theme")}
            size="sm"
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={mounted && theme ? [theme] : []}
            onSelectionChange={handleSelectionChange}
            className="w-full"
        >
            <ButtonGroupItem id="light" iconLeading={Sun} aria-label={t("light")} className="flex-1 justify-center" />
            <ButtonGroupItem id="dark" iconLeading={Moon01} aria-label={t("dark")} className="flex-1 justify-center" />
            <ButtonGroupItem id="system" iconLeading={Monitor01} aria-label={t("system")} className="flex-1 justify-center" />
        </ButtonGroup>
    );
}
