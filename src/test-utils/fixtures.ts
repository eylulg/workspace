import type { IssueSummary, WorkspaceData } from "@/lib/domain";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const ids = {
    workspace: id(1),
    web: id(2),
    platform: id(3),
    guest: id(10),
    ada: id(11),
    bug: id(20),
    feature: id(21),
};

export const workspaceData: WorkspaceData = {
    workspaceId: ids.workspace,
    viewerId: ids.guest,
    teams: [
        { id: ids.web, key: "WEB", name: "Web" },
        { id: ids.platform, key: "PLT", name: "Platform" },
    ],
    members: [
        { id: ids.guest, name: "Guest", email: "guest@example.com", isGuest: true },
        { id: ids.ada, name: "Ada Lindqvist", email: "ada@example.com", isGuest: false },
    ],
    labels: [
        { id: ids.bug, name: "Bug", color: "#d92d20" },
        { id: ids.feature, name: "Feature", color: "#7f56d9" },
    ],
    projects: [],
    savedViews: [],
};

export function makeIssue(overrides: Partial<IssueSummary> & { number: number }): IssueSummary {
    const teamKey = overrides.teamId === ids.platform ? "PLT" : "WEB";
    return {
        id: id(100 + overrides.number + (overrides.teamId === ids.platform ? 500 : 0)),
        identifier: `${teamKey}-${overrides.number}`,
        teamId: ids.web,
        title: `Issue ${overrides.number}`,
        status: "todo",
        priority: 0,
        assigneeId: null,
        projectId: null,
        labelIds: [],
        dueDate: null,
        sortOrder: overrides.number * 1000,
        createdAt: "2026-11-01T10:00:00.000Z",
        updatedAt: "2026-11-01T10:00:00.000Z",
        ...overrides,
    };
}
