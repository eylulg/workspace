import { describe, expect, it } from "vitest";
import { makeIssue, workspaceData } from "@/test-utils/fixtures";
import { filterIssues, groupIssues, limitGroups, parseIssueQuery, serializeIssueQuery, sortIssues, sortOrderBetween } from "../issue-query";

describe("parseIssueQuery", () => {
    it("drops values it does not know and falls back to defaults", () => {
        const query = parseIssueQuery(new URLSearchParams("view=grid&group=colour&sort=random&status=todo,nope&priority=1,9,x"));

        expect(query).toMatchObject({ view: "list", group: "status", sort: "manual", status: ["todo"], priority: [1] });
    });

    it("round trips through serializeIssueQuery and leaves defaults out of the URL", () => {
        const search = "team=WEB&view=board&sort=priority&status=todo,done&priority=1,2&q=checklist";

        const serialized = serializeIssueQuery(parseIssueQuery(new URLSearchParams(search)));

        expect(serialized).toBe(search);
        expect(serializeIssueQuery(parseIssueQuery(new URLSearchParams("group=status&view=list")))).toBe("");
    });
});

describe("filterIssues", () => {
    const issues = [
        makeIssue({ number: 1, status: "todo", priority: 1, assigneeId: workspaceData.members[1]?.id ?? null, labelIds: ["bug"] }),
        makeIssue({ number: 2, status: "done", priority: 3, title: "Polish the board" }),
        makeIssue({ number: 3, teamId: workspaceData.teams[1]?.id, status: "todo", priority: 0 }),
    ];

    it.each([
        ["team", "team=PLT", ["PLT-3"]],
        ["status", "status=done", ["WEB-2"]],
        ["priority", "priority=1,3", ["WEB-1", "WEB-2"]],
        ["unassigned", "assignee=none", ["WEB-2", "PLT-3"]],
        ["label", "label=bug", ["WEB-1"]],
        ["title search", "q=board", ["WEB-2"]],
        ["identifier search", "q=plt-3", ["PLT-3"]],
    ])("filters by %s", (_name, search, expected) => {
        const result = filterIssues(issues, parseIssueQuery(new URLSearchParams(search)), workspaceData.teams);

        expect(result.map((issue) => issue.identifier)).toEqual(expected);
    });
});

describe("sortIssues", () => {
    it.each([
        ["priority, with no priority last", "priority", ["WEB-2", "WEB-3", "WEB-1"]],
        ["due date, with no due date last", "due", ["WEB-3", "WEB-1", "WEB-2"]],
        ["manual order", "manual", ["WEB-1", "WEB-2", "WEB-3"]],
    ] as const)("sorts by %s", (_name, sort, expected) => {
        const issues = [
            makeIssue({ number: 1, priority: 0, dueDate: "2026-12-01" }),
            makeIssue({ number: 2, priority: 1 }),
            makeIssue({ number: 3, priority: 2, dueDate: "2026-11-20" }),
        ];

        expect(sortIssues(issues, sort).map((issue) => issue.identifier)).toEqual(expected);
    });
});

describe("groupIssues", () => {
    it("keeps the fixed group order and leaves out empty groups", () => {
        const issues = [makeIssue({ number: 1, status: "done" }), makeIssue({ number: 2, status: "backlog" })];

        const groups = groupIssues(issues, "status", []);

        expect(groups.map((group) => group.key)).toEqual(["backlog", "done"]);
    });

    it("puts unassigned issues in a last group when grouping by assignee", () => {
        const ada = workspaceData.members[1]?.id ?? "";
        const issues = [makeIssue({ number: 1 }), makeIssue({ number: 2, assigneeId: ada })];

        const groups = groupIssues(issues, "assignee", [ada]);

        expect(groups.map((group) => group.key)).toEqual([ada, "none"]);
    });
});

describe("sortOrderBetween", () => {
    it.each([
        [null, null, 1000],
        [null, 2000, 1000],
        [3000, null, 4000],
        [1000, 2000, 1500],
    ])("between %s and %s is %s", (before, after, expected) => {
        expect(sortOrderBetween(before, after)).toBe(expected);
    });
});

describe("limitGroups", () => {
    it("keeps the first issues across groups and drops the groups left empty", () => {
        const issues = [
            makeIssue({ number: 1, status: "backlog" }),
            makeIssue({ number: 2, status: "backlog" }),
            makeIssue({ number: 3, status: "done" }),
        ];

        const groups = limitGroups(groupIssues(issues, "status", []), 1);

        expect(groups.map((group) => [group.key, group.issues.length])).toEqual([["backlog", 1]]);
    });
});
