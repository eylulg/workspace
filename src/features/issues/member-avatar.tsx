import { User01 } from "@untitledui/icons";
import type { Member } from "@/lib/domain";
import { cx } from "@/utils/cx";

const PALETTE = [
    "bg-utility-brand-100 text-utility-brand-700",
    "bg-utility-blue-100 text-utility-blue-700",
    "bg-utility-pink-100 text-utility-pink-700",
    "bg-utility-green-100 text-utility-green-700",
    "bg-utility-orange-100 text-utility-orange-700",
    "bg-utility-indigo-100 text-utility-indigo-700",
];

const initialsOf = (name: string) =>
    name
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

const hash = (value: string) => [...value].reduce((total, char) => total + char.charCodeAt(0), 0);

/** Initials avatar. Decorative: the member's name is always in the accessible name of the control around it. */
export const MemberAvatar = ({
    member,
    size = "sm",
    className,
}: {
    member: Member | null | undefined;
    size?: "xs" | "sm";
    className?: string;
}) => (
    <span
        aria-hidden="true"
        className={cx(
            "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
            size === "xs" ? "size-5 text-[10px]" : "size-6 text-[11px]",
            member ? PALETTE[hash(member.id) % PALETTE.length] : "bg-secondary text-fg-quaternary ring-1 ring-secondary ring-inset",
            className,
        )}
    >
        {member ? initialsOf(member.name) : <User01 className="size-3.5" />}
    </span>
);
