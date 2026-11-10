"use client";

import {
    type Announcements,
    DndContext,
    type DragEndEvent,
    type DragOverEvent,
    DragOverlay,
    type DragStartEvent,
    KeyboardSensor,
    PointerSensor,
    type UniqueIdentifier,
    closestCorners,
    useDroppable,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DotsGrid } from "@untitledui/icons";
import { useTranslations } from "next-intl";
import { type ReactNode, startTransition, useRef, useState } from "react";
import { DueDate } from "@/features/issues/due-date";
import { LabelDot, StatusIcon } from "@/features/issues/issue-icons";
import { AssigneeMenu, PriorityMenu, StatusMenu } from "@/features/issues/property-menus";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { Link } from "@/i18n/navigation";
import { COLUMN_PREFIX, type Columns, anchorFor, columnKeyboardCoordinates, columnOf, projectDrop, toColumns } from "@/lib/board-columns";
import { type IssueSummary, type Priority, STATUSES, type Status } from "@/lib/domain";
import type { IssuePatch } from "@/lib/optimistic";
import { cx } from "@/utils/cx";

interface BoardProps {
    issues: IssueSummary[];
    /** Status filter from the URL. Empty shows every column. */
    statuses: Status[];
    onMove: (issue: IssueSummary, status: Status, afterId: string | null) => void;
    onUpdate: (issue: IssueSummary, patch: IssuePatch) => void;
}

function removeId(columns: Columns, id: string): Columns {
    return {
        backlog: columns.backlog.filter((item) => item !== id),
        todo: columns.todo.filter((item) => item !== id),
        in_progress: columns.in_progress.filter((item) => item !== id),
        in_review: columns.in_review.filter((item) => item !== id),
        done: columns.done.filter((item) => item !== id),
        canceled: columns.canceled.filter((item) => item !== id),
    };
}

export function Board({ issues, statuses, onMove, onUpdate }: BoardProps) {
    const t = useTranslations();
    const visible = statuses.length ? STATUSES.filter((status) => statuses.includes(status)) : STATUSES;
    const byId = new Map(issues.map((issue) => [issue.id, issue]));
    const baseColumns = toColumns(issues);
    // While a card is dragged the board renders this local copy, so hovering another column moves the card there.
    const [dragColumns, setDragColumns] = useState<Columns | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const lastDrop = useRef<ReturnType<typeof projectDrop>>(null);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: columnKeyboardCoordinates(visible) }),
    );
    const columns = dragColumns ?? baseColumns;
    const activeIssue = activeId ? byId.get(activeId) : undefined;

    /**
     * Once the card sits in a new column it is often "over" itself. That says nothing about where it
     * should go, so the last real target is kept and reused.
     */
    function dropFor(activeId: UniqueIdentifier, overId: UniqueIdentifier | undefined) {
        if (overId === undefined) return null;
        if (overId === activeId) return lastDrop.current;
        return projectDrop(baseColumns, String(activeId), overId);
    }

    function describe(activeId: UniqueIdentifier, overId: UniqueIdentifier | undefined) {
        const id = String(activeId);
        const issue = byId.get(id);
        const drop = dropFor(activeId, overId);
        const status = drop?.status ?? columnOf(id, baseColumns);
        const column = drop?.column ?? (status ? baseColumns[status] : []);
        return {
            title: issue ? `${issue.identifier} ${issue.title}` : id,
            column: status ? t(`status.${status}`) : "",
            position: column.indexOf(id) + 1,
            total: column.length,
        };
    }

    const announcements: Announcements = {
        onDragStart: ({ active }) => t("board.pickedUp", describe(active.id, undefined)),
        onDragOver: ({ active, over }) =>
            over ? t("board.movedTo", describe(active.id, over.id)) : t("board.notOver", describe(active.id, undefined)),
        onDragEnd: ({ active, over }) =>
            over ? t("board.dropped", describe(active.id, over.id)) : t("board.droppedNowhere", describe(active.id, undefined)),
        onDragCancel: ({ active }) => t("board.cancelled", describe(active.id, undefined)),
    };

    function handleDragStart({ active }: DragStartEvent) {
        lastDrop.current = null;
        setActiveId(String(active.id));
    }

    // Shows the card in the hovered column while dragging.
    function handleDragOver({ active, over }: DragOverEvent) {
        if (!over || over.id === active.id) return;
        const drop = projectDrop(baseColumns, String(active.id), over.id);
        if (!drop) return;
        lastDrop.current = drop;
        setDragColumns({ ...removeId(baseColumns, String(active.id)), [drop.status]: drop.column });
    }

    function handleDragEnd({ active, over }: DragEndEvent) {
        const id = String(active.id);
        const issue = byId.get(id);
        const drop = dropFor(active.id, over?.id) ?? (over?.id === active.id ? projectDrop(baseColumns, id, id) : null);
        setActiveId(null);
        if (!issue || !drop) {
            setDragColumns(null);
            return;
        }
        const afterId = anchorFor(id, drop.column, byId);
        const unchanged = drop.status === issue.status && afterId === anchorFor(id, baseColumns[drop.status], byId);
        if (!unchanged) onMove(issue, drop.status, afterId);
        // Dropping the local copy in a transition lets React swap it for the optimistic list in the same render.
        startTransition(() => setDragColumns(null));
    }

    function handleDragCancel() {
        setDragColumns(null);
        setActiveId(null);
    }

    // The board is a grid, not a horizontal scroller: dnd-kit's keyboard sensor scrolls a scroller instead of moving the card.
    return (
        <DndContext
            id="issue-board"
            sensors={sensors}
            collisionDetection={closestCorners}
            accessibility={{ announcements, screenReaderInstructions: { draggable: t("board.instructions") } }}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                {visible.map((status) => (
                    <BoardColumn key={status} status={status} ids={columns[status]} byId={byId} onUpdate={onUpdate} />
                ))}
            </div>
            <DragOverlay>{activeIssue ? <CardBody issue={activeIssue} isOverlay handle={<HandleIcon />} /> : null}</DragOverlay>
        </DndContext>
    );
}

function BoardColumn({
    status,
    ids,
    byId,
    onUpdate,
}: {
    status: Status;
    ids: string[];
    byId: Map<string, IssueSummary>;
    onUpdate: BoardProps["onUpdate"];
}) {
    const t = useTranslations();
    const { setNodeRef, isOver } = useDroppable({ id: `${COLUMN_PREFIX}${status}` });
    const headingId = `board-column-${status}`;
    return (
        <section aria-labelledby={headingId} className="bg-secondary_subtle flex min-w-0 flex-col rounded-xl ring-1 ring-secondary">
            <h2 id={headingId} className="flex items-center gap-2 px-3 pt-3 pb-2 text-sm font-semibold text-primary">
                <StatusIcon status={status} />
                {t(`status.${status}`)}
                <span className="font-normal text-tertiary">{ids.length}</span>
            </h2>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <ul
                    ref={setNodeRef}
                    aria-labelledby={headingId}
                    className={cx(
                        "flex min-h-24 flex-1 flex-col gap-2 rounded-b-xl px-2 pb-2 transition-colors",
                        isOver && "bg-primary_hover",
                    )}
                >
                    {ids.map((id) => {
                        const issue = byId.get(id);
                        return issue ? <SortableCard key={id} issue={issue} onUpdate={onUpdate} /> : null;
                    })}
                    {ids.length === 0 && <li className="px-2 py-6 text-center text-xs text-tertiary">{t("board.emptyColumn")}</li>}
                </ul>
            </SortableContext>
        </section>
    );
}

function HandleIcon() {
    return (
        <span className="flex size-7 shrink-0 items-center justify-center text-fg-quaternary">
            <DotsGrid aria-hidden="true" className="size-4" />
        </span>
    );
}

function SortableCard({ issue, onUpdate }: { issue: IssueSummary; onUpdate: BoardProps["onUpdate"] }) {
    const t = useTranslations("board");
    const { setActiveIssue } = useWorkspace();
    function handleActivate() {
        setActiveIssue(issue);
    }
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
        id: issue.id,
        attributes: { roleDescription: t("roleDescription") },
    });
    return (
        <li
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            className={cx(isDragging && "opacity-40")}
            data-issue-row
            onFocusCapture={handleActivate}
            onPointerEnter={handleActivate}
        >
            <CardBody
                issue={issue}
                onUpdate={onUpdate}
                handle={
                    <button
                        ref={setActivatorNodeRef}
                        type="button"
                        {...attributes}
                        {...listeners}
                        aria-label={t("dragHandle", { identifier: issue.identifier, title: issue.title })}
                        className="flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-fg-quaternary outline-focus-ring hover:bg-primary_hover hover:text-fg-secondary focus-visible:outline-2 active:cursor-grabbing"
                    >
                        <DotsGrid aria-hidden="true" className="size-4" />
                    </button>
                }
            />
        </li>
    );
}

function CardBody({
    issue,
    handle,
    onUpdate,
    isOverlay,
}: {
    issue: IssueSummary;
    handle: ReactNode;
    onUpdate?: BoardProps["onUpdate"];
    isOverlay?: boolean;
}) {
    const { data } = useWorkspace();
    const labels = data.labels.filter((label) => issue.labelIds.includes(label.id));
    return (
        <article className={cx("flex gap-1 rounded-lg bg-primary p-2 shadow-xs ring-1 ring-secondary", isOverlay && "rotate-1 shadow-lg")}>
            {handle}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-1">
                <span className="text-xs text-tertiary tabular-nums">{issue.identifier}</span>
                {isOverlay ? (
                    <span className="text-sm font-medium text-primary">{issue.title}</span>
                ) : (
                    <Link
                        href={`/issue/${issue.identifier}`}
                        data-issue-link
                        className="rounded-sm text-sm font-medium text-primary outline-focus-ring hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                        {issue.title}
                    </Link>
                )}
                {labels.length > 0 && (
                    <span className="flex flex-wrap gap-x-2 gap-y-1">
                        {labels.map((label) => (
                            <span key={label.id} className="inline-flex items-center gap-1 text-xs text-tertiary">
                                <LabelDot color={label.color} />
                                {label.name}
                            </span>
                        ))}
                    </span>
                )}
                <div className="-ml-1.5 flex items-center gap-0.5">{onUpdate ? <CardMenus issue={issue} onUpdate={onUpdate} /> : null}</div>
            </div>
        </article>
    );
}

function CardMenus({ issue, onUpdate }: { issue: IssueSummary; onUpdate: BoardProps["onUpdate"] }) {
    function handleStatus(status: Status) {
        onUpdate(issue, { status });
    }
    function handlePriority(priority: Priority) {
        onUpdate(issue, { priority });
    }
    function handleAssignee(assigneeId: string | null) {
        onUpdate(issue, { assigneeId });
    }
    return (
        <>
            <StatusMenu compact value={issue.status} onChange={handleStatus} />
            <PriorityMenu compact value={issue.priority} onChange={handlePriority} />
            <DueDate dueDate={issue.dueDate} status={issue.status} className="ml-1" />
            <AssigneeMenu compact value={issue.assigneeId} onChange={handleAssignee} className="ml-auto" />
        </>
    );
}
