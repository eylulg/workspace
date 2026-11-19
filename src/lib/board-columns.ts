import type { KeyboardCoordinateGetter, UniqueIdentifier } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { type IssueSummary, STATUSES, type Status } from './domain';

/** Issue ids per status, in the order the board shows them. */
export type Columns = Record<Status, string[]>;

export const COLUMN_PREFIX = 'column:';

export function toColumns(issues: IssueSummary[]): Columns {
  const columns: Columns = {
    backlog: [],
    todo: [],
    in_progress: [],
    in_review: [],
    done: [],
    canceled: [],
  };
  for (const issue of issues) columns[issue.status].push(issue.id);
  return columns;
}

export const columnOf = (id: UniqueIdentifier | undefined, columns: Columns): Status | null => {
  if (id === undefined) return null;
  const value = String(id);
  if (value.startsWith(COLUMN_PREFIX))
    return STATUSES.find((status) => status === value.slice(COLUMN_PREFIX.length)) ?? null;
  return STATUSES.find((status) => columns[status].includes(value)) ?? null;
};

/**
 * Issues from different teams can share a column, but order is kept per team.
 * The moved issue lands after the closest card above it from the same team.
 */
export const anchorFor = (
  id: string,
  column: string[],
  byId: Map<string, IssueSummary>,
): string | null => {
  const teamId = byId.get(id)?.teamId;
  for (let index = column.indexOf(id) - 1; index >= 0; index--) {
    const candidate = column[index];
    if (candidate !== undefined && byId.get(candidate)?.teamId === teamId) return candidate;
  }
  return null;
};

/**
 * Arrow up and down move within a column as usual. dnd-kit's sortable getter does not cross
 * side by side columns, so arrow left and right jump to the top of the neighbouring column,
 * found from where the dragged card currently is.
 */
export function columnKeyboardCoordinates(statuses: readonly Status[]): KeyboardCoordinateGetter {
  return (event, args) => {
    const step = event.code === 'ArrowRight' ? 1 : event.code === 'ArrowLeft' ? -1 : 0;
    if (step === 0) return sortableKeyboardCoordinates(event, args);
    const { collisionRect, droppableRects } = args.context;
    if (!collisionRect) return undefined;
    const centre = collisionRect.left + collisionRect.width / 2;
    const rects = statuses.map((status) => droppableRects.get(`${COLUMN_PREFIX}${status}`));
    const current = rects.findIndex(
      (rect) => rect !== undefined && rect.left <= centre && centre <= rect.right,
    );
    const target = rects[current + step];
    if (current === -1 || !target) return undefined;
    event.preventDefault();
    return { x: target.left + (target.width - collisionRect.width) / 2, y: target.top };
  };
}

/**
 * Where a dragged card lands when it is over `overId`: its column and the column's new order.
 * Dropping on a card in another column puts it above that card; dropping on a column puts it last.
 * Computed from the columns before the drag, so it never depends on half applied drag state.
 */
export function projectDrop(
  columns: Columns,
  activeId: string,
  overId: UniqueIdentifier,
): { status: Status; column: string[] } | null {
  const from = columnOf(activeId, columns);
  const to = columnOf(overId, columns);
  if (!from || !to) return null;
  const over = String(overId);
  if (from === to) {
    const column = columns[to];
    const overIndex = column.indexOf(over);
    return {
      status: to,
      column: overIndex === -1 ? column : arrayMove(column, column.indexOf(activeId), overIndex),
    };
  }
  const column = columns[to].filter((id) => id !== activeId);
  const overIndex = column.indexOf(over);
  column.splice(overIndex === -1 ? column.length : overIndex, 0, activeId);
  return { status: to, column };
}
