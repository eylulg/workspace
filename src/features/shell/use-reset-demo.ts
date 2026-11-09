"use client";

import { useTranslations } from "next-intl";
import { startTransition } from "react";
import { toastStore } from "@/features/toast/toast-store";
import { useRouter } from "@/i18n/navigation";
import { resetDemo } from "@/server/actions/demo";

export function useResetDemo() {
    const t = useTranslations();
    const router = useRouter();
    return () => {
        if (!window.confirm(t("nav.resetDemoConfirm"))) return;
        startTransition(async () => {
            const result = await resetDemo();
            if (!result.ok) {
                toastStore.show({ message: t(`errors.${result.error}`), tone: "error" });
                return;
            }
            toastStore.show({ message: t("nav.resetDemoDone") });
            router.push("/issues");
        });
    };
}
