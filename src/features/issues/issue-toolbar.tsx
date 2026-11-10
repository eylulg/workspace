"use client";

import { Button } from "@eylulg/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSection } from "@eylulg/ui/dropdown-menu";
import { Input } from "@eylulg/ui/input";
import { Tag, TagGroup } from "@eylulg/ui/tag";
import { useToast } from "@eylulg/ui/toast";
import { Columns3, List, ListFilter, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, startTransition, useEffect, useState } from "react";
import type { Key, Selection } from "react-aria-components";
import { SegmentedControl } from "@/components/segmented-control";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { PRIORITIES, STATUSES } from "@/lib/domain";
import {
    CLEARED_FILTERS,
    GROUPINGS,
    type IssueQuery,
    SORTS,
    hasActiveFilters,
    parseIssueQuery,
    serializeIssueQuery,
} from "@/lib/issue-query";
import { deleteView } from "@/server/actions/views";
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

const chipId = (chip: Chip) => `${chip.key}:${chip.value}`;

interface ToolbarProps {
    query: IssueQuery;
    onChange: (patch: Partial<IssueQuery>) => void;
}

const FILTER_KEYS: FilterKey[] = ["status", "priority", "assignee", "label", "project"];
const SEARCH_DEBOUNCE_MS = 250;

/** Reads the one selected key of a single selection section, for example "group:status" into "status". */
function selectedSuffix(keys: Selection, prefix: string): string | null {
    if (keys === "all") return null;
    const [key] = [...keys];
    return key === undefined ? null : String(key).slice(prefix.length);
}

export function IssueToolbar({ query, onChange }: ToolbarProps) {
    const t = useTranslations();
    const { toast } = useToast();
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
            { id: "none", label: t("issue.unassigned"), icon: <MemberAvatar member={null} /> },
            ...data.members.map((member) => ({ id: member.id, label: member.name, icon: <MemberAvatar member={member} /> })),
        ],
        label: data.labels.map((label) => ({ id: label.id, label: label.name, icon: <LabelDot color={label.color} /> })),
        project: [
            { id: "none", label: t("issue.noProject"), icon: null },
            ...data.projects.map((project) => ({ id: project.id, label: project.name, icon: null })),
        ],
    };
    const currentQuery = serializeIssueQuery(query);
    const activeView = data.savedViews.find((view) => view.query === currentQuery);
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

    function handleViewChange(view: IssueQuery["view"]) {
        onChange({ view });
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

    function handleRemoveChips(keys: Set<Key>) {
        const removed = chips.filter((chip) => keys.has(chipId(chip)));
        for (const key of new Set(removed.map((chip) => chip.key))) {
            const remaining = query[key].filter((value) => !removed.some((chip) => chip.key === key && chip.value === String(value)));
            handleFilterChange(key, new Set<Key>(remaining.map((value) => `${key}:${value}`)));
        }
    }

    function handleDeleteView() {
        if (!activeView) return;
        const view = activeView;
        startTransition(async () => {
            const result = await deleteView({ id: view.id });
            toast(
                result.ok
                    ? { title: t("views.deleted", { name: view.name }), variant: "success" }
                    : { title: t(`errors.${result.error}`), variant: "error" },
            );
        });
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
                <SegmentedControl
                    label={t("issues.view")}
                    value={query.view}
                    onChange={handleViewChange}
                    options={[
                        { id: "list", label: t("issues.list"), icon: List },
                        { id: "board", label: t("issues.board"), icon: Columns3 },
                    ]}
                />

                <DropdownMenu>
                    <Button variant="secondary" size="sm" iconLeading={ListFilter}>
                        {t("issues.filter")}
                        {chips.length > 0 && (
                            <span className="rounded-full bg-brand-solid px-1.5 text-xs text-on-solid">{chips.length}</span>
                        )}
                    </Button>
                    <DropdownMenuContent aria-label={t("issues.filter")} popoverClassName="max-h-[70vh] w-64">
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
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <Button variant="secondary" size="sm" iconLeading={SlidersHorizontal}>
                        {t("issues.display")}
                    </Button>
                    <DropdownMenuContent aria-label={t("issues.display")} popoverClassName="w-56">
                        {query.view === "list" ? (
                            <DropdownMenuSection
                                title={t("issues.groupBy")}
                                selectionMode="single"
                                disallowEmptySelection
                                selectedKeys={[`group:${query.group}`]}
                                onSelectionChange={handleGroupChange}
                            >
                                {GROUPINGS.map((group) => (
                                    <DropdownMenuItem key={group} id={`group:${group}`} textValue={t(`issues.group.${group}`)}>
                                        {t(`issues.group.${group}`)}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuSection>
                        ) : null}
                        <DropdownMenuSection
                            title={t("issues.sortBy")}
                            selectionMode="single"
                            disallowEmptySelection
                            selectedKeys={[`sort:${query.sort}`]}
                            onSelectionChange={handleSortChange}
                        >
                            {SORTS.map((sort) => (
                                <DropdownMenuItem key={sort} id={`sort:${sort}`} textValue={t(`issues.sort.${sort}`)}>
                                    {t(`issues.sort.${sort}`)}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuSection>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Input
                    id="issue-search"
                    aria-label={t("issues.searchLabel")}
                    type="search"
                    size="sm"
                    iconLeading={Search}
                    placeholder={t("issues.searchPlaceholder")}
                    value={search}
                    onChange={setSearch}
                    className="min-w-0 flex-1 basis-48 sm:max-w-72"
                />

                {activeView ? (
                    <Button size="sm" variant="secondary" iconLeading={Trash2} onPress={handleDeleteView} className="ml-auto">
                        {t("views.delete", { name: activeView.name })}
                    </Button>
                ) : (
                    <Button size="sm" variant="secondary" onPress={handleOpenSave} className="ml-auto">
                        {t("issues.saveView")}
                    </Button>
                )}
            </div>

            {hasActiveFilters(query) ? (
                <div className="flex flex-wrap items-center gap-2">
                    {chips.length > 0 && (
                        <TagGroup aria-label={t("issues.activeFilters")} items={chips} onRemove={handleRemoveChips}>
                            {(chip) => <Tag id={chipId(chip)}>{chip.label}</Tag>}
                        </TagGroup>
                    )}
                    <Button size="sm" variant="tertiary" onPress={handleClear}>
                        {t("issues.clearFilters")}
                    </Button>
                </div>
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
        <DropdownMenuSection
            title={heading}
            selectionMode="multiple"
            selectedKeys={query[filterKey].map((value) => `${filterKey}:${value}`)}
            onSelectionChange={handleSelectionChange}
        >
            {options.map((option) => (
                <DropdownMenuItem key={option.id} id={`${filterKey}:${option.id}`} textValue={option.label}>
                    <span className="flex items-center gap-2">
                        {option.icon}
                        <span className="truncate">{option.label}</span>
                    </span>
                </DropdownMenuItem>
            ))}
        </DropdownMenuSection>
    );
}
