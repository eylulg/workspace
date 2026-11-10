"use client";

import { Kbd } from "@eylulg/ui/kbd";
import { Command } from "cmdk";
import { ArrowLeft, Bookmark, Columns3, Folder, Globe, Hash, Keyboard, List, Moon, Plus, RefreshCcw, Sun, Tag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type KeyboardEvent, type ReactNode, useEffect, useState } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { track } from "@/features/analytics/analytics";
import { PriorityIcon, StatusIcon } from "@/features/issues/issue-icons";
import { MemberAvatar } from "@/features/issues/member-avatar";
import { useAssigneeOptions, usePriorityOptions, useStatusOptions } from "@/features/issues/property-menus";
import { useResetDemo } from "@/features/shell/use-reset-demo";
import { type PaletteMode, useWorkspace } from "@/features/workspace/workspace-context";
import { LOCALE_NAMES } from "@/i18n/locale-names";
import { usePathname, useRouter } from "@/i18n/navigation";
import { type Locale, locales } from "@/i18n/routing";
import { PRIORITIES, STATUSES } from "@/lib/domain";
import type { IssuePatch } from "@/lib/optimistic";
import { setTheme } from "./set-theme";

interface ItemProps {
    icon?: ReactNode;
    children: ReactNode;
    onSelect: () => void;
    value: string;
    keywords?: string[];
    shortcut?: string;
}

const OVERLAY_CLASS =
    "fixed inset-0 z-50 flex items-start justify-center bg-overlay p-4 pt-[12vh] transition-opacity duration-150 data-entering:opacity-0 data-exiting:opacity-0 motion-reduce:transition-none";
const MODAL_CLASS = "w-full max-w-xl overflow-hidden rounded-xl border border-subtle bg-elevated text-primary shadow-xl";
const ITEM_CLASS =
    "flex cursor-pointer items-center gap-3 rounded-sm px-item-x py-item-y text-sm text-primary data-[selected=true]:bg-hover aria-disabled:opacity-50";
const GROUP_CLASS =
    "px-1 pb-1 [&_[cmdk-group-heading]]:px-item-x [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-tertiary";
const ICON_CLASS = "size-4";

export function CommandPalette() {
    const t = useTranslations("palette");
    const { palette, closePalette } = useWorkspace();

    useEffect(() => {
        if (palette.open) track("palette_opened", { mode: palette.mode });
    }, [palette.open, palette.mode]);

    function handleOpenChange(open: boolean) {
        if (!open) closePalette();
    }

    return (
        <ModalOverlay isOpen={palette.open} onOpenChange={handleOpenChange} isDismissable className={OVERLAY_CLASS}>
            <Modal className={MODAL_CLASS}>
                <Dialog aria-label={t("label")} className="overflow-hidden outline-none">
                    {palette.open ? <PaletteBody initialMode={palette.mode} /> : null}
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}

function PaletteBody({ initialMode }: { initialMode: PaletteMode }) {
    const t = useTranslations();
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale();
    const { data, issueIndex, activeIssue, closePalette, setCreateOpen, setHelpOpen, updateIssue } = useWorkspace();
    const statusOptions = useStatusOptions();
    const priorityOptions = usePriorityOptions();
    const assigneeOptions = useAssigneeOptions();
    const resetDemo = useResetDemo();
    const [mode, setMode] = useState<PaletteMode>(initialMode);
    const [search, setSearch] = useState("");

    const target = activeIssue;
    const placeholder =
        mode === "root" ? t("palette.placeholder") : t(`palette.${mode}Placeholder`, { identifier: target?.identifier ?? "" });

    function run(action: () => void) {
        return () => {
            closePalette();
            action();
        };
    }

    function go(href: string) {
        return run(() => router.push(href));
    }

    function openPage(next: PaletteMode) {
        return () => {
            setMode(next);
            setSearch("");
        };
    }

    function patchTarget(patch: IssuePatch) {
        return run(() => {
            if (target) updateIssue(target, patch);
        });
    }

    function switchLocale(next: Locale) {
        return run(() => router.replace(`${pathname}${window.location.search}`, { locale: next }));
    }

    function handleBack() {
        setMode("root");
    }

    // Backspace on an empty search goes back to the main page.
    function handleKeyDown(event: KeyboardEvent) {
        if (event.key !== "Backspace" || search || mode === "root") return;
        event.preventDefault();
        setMode("root");
    }

    return (
        <Command label={t("palette.label")} loop className="flex max-h-[min(70vh,32rem)] flex-col" onKeyDown={handleKeyDown}>
            <div className="flex items-center gap-2 border-b border-subtle px-4">
                {mode !== "root" && (
                    <button
                        type="button"
                        onClick={handleBack}
                        aria-label={t("palette.back")}
                        className="rounded-sm p-1 text-fg-tertiary outline-focus hover:bg-hover focus-visible:outline-2"
                    >
                        <ArrowLeft aria-hidden="true" className={ICON_CLASS} />
                    </button>
                )}
                <Command.Input
                    autoFocus
                    value={search}
                    onValueChange={setSearch}
                    placeholder={placeholder}
                    className="h-14 w-full bg-transparent text-md text-primary outline-none placeholder:text-placeholder"
                />
            </div>
            <Command.List label={t("palette.results")} className="overflow-y-auto p-1">
                <Command.Empty className="px-4 py-8 text-center text-sm text-tertiary">{t("palette.noResults")}</Command.Empty>

                {mode === "status" && target && (
                    <Command.Group heading={t("palette.setStatusFor", { identifier: target.identifier })} className={GROUP_CLASS}>
                        {STATUSES.map((status, index) => (
                            <Item
                                key={status}
                                value={statusOptions[index]?.label ?? status}
                                icon={<StatusIcon status={status} />}
                                onSelect={patchTarget({ status })}
                            >
                                {statusOptions[index]?.label}
                                {status === target.status && <span className="sr-only"> ({t("palette.current")})</span>}
                            </Item>
                        ))}
                    </Command.Group>
                )}
                {mode === "priority" && target && (
                    <Command.Group heading={t("palette.setPriorityFor", { identifier: target.identifier })} className={GROUP_CLASS}>
                        {PRIORITIES.map((priority, index) => (
                            <Item
                                key={priority}
                                value={priorityOptions[index]?.label ?? String(priority)}
                                icon={<PriorityIcon priority={priority} />}
                                onSelect={patchTarget({ priority })}
                            >
                                {priorityOptions[index]?.label}
                            </Item>
                        ))}
                    </Command.Group>
                )}
                {mode === "assignee" && target && (
                    <Command.Group heading={t("palette.assign", { identifier: target.identifier })} className={GROUP_CLASS}>
                        {assigneeOptions.map((option) => (
                            <Item
                                key={option.id}
                                value={option.label}
                                icon={option.icon}
                                onSelect={patchTarget({ assigneeId: option.id === "none" ? null : option.id })}
                            >
                                {option.label}
                            </Item>
                        ))}
                    </Command.Group>
                )}

                {mode === "root" && (
                    <>
                        {target && (
                            <Command.Group heading={target.identifier} className={GROUP_CLASS}>
                                <Item
                                    value="set status"
                                    icon={<StatusIcon status={target.status} />}
                                    shortcut="S"
                                    onSelect={openPage("status")}
                                >
                                    {t("palette.changeStatus")}
                                </Item>
                                <Item
                                    value="set priority"
                                    icon={<PriorityIcon priority={target.priority} />}
                                    shortcut="P"
                                    onSelect={openPage("priority")}
                                >
                                    {t("palette.changePriority")}
                                </Item>
                                <Item
                                    value="assign"
                                    icon={<MemberAvatar member={data.members.find((member) => member.id === target.assigneeId)} />}
                                    shortcut="A"
                                    onSelect={openPage("assignee")}
                                >
                                    {t("palette.changeAssignee")}
                                </Item>
                            </Command.Group>
                        )}
                        <Command.Group heading={t("palette.actions")} className={GROUP_CLASS}>
                            <Item
                                value={t("palette.createIssue")}
                                icon={<Plus className={ICON_CLASS} />}
                                shortcut="C"
                                onSelect={run(() => setCreateOpen(true))}
                            >
                                {t("palette.createIssue")}
                            </Item>
                            <Item
                                value={t("palette.shortcuts")}
                                icon={<Keyboard className={ICON_CLASS} />}
                                shortcut="?"
                                onSelect={run(() => setHelpOpen(true))}
                            >
                                {t("palette.shortcuts")}
                            </Item>
                            <Item
                                value={t("palette.lightTheme")}
                                icon={<Sun className={ICON_CLASS} />}
                                onSelect={run(() => setTheme("light"))}
                            >
                                {t("palette.lightTheme")}
                            </Item>
                            <Item
                                value={t("palette.darkTheme")}
                                icon={<Moon className={ICON_CLASS} />}
                                onSelect={run(() => setTheme("dark"))}
                            >
                                {t("palette.darkTheme")}
                            </Item>
                            {locales
                                .filter((item) => item !== locale)
                                .map((item) => (
                                    <Item
                                        key={item}
                                        value={`${t("palette.language")} ${LOCALE_NAMES[item]}`}
                                        icon={<Globe className={ICON_CLASS} />}
                                        onSelect={switchLocale(item)}
                                    >
                                        {t("palette.language")} <span lang={item}>{LOCALE_NAMES[item]}</span>
                                    </Item>
                                ))}
                            <Item value={t("palette.resetDemo")} icon={<RefreshCcw className={ICON_CLASS} />} onSelect={run(resetDemo)}>
                                {t("palette.resetDemo")}
                            </Item>
                        </Command.Group>
                        <Command.Group heading={t("palette.navigation")} className={GROUP_CLASS}>
                            <Item
                                value={t("palette.goIssues")}
                                icon={<List className={ICON_CLASS} />}
                                shortcut="G I"
                                onSelect={go("/issues")}
                            >
                                {t("palette.goIssues")}
                            </Item>
                            <Item
                                value={t("palette.goBoard")}
                                icon={<Columns3 className={ICON_CLASS} />}
                                onSelect={go("/issues?view=board")}
                            >
                                {t("palette.goBoard")}
                            </Item>
                            <Item
                                value={t("palette.goProjects")}
                                icon={<Folder className={ICON_CLASS} />}
                                shortcut="G P"
                                onSelect={go("/projects")}
                            >
                                {t("palette.goProjects")}
                            </Item>
                            <Item
                                value={t("palette.goLabels")}
                                icon={<Tag className={ICON_CLASS} />}
                                shortcut="G L"
                                onSelect={go("/labels")}
                            >
                                {t("palette.goLabels")}
                            </Item>
                            {data.teams.map((team) => (
                                <Item
                                    key={team.id}
                                    value={`${t("palette.team")} ${team.name} ${team.key}`}
                                    icon={<Hash className={ICON_CLASS} />}
                                    onSelect={go(`/issues?team=${team.key}`)}
                                >
                                    {t("palette.teamIssues", { team: team.name })}
                                </Item>
                            ))}
                            {data.savedViews.map((view) => (
                                <Item
                                    key={view.id}
                                    value={`${t("palette.view")} ${view.name}`}
                                    icon={<Bookmark className={ICON_CLASS} />}
                                    onSelect={go(`/issues?${view.query}`)}
                                >
                                    {view.name}
                                </Item>
                            ))}
                        </Command.Group>
                        {search.trim().length > 0 && (
                            <Command.Group heading={t("palette.issues")} className={GROUP_CLASS}>
                                {issueIndex.map((issue) => (
                                    <Item
                                        key={issue.id}
                                        value={`${issue.identifier} ${issue.title}`}
                                        keywords={[issue.identifier.replace("-", " ")]}
                                        icon={<StatusIcon status={issue.status} />}
                                        onSelect={go(`/issue/${issue.identifier}`)}
                                    >
                                        <span className="mr-2 font-data text-xs text-tertiary tabular-nums">{issue.identifier}</span>
                                        {issue.title}
                                    </Item>
                                ))}
                            </Command.Group>
                        )}
                    </>
                )}
            </Command.List>
        </Command>
    );
}

function Item({ icon, children, onSelect, value, keywords, shortcut }: ItemProps) {
    return (
        <Command.Item value={value} keywords={keywords} onSelect={onSelect} className={ITEM_CLASS}>
            <span className="flex size-5 shrink-0 items-center justify-center text-fg-tertiary">{icon}</span>
            <span className="min-w-0 flex-1 truncate">{children}</span>
            {shortcut && <Kbd keys={shortcut.split(" ")} aria-hidden="true" />}
        </Command.Item>
    );
}
