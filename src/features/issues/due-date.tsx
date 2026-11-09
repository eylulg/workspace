"use client";

import { Calendar } from "@untitledui/icons";
import { useFormatter, useTranslations } from "next-intl";
import { cx } from "@/utils/cx";

const todayIso = () => new Date().toISOString().slice(0, 10);

const isOverdue = (dueDate: string | null, status: string) =>
    Boolean(dueDate && dueDate < todayIso() && status !== "done" && status !== "canceled");

/** A due date formatted for the current locale, marked when it has passed. */
export function DueDate({ dueDate, status, className }: { dueDate: string | null; status: string; className?: string }) {
    const format = useFormatter();
    const t = useTranslations("issue");
    if (!dueDate) return null;
    const overdue = isOverdue(dueDate, status);
    const formatted = format.dateTime(new Date(`${dueDate}T12:00:00Z`), { day: "numeric", month: "short" });
    return (
        <span
            className={cx(
                "inline-flex shrink-0 items-center gap-1 text-xs tabular-nums",
                overdue ? "font-medium text-error-primary" : "text-tertiary",
                className,
            )}
            title={t("dueOn", { date: formatted })}
        >
            <Calendar aria-hidden="true" className="size-3.5" />
            <span className="sr-only">{overdue ? t("overdueOn", { date: formatted }) : t("dueOn", { date: formatted })}</span>
            <span aria-hidden="true">{formatted}</span>
        </span>
    );
}
