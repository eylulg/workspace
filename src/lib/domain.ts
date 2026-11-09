/** Client safe domain types and constants. Mirrors the database enums in server/db/schema.ts. */
export const STATUSES = ["backlog", "todo", "in_progress", "in_review", "done", "canceled"] as const;
export type Status = (typeof STATUSES)[number];

/** Linear's scale: 1 is most urgent, 0 means no priority and sorts last. */
export const PRIORITIES = [1, 2, 3, 4, 0] as const;
export type Priority = (typeof PRIORITIES)[number];

type ProjectState = "planned" | "in_progress" | "completed";

export interface Team {
    id: string;
    key: string;
    name: string;
}

export interface Member {
    id: string;
    name: string;
    email: string;
    isGuest: boolean;
}

export interface Label {
    id: string;
    name: string;
    color: string;
}

export interface ProjectSummary {
    id: string;
    teamId: string;
    name: string;
    description: string;
    state: ProjectState;
    leadId: string | null;
    targetDate: string | null;
}

export interface SavedView {
    id: string;
    name: string;
    query: string;
}

export interface IssueSummary {
    id: string;
    identifier: string;
    teamId: string;
    number: number;
    title: string;
    status: Status;
    priority: Priority;
    assigneeId: string | null;
    projectId: string | null;
    labelIds: string[];
    dueDate: string | null;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

export interface WorkspaceData {
    workspaceId: string;
    viewerId: string;
    teams: Team[];
    members: Member[];
    labels: Label[];
    projects: ProjectSummary[];
    savedViews: SavedView[];
}

export const LABEL_COLORS = [
    "#d92d20",
    "#e04f16",
    "#dc6803",
    "#079455",
    "#0e9384",
    "#1570ef",
    "#444ce7",
    "#7f56d9",
    "#dd2590",
    "#667085",
] as const;

export const identifierOf = (teamKey: string, number: number) => `${teamKey}-${number}`;

/** Parses "WEB-12" into its team key and number. */
export function parseIdentifier(value: string): { teamKey: string; number: number } | null {
    const match = /^([A-Za-z]{2,5})-(\d{1,6})$/.exec(value.trim());
    const [, key, number] = match ?? [];
    return key && number ? { teamKey: key.toUpperCase(), number: Number(number) } : null;
}
