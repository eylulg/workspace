"use client";

import { Button } from "@eylulg/ui/button";
import { cx } from "@eylulg/ui/cx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@eylulg/ui/dropdown-menu";
import { Folder, Tag } from "lucide-react";
import { useTranslations } from "next-intl";
import { type KeyboardEvent, type ReactNode, useState } from "react";
import type { Key, Selection } from "react-aria-components";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { PRIORITIES, type Priority, STATUSES, type Status } from "@/lib/domain";
import { LabelDot, PriorityIcon, StatusIcon } from "./issue-icons";
import { MemberAvatar } from "./member-avatar";

const COMPACT_TRIGGER = "px-1.5";

interface Option {
    id: string;
    label: string;
    icon: ReactNode;
}

interface MenuProps {
    /** Accessible name of the property, for example "Status". */
    label: string;
    options: Option[];
    /** Shows only the icon in the trigger (dense rows and cards). */
    compact?: boolean;
    className?: string;
    isDisabled?: boolean;
}

interface SingleMenuProps extends MenuProps {
    value: string;
    onChange: (value: string) => void;
}

function SingleSelectMenu({ label, options, value, onChange, compact, className, isDisabled }: SingleMenuProps) {
    // A list has a few hundred of these triggers, so each one is a plain button until the first press or arrow key.
    // Only then does the menu mount, already open.
    const [armed, setArmed] = useState(false);
    const current = options.find((option) => option.id === value);

    function handleAction(key: Key) {
        if (key !== value) onChange(String(key));
    }

    function handleArm() {
        setArmed(true);
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setArmed(true);
        }
    }

    if (!current) return null;

    const trigger = (
        <Button
            variant="tertiary"
            size="sm"
            aria-label={`${label}: ${current.label}`}
            isDisabled={isDisabled}
            className={cx(compact && COMPACT_TRIGGER, className)}
            // The armed button is a new element, so it takes focus back for the menu to return it on close.
            autoFocus={armed}
            onPress={armed ? undefined : handleArm}
            onKeyDown={armed ? undefined : handleKeyDown}
        >
            {current.icon}
            {!compact && <span className="truncate">{current.label}</span>}
        </Button>
    );

    if (!armed) return trigger;

    return (
        <DropdownMenu defaultOpen>
            {trigger}
            <DropdownMenuContent
                aria-label={label}
                placement="bottom start"
                popoverClassName="w-56"
                selectionMode="single"
                selectedKeys={[value]}
                disallowEmptySelection
                onAction={handleAction}
            >
                {options.map((option) => (
                    <DropdownMenuItem key={option.id} id={option.id} textValue={option.label}>
                        <span className="flex items-center gap-2">
                            {option.icon}
                            <span className="truncate">{option.label}</span>
                        </span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function useStatusOptions(): Option[] {
    const t = useTranslations("status");
    return STATUSES.map((status) => ({ id: status, label: t(status), icon: <StatusIcon status={status} /> }));
}

export function usePriorityOptions(): Option[] {
    const t = useTranslations("priority");
    return PRIORITIES.map((priority) => ({ id: String(priority), label: t(String(priority)), icon: <PriorityIcon priority={priority} /> }));
}

export function useAssigneeOptions(): Option[] {
    const t = useTranslations("issue");
    const { data } = useWorkspace();
    return [
        { id: "none", label: t("unassigned"), icon: <MemberAvatar member={null} /> },
        ...data.members.map((member) => ({ id: member.id, label: member.name, icon: <MemberAvatar member={member} /> })),
    ];
}

function useProjectOptions(teamId: string): Option[] {
    const t = useTranslations("issue");
    const { data } = useWorkspace();
    return [
        { id: "none", label: t("noProject"), icon: <Folder aria-hidden="true" className="size-4 text-fg-tertiary" /> },
        ...data.projects
            .filter((project) => project.teamId === teamId)
            .map((project) => ({
                id: project.id,
                label: project.name,
                icon: <Folder aria-hidden="true" className="size-4 text-fg-secondary" />,
            })),
    ];
}

type TypedMenuProps<T> = { value: T; onChange: (value: T) => void } & Omit<MenuProps, "label" | "options">;

export function StatusMenu({ value, onChange, ...props }: TypedMenuProps<Status>) {
    const t = useTranslations("issue");
    const options = useStatusOptions();

    function handleChange(next: string) {
        const status = STATUSES.find((item) => item === next);
        if (status) onChange(status);
    }

    return <SingleSelectMenu label={t("status")} options={options} value={value} onChange={handleChange} {...props} />;
}

export function PriorityMenu({ value, onChange, ...props }: TypedMenuProps<Priority>) {
    const t = useTranslations("issue");
    const options = usePriorityOptions();

    function handleChange(next: string) {
        const priority = PRIORITIES.find((item) => String(item) === next);
        if (priority !== undefined) onChange(priority);
    }

    return <SingleSelectMenu label={t("priority")} options={options} value={String(value)} onChange={handleChange} {...props} />;
}

function noneToNull(value: string) {
    return value === "none" ? null : value;
}

export function AssigneeMenu({ value, onChange, ...props }: TypedMenuProps<string | null>) {
    const t = useTranslations("issue");
    const options = useAssigneeOptions();

    function handleChange(next: string) {
        onChange(noneToNull(next));
    }

    return <SingleSelectMenu label={t("assignee")} options={options} value={value ?? "none"} onChange={handleChange} {...props} />;
}

export function ProjectMenu({ teamId, value, onChange, ...props }: TypedMenuProps<string | null> & { teamId: string }) {
    const t = useTranslations("issue");
    const options = useProjectOptions(teamId);

    function handleChange(next: string) {
        onChange(noneToNull(next));
    }

    return <SingleSelectMenu label={t("project")} options={options} value={value ?? "none"} onChange={handleChange} {...props} />;
}

export function LabelsMenu({ value, onChange, className }: { value: string[]; onChange: (ids: string[]) => void; className?: string }) {
    const t = useTranslations("issue");
    const { data } = useWorkspace();
    const selected = data.labels.filter((label) => value.includes(label.id));
    const summary = selected.length ? selected.map((label) => label.name).join(", ") : t("noLabels");

    function handleSelectionChange(keys: Selection) {
        onChange(keys === "all" ? data.labels.map((label) => label.id) : [...keys].map(String));
    }

    return (
        <DropdownMenu>
            <Button variant="tertiary" size="sm" aria-label={`${t("labels")}: ${summary}`} className={className}>
                {selected.length ? (
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        {selected.map((label) => (
                            <span key={label.id} className="inline-flex items-center gap-1.5">
                                <LabelDot color={label.color} />
                                <span className="truncate">{label.name}</span>
                            </span>
                        ))}
                    </span>
                ) : (
                    <>
                        <Tag aria-hidden="true" className="size-4 text-fg-tertiary" />
                        <span>{t("noLabels")}</span>
                    </>
                )}
            </Button>
            <DropdownMenuContent
                aria-label={t("labels")}
                placement="bottom start"
                popoverClassName="w-56"
                selectionMode="multiple"
                selectedKeys={value}
                onSelectionChange={handleSelectionChange}
            >
                {data.labels.map((label) => (
                    <DropdownMenuItem key={label.id} id={label.id} textValue={label.name}>
                        <span className="flex items-center gap-2">
                            <LabelDot color={label.color} />
                            <span className="truncate">{label.name}</span>
                        </span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
