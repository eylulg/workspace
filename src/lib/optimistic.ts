import type { IssueSummary, Status } from "./domain";
import { sortOrderBetween } from "./issue-query";

export type IssuePatch = Partial<Pick<IssueSummary, "status" | "priority" | "assigneeId" | "projectId" | "labelIds" | "dueDate" | "title">>;

export type OptimisticAction =
    | { type: "update"; id: string; patch: IssuePatch }
    | { type: "move"; id: string; status: Status; afterId: string | null }
    | { type: "remove"; id: string }
    | { type: "add"; issue: IssueSummary };

/** Applies a pending change to the list the server sent, so the UI updates before the action returns. */
export function applyOptimistic(issues: IssueSummary[], action: OptimisticAction): IssueSummary[] {
    const now = new Date().toISOString();
    switch (action.type) {
        case "update":
            return issues.map((issue) => (issue.id === action.id ? { ...issue, ...action.patch, updatedAt: now } : issue));
        case "remove":
            return issues.filter((issue) => issue.id !== action.id);
        case "add":
            return [...issues, action.issue];
        case "move": {
            const moving = issues.find((issue) => issue.id === action.id);
            if (!moving) return issues;
            const column = issues
                .filter((issue) => issue.status === action.status && issue.teamId === moving.teamId && issue.id !== action.id)
                .sort((a, b) => a.sortOrder - b.sortOrder);
            const afterIndex = action.afterId ? column.findIndex((issue) => issue.id === action.afterId) : -1;
            const before = afterIndex >= 0 ? (column[afterIndex]?.sortOrder ?? null) : null;
            const next = column[afterIndex + 1]?.sortOrder ?? null;
            const sortOrder = sortOrderBetween(before, next);
            return issues.map((issue) => (issue.id === action.id ? { ...issue, status: action.status, sortOrder, updatedAt: now } : issue));
        }
    }
}
