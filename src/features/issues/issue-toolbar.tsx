"use client";

import { FilterLines, LayoutGrid01, List, SearchLg, Settings04, XClose } from "@untitledui/icons";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";
import {
    Button as AriaButton,
    Header as AriaHeader,
    MenuSection as AriaMenuSection,
    type Key,
    type Selection,
} from "react-aria-components";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { InputBase, TextField } from "@/components/base/input/input";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { PRIORITIES, STATUSES } from "@/lib/domain";
import { CLEARED_FILTERS, GROUPINGS, type IssueQuery, SORTS, hasActiveFilters, parseIssueQuery } from "@/lib/issue-query";
import { LabelDot, PriorityIcon, StatusIcon } from "./issue-icons";
import { MemberAvatar } from "./member-avatar";
import { SaveViewDialog } from "./save-view-dialog";

type FilterKey = "status" | "priority" | "assignee" | "label" | "project";

interface FilterOption {
    id: string;
    label: string;
    icon: ReactNode;
}

interface Chip {
    key: FilterKey;
    value: string;
    label: string;
}

interface ToolbarProps {
    query: IssueQuery;
    onChange: (patch: Partial<IssueQuery>) => void;
}

const FILTER_KEYS: FilterKey[] = ["status", "priority", "assignee", "label", "project"];
const SEARCH_DEBOUNCE_MS = 250;
const SECTION_HEADER = "px-4 pt-2 pb-1 text-xs font-semibold text-tertiary";
const MENU_TRIGGER =
    "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-secondary shadow-xs ring-1 ring-primary outline-focus-ring ring-inset hover:bg-primary_hover focus-visible:outline-2 focus-visible:outline-offset-2";

/** Reads the one selected key of a single selection section, for example "group:status" into "status". */
function selectedSuffix(keys: Selection, prefix: string): string | null {
    if (keys === "all") return null;
    const [key] = [...keys];
    return key === undefined ? null : String(key).slice(prefix.length);
}

export function IssueToolbar({ query, onChange }: ToolbarProps) {
    const t = useTranslations();
    const { data } = useWorkspace();
    const [search, setSearch] = useState(query.q);
    const [saveOpen, setSaveOpen] = useState(false);

    const filterOptions: Record<FilterKey, FilterOption[]> = {
        status: STATUSES.map((status) => ({ id: status, label: t(`status.${status}`), icon: <StatusIcon status={status} /> })),
        priority: PRIORITIES.map((priority) => ({
            id: String(priority),
            label: t(`priority.${priority}`),
            icon: <PriorityIcon priority={priority} />,
        })),
        assignee: [
            { id: "none", label: t("issue.unassigned"), icon: <MemberAvatar member={null} size="xs" /> },
            ...data.members.map((member) => ({ id: member.id, label: member.name, icon: <MemberAvatar member={member} size="xs" /> })),
        ],
        label: data.labels.map((label) => ({ id: label.id, label: label.name, icon: <LabelDot color={label.color} /> })),
        project: [
            { id: "none", label: t("issue.noProject"), icon: null },
            ...data.projects.map((project) => ({ id: project.id, label: project.name, icon: null })),
        ],
    };
    const chips: Chip[] = FILTER_KEYS.flatMap((key) =>
        query[key].map((value) => {
            const option = filterOptions[key].find((item) => item.id === String(value));
            return { key, value: String(value), label: `${t(`issues.filters.${key}`)}: ${option?.label ?? value}` };
        }),
    );

    // Debounce typing so every key press does not trigger a server render.
    useEffect(() => {
        if (search === query.q) return;
        const timer = window.setTimeout(() => onChange({ q: search }), SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [search, query.q, onChange]);

    function handleViewChange(keys: Selection) {
        const view = selectedSuffix(keys, "");
        if (view === "list" || view === "board") onChange({ view });
    }

    function handleFilterChange(key: FilterKey, keys: Selection) {
        const values =
            keys === "all" ? filterOptions[key].map((option) => option.id) : [...keys].map((item) => String(item).slice(key.length + 1));
        // Re-parse so priorities become numbers and unknown values are dropped, exactly as from the URL.
        const parsed = parseIssueQuery(new URLSearchParams({ [key]: values.join(",") }));
        onChange({ [key]: parsed[key] });
    }

    function handleGroupChange(keys: Selection) {
        const group = GROUPINGS.find((item) => item === selectedSuffix(keys, "group:"));
        if (group) onChange({ group });
    }

    function handleSortChange(keys: Selection) {
        const sort = SORTS.find((item) => item === selectedSuffix(keys, "sort:"));
        if (sort) onChange({ sort });
    }

    function handleRemoveChip(chip: Chip) {
        handleFilterChange(
            chip.key,
            new Set<Key>(query[chip.key].filter((value) => String(value) !== chip.value).map((value) => `${chip.key}:${value}`)),
        );
    }

    function handleClear() {
        setSearch("");
        onChange(CLEARED_FILTERS);
    }

    function handleOpenSave() {
        setSaveOpen(true);
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <ButtonGroup
                    aria-label={t("issues.view")}
                    selectionMode="single"
                    disallowEmptySelection
                    selectedKeys={[query.view]}
                    onSelectionChange={handleViewChange}
                    size="sm"
                >
                    <ButtonGroupItem id="list" iconLeading={List}>
                        {t("issues.list")}
                    </ButtonGroupItem>
                    <ButtonGroupItem id="board" iconLeading={LayoutGrid01}>
                        {t("issues.board")}
                    </ButtonGroupItem>
                </ButtonGroup>

                <Dropdown.Root>
                    <AriaButton className={MENU_TRIGGER}>
                        <FilterLines aria-hidden="true" className="size-4 text-fg-quaternary" />
                        {t("issues.filter")}
                        {chips.length > 0 && (
                            <span className="rounded-full bg-brand-solid px-1.5 text-xs text-primary_on-brand">{chips.length}</span>
                        )}
                    </AriaButton>
                    <Dropdown.Popover placement="bottom start" className="max-h-[70vh] w-64">
                        <Dropdown.Menu aria-label={t("issues.filter")}>
                            {FILTER_KEYS.map((key) => (
                                <FilterSection
                                    key={key}
                                    filterKey={key}
                                    heading={t(`issues.filters.${key}`)}
                                    options={filterOptions[key]}
                                    query={query}
                                    onChange={handleFilterChange}
                                />
                            ))}
                        </Dropdown.Menu>
                    </Dropdown.Popover>
                </Dropdown.Root>

                <Dropdown.Root>
                    <AriaButton className={MENU_TRIGGER}>
                        <Settings04 aria-hidden="true" className="size-4 text-fg-quaternary" />
                        {t("issues.display")}
                    </AriaButton>
                    <Dropdown.Popover placement="bottom start" className="w-56">
                        <Dropdown.Menu aria-label={t("issues.display")}>
                            {query.view === "list" ? (
                                <AriaMenuSection
                                    selectionMode="single"
                                    disallowEmptySelection
                                    selectedKeys={[`group:${query.group}`]}
                                    onSelectionChange={handleGroupChange}
                                >
                                    <AriaHeader className={SECTION_HEADER}>{t("issues.groupBy")}</AriaHeader>
                                    {GROUPINGS.map((group) => (
                                        <Dropdown.Item key={group} id={`group:${group}`} textValue={t(`issues.group.${group}`)}>
                                            {t(`issues.group.${group}`)}
                                        </Dropdown.Item>
                                    ))}
                                </AriaMenuSection>
                            ) : null}
                            <AriaMenuSection
                                selectionMode="single"
                                disallowEmptySelection
                                selectedKeys={[`sort:${query.sort}`]}
                                onSelectionChange={handleSortChange}
                            >
                                <AriaHeader className={SECTION_HEADER}>{t("issues.sortBy")}</AriaHeader>
                                {SORTS.map((sort) => (
                                    <Dropdown.Item key={sort} id={`sort:${sort}`} textValue={t(`issues.sort.${sort}`)}>
                                        {t(`issues.sort.${sort}`)}
                                    </Dropdown.Item>
                                ))}
                            </AriaMenuSection>
                        </Dropdown.Menu>
                    </Dropdown.Popover>
                </Dropdown.Root>

                <TextField
                    aria-label={t("issues.searchLabel")}
                    value={search}
                    onChange={setSearch}
                    className="min-w-0 flex-1 basis-48 sm:max-w-72"
                >
                    <InputBase id="issue-search" size="sm" type="search" icon={SearchLg} placeholder={t("issues.searchPlaceholder")} />
                </TextField>

                <Button size="sm" color="secondary" onClick={handleOpenSave} className="ml-auto">
                    {t("issues.saveView")}
                </Button>
            </div>

            {chips.length > 0 || query.q ? (
                <ul aria-label={t("issues.activeFilters")} className="flex flex-wrap items-center gap-2">
                    {chips.map((chip) => (
                        <FilterChip
                            key={`${chip.key}:${chip.value}`}
                            chip={chip}
                            removeLabel={t("issues.removeFilter", { filter: chip.label })}
                            onRemove={handleRemoveChip}
                        />
                    ))}
                    {hasActiveFilters(query) && (
                        <li>
                            <Button size="sm" color="link-gray" onClick={handleClear}>
                                {t("issues.clearFilters")}
                            </Button>
                        </li>
                    )}
                </ul>
            ) : null}

            <SaveViewDialog isOpen={saveOpen} onOpenChange={setSaveOpen} query={query} />
        </div>
    );
}

interface FilterSectionProps {
    filterKey: FilterKey;
    heading: string;
    options: FilterOption[];
    query: IssueQuery;
    onChange: (key: FilterKey, keys: Selection) => void;
}

function FilterSection({ filterKey, heading, options, query, onChange }: FilterSectionProps) {
    function handleSelectionChange(keys: Selection) {
        onChange(filterKey, keys);
    }

    return (
        <AriaMenuSection
            selectionMode="multiple"
            selectedKeys={query[filterKey].map((value) => `${filterKey}:${value}`)}
            onSelectionChange={handleSelectionChange}
        >
            <AriaHeader className={SECTION_HEADER}>{heading}</AriaHeader>
            {options.map((option) => (
                <Dropdown.Item key={option.id} id={`${filterKey}:${option.id}`} textValue={option.label} selectionIndicator="checkbox">
                    <span className="flex items-center gap-2">
                        {option.icon}
                        <span className="truncate">{option.label}</span>
                    </span>
                </Dropdown.Item>
            ))}
        </AriaMenuSection>
    );
}

function FilterChip({ chip, removeLabel, onRemove }: { chip: Chip; removeLabel: string; onRemove: (chip: Chip) => void }) {
    function handlePress() {
        onRemove(chip);
    }

    return (
        <li>
            <span className="inline-flex items-center gap-1 rounded-md bg-secondary py-0.5 pr-1 pl-2 text-xs font-medium text-secondary ring-1 ring-secondary ring-inset">
                {chip.label}
                <AriaButton
                    aria-label={removeLabel}
                    className="cursor-pointer rounded p-0.5 text-fg-quaternary outline-focus-ring hover:text-fg-secondary focus-visible:outline-2"
                    onPress={handlePress}
                >
                    <XClose aria-hidden="true" className="size-3" />
                </AriaButton>
            </span>
        </li>
    );
}
