import { User } from "lucide-react";
import type { Member } from "@/lib/domain";

const initialsOf = (name: string) =>
    name
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

/**
 * Initials avatar. Decorative: the member's name is always in the accessible name of the control around it.
 * The library Avatar renders its initials as text, which axe flags (label-content-name-mismatch) inside a button
 * named by aria-label, so the initials come from CSS content here.
 */
export const MemberAvatar = ({ member }: { member: Member | null | undefined }) => (
    <span
        aria-hidden="true"
        data-initials={member ? initialsOf(member.name) : undefined}
        className={
            member
                ? "inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-default bg-brand-subtle text-xs font-semibold text-brand before:content-[attr(data-initials)]"
                : "inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-default bg-secondary text-fg-tertiary"
        }
    >
        {member ? null : <User className="size-3.5" />}
    </span>
);
