import type { UniqueIdentifier } from "@dnd-kit/core";
import { type IssueSummary, STATUSES, type Status } from "./domain";

/** Issue ids per status, in the order the board shows them. */
export type Columns = Record<Status, string[]>;

export const COLUMN_PREFIX = "column:";

export function toColumns(issues: IssueSummary[]): Columns {
    const columns: Columns = { backlog: [], todo: [], in_progress: [], in_review: [], done: [], canceled: [] };
    for (const issue of issues) columns[issue.status].push(issue.id);
    return columns;
}

export const columnOf = (id: UniqueIdentifier | undefined, columns: Columns): Status | null => {
    if (id === undefined) return null;
    const value = String(id);
    if (value.startsWith(COLUMN_PREFIX)) return STATUSES.find((status) => status === value.slice(COLUMN_PREFIX.length)) ?? null;
    return STATUSES.find((status) => columns[status].includes(value)) ?? null;
};

/**
 * Issues from different teams can share a column, but order is kept per team.
 * The moved issue lands after the closest card above it from the same team.
 */
export const anchorFor = (id: string, column: string[], byId: Map<string, IssueSummary>): string | null => {
    const teamId = byId.get(id)?.teamId;
    for (let index = column.indexOf(id) - 1; index >= 0; index--) {
        const candidate = column[index];
        if (candidate !== undefined && byId.get(candidate)?.teamId === teamId) return candidate;
    }
    return null;
};
