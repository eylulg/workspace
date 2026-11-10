import { cx } from "@eylulg/ui/cx";
import type { Priority, Status } from "@/lib/domain";

const STATUS_COLOR: Record<Status, string> = {
    backlog: "text-fg-tertiary",
    todo: "text-fg-secondary",
    in_progress: "text-fg-warning",
    in_review: "text-fg-brand",
    done: "text-fg-success",
    canceled: "text-fg-tertiary",
};

/** Linear style status glyphs. Decorative: the status name is always rendered or announced next to it. */
export function StatusIcon({ status, className }: { status: Status; className?: string }) {
    const common = {
        "aria-hidden": true,
        viewBox: "0 0 16 16",
        className: cx("size-4 shrink-0", STATUS_COLOR[status], className),
    } as const;
    switch (status) {
        case "backlog":
            return (
                <svg {...common} fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.2 2.2" />
                </svg>
            );
        case "todo":
            return (
                <svg {...common} fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                </svg>
            );
        case "in_progress":
            return (
                <svg {...common} fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 4a4 4 0 0 1 0 8z" fill="currentColor" />
                </svg>
            );
        case "in_review":
            return (
                <svg {...common} fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 4a4 4 0 1 1-4 4h4z" fill="currentColor" />
                </svg>
            );
        case "done":
            return (
                <svg {...common} fill="none">
                    <circle cx="8" cy="8" r="7" fill="currentColor" />
                    <path
                        d="m5 8.2 2 2 4-4.2"
                        stroke="var(--ui-bg-primary)"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            );
        case "canceled":
            return (
                <svg {...common} fill="none">
                    <circle cx="8" cy="8" r="7" fill="currentColor" />
                    <path d="m5.8 5.8 4.4 4.4m0-4.4-4.4 4.4" stroke="var(--ui-bg-primary)" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
            );
    }
}

export function PriorityIcon({ priority, className }: { priority: Priority; className?: string }) {
    const common = { "aria-hidden": true, viewBox: "0 0 16 16", className: cx("size-4 shrink-0", className) } as const;
    if (priority === 0) {
        return (
            <svg {...common} className={cx(common.className, "text-fg-tertiary")} fill="currentColor">
                <rect x="2" y="7.25" width="3" height="1.5" rx="0.75" />
                <rect x="6.5" y="7.25" width="3" height="1.5" rx="0.75" />
                <rect x="11" y="7.25" width="3" height="1.5" rx="0.75" />
            </svg>
        );
    }
    if (priority === 1) {
        return (
            <svg {...common} className={cx(common.className, "text-fg-error")} fill="none">
                <rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="currentColor" />
                <path d="M8 4.5v4.25" stroke="var(--ui-bg-primary)" strokeWidth="1.75" strokeLinecap="round" />
                <circle cx="8" cy="11.25" r="1" fill="var(--ui-bg-primary)" />
            </svg>
        );
    }
    // 2 high shows three bars, 3 medium two, 4 low one.
    const filled = 5 - priority;
    return (
        <svg {...common} className={cx(common.className, "text-fg-secondary")} fill="currentColor">
            {[0, 1, 2].map((bar) => (
                <rect
                    key={bar}
                    x={2 + bar * 4.5}
                    y={10 - bar * 3.5}
                    width="3"
                    height={4 + bar * 3.5}
                    rx="1"
                    opacity={bar < filled ? 1 : 0.3}
                />
            ))}
        </svg>
    );
}

export const LabelDot = ({ color, className }: { color: string; className?: string }) => (
    <span aria-hidden="true" className={cx("inline-block size-2 shrink-0 rounded-full", className)} style={{ backgroundColor: color }} />
);
