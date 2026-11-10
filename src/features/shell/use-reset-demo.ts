"use client";

import { useToast } from "@eylulg/ui/toast";
import { useTranslations } from "next-intl";
import { startTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { resetDemo } from "@/server/actions/demo";

export function useResetDemo() {
    const t = useTranslations();
    const router = useRouter();
    const { toast } = useToast();
    return () => {
        if (!window.confirm(t("nav.resetDemoConfirm"))) return;
        startTransition(async () => {
            const result = await resetDemo();
            if (!result.ok) {
                toast({ title: t(`errors.${result.error}`), variant: "error" });
                return;
            }
            toast({ title: t("nav.resetDemoDone"), variant: "success" });
            router.push("/issues");
        });
    };
}
