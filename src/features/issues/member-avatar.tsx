import { Avatar } from "@eylulg/ui/avatar";
import { User } from "lucide-react";
import type { Member } from "@/lib/domain";

/** Decorative: the member's name is always next to it or in the accessible name of the control around it. */
export const MemberAvatar = ({ member }: { member: Member | null | undefined }) => (
    <span aria-hidden="true" className="inline-flex shrink-0">
        {member ? (
            <Avatar name={member.name} size="xs" />
        ) : (
            <span className="inline-flex size-6 items-center justify-center rounded-full border border-default bg-secondary text-fg-tertiary">
                <User className="size-3.5" />
            </span>
        )}
    </span>
);
