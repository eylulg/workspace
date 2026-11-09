"use client";

import { AlertCircle, XClose } from "@untitledui/icons";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { cx } from "@/utils/cx";
import { type Toast, toastStore, useToasts } from "./toast-store";

const TOAST_TIMEOUT = 8000;

function ToastItem({ toast }: { toast: Toast }) {
    const t = useTranslations("common");
    const [isPaused, setIsPaused] = useState(false);
    const remaining = useRef(TOAST_TIMEOUT);

    useEffect(() => {
        if (isPaused) return;
        const startedAt = Date.now();
        const timer = window.setTimeout(() => toastStore.dismiss(toast.id), remaining.current);
        return () => {
            window.clearTimeout(timer);
            remaining.current = Math.max(1500, remaining.current - (Date.now() - startedAt));
        };
    }, [isPaused, toast.id]);

    function handlePause() {
        setIsPaused(true);
    }
    function handleResume() {
        setIsPaused(false);
    }
    function handleAction() {
        toast.action?.onAction();
        toastStore.dismiss(toast.id);
    }
    function handleDismiss() {
        toastStore.dismiss(toast.id);
    }

    return (
        <li
            className={cx(
                "pointer-events-auto flex w-full items-start gap-3 rounded-xl bg-primary p-4 shadow-lg ring-1 ring-secondary_alt sm:w-96",
                "duration-200 ease-out animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none",
            )}
            onMouseEnter={handlePause}
            onMouseLeave={handleResume}
            onFocus={handlePause}
            onBlur={handleResume}
        >
            {toast.tone === "error" && <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-fg-error-primary" />}
            <p className="min-w-0 flex-1 pt-0.5 text-sm font-medium break-words text-primary">{toast.message}</p>
            {toast.action && (
                <Button size="sm" color="link-color" className="shrink-0 pt-0.5" onClick={handleAction}>
                    {toast.action.label}
                </Button>
            )}
            <ButtonUtility
                size="xs"
                color="tertiary"
                icon={XClose}
                tooltip={t("dismiss")}
                className="-m-1 shrink-0"
                onClick={handleDismiss}
            />
        </li>
    );
}

/** Fixed region that announces toasts politely to screen readers. */
export function ToastRegion() {
    const t = useTranslations("common");
    const toasts = useToasts();
    return (
        <section
            aria-label={t("notifications")}
            className="pointer-events-none fixed inset-x-4 bottom-4 z-40 flex justify-center sm:right-6 sm:left-auto sm:justify-end"
        >
            <ol
                aria-live="polite"
                aria-relevant="additions text"
                className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end"
            >
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} />
                ))}
            </ol>
        </section>
    );
}
