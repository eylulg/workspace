"use client";

import { Folder, Tag01 } from "@untitledui/icons";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button as AriaButton, type Key, type Selection } from "react-aria-components";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { PRIORITIES, type Priority, STATUSES, type Status } from "@/lib/domain";
import { cx } from "@/utils/cx";
import { LabelDot, PriorityIcon, StatusIcon } from "./issue-icons";
import { MemberAvatar } from "./member-avatar";

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

function triggerClass(compact: boolean | undefined, className?: string) {
    return cx(
        "inline-flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md text-sm text-secondary outline-focus-ring transition duration-100 ease-linear",
        "hover:bg-primary_hover focus-visible:outline-2 focus-visible:outline-offset-1 disabled:cursor-not-allowed",
        compact ? "size-7 justify-center" : "h-8 px-2",
        className,
    );
}

function SingleSelectMenu({ label, options, value, onChange, compact, className, isDisabled }: SingleMenuProps) {
    const current = options.find((option) => option.id === value);

    function handleAction(key: Key) {
        if (key !== value) onChange(String(key));
    }

    if (!current) return null;

    return (
        <Dropdown.Root>
            <AriaButton aria-label={`${label}: ${current.label}`} className={triggerClass(compact, className)} isDisabled={isDisabled}>
                {current.icon}
                {!compact && <span className="truncate">{current.label}</span>}
            </AriaButton>
            <Dropdown.Popover placement="bottom start" className="w-56">
                <Dropdown.Menu
                    aria-label={label}
                    selectionMode="single"
                    selectedKeys={[value]}
                    disallowEmptySelection
                    onAction={handleAction}
                >
                    {options.map((option) => (
                        <Dropdown.Item key={option.id} id={option.id} textValue={option.label}>
                            <span className="flex items-center gap-2">
                                {option.icon}
                                <span className="truncate">{option.label}</span>
                            </span>
                        </Dropdown.Item>
                    ))}
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown.Root>
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
        { id: "none", label: t("unassigned"), icon: <MemberAvatar member={null} size="xs" /> },
        ...data.members.map((member) => ({ id: member.id, label: member.name, icon: <MemberAvatar member={member} size="xs" /> })),
    ];
}

function useProjectOptions(teamId: string): Option[] {
    const t = useTranslations("issue");
    const { data } = useWorkspace();
    return [
        { id: "none", label: t("noProject"), icon: <Folder aria-hidden="true" className="size-4 text-fg-quaternary" /> },
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
        <Dropdown.Root>
            <AriaButton aria-label={`${t("labels")}: ${summary}`} className={triggerClass(false, cx("max-w-full", className))}>
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
                        <Tag01 aria-hidden="true" className="size-4 text-fg-quaternary" />
                        <span>{t("noLabels")}</span>
                    </>
                )}
            </AriaButton>
            <Dropdown.Popover placement="bottom start" className="w-56">
                <Dropdown.Menu
                    aria-label={t("labels")}
                    selectionMode="multiple"
                    selectedKeys={value}
                    onSelectionChange={handleSelectionChange}
                >
                    {data.labels.map((label) => (
                        <Dropdown.Item key={label.id} id={label.id} textValue={label.name} selectionIndicator="checkbox">
                            <span className="flex items-center gap-2">
                                <LabelDot color={label.color} />
                                <span className="truncate">{label.name}</span>
                            </span>
                        </Dropdown.Item>
                    ))}
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown.Root>
    );
}
