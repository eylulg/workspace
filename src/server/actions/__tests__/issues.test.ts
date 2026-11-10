import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/server/db/client";
import { getIssueDetail, getWorkspaceData, getWorkspaceIssues } from "@/server/queries";
import { getViewer } from "@/server/session";
import { resetDemo, useTestDatabase } from "@/test-utils/test-db";
import { addComment, createIssue, deleteIssue, moveIssue, restoreIssue, updateIssue } from "../issues";

// Next.js request and cache APIs are the platform boundary; the database and the actions are real.
const updateTag = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ updateTag, cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("next/headers", async () => ({ cookies: (await import("@/test-utils/test-db")).testCookies }));
vi.mock("next/server", () => ({ connection: async () => {} }));

let db: Database;

async function workspace() {
    const viewer = await getViewer();
    const data = await getWorkspaceData(viewer.workspaceId, viewer.memberId);
    const issues = await getWorkspaceIssues(data);
    const web = data.teams.find((team) => team.key === "WEB");
    if (!web) throw new Error("The fixture has a WEB team");
    const issue = (identifier: string) => {
        const found = issues.find((item) => item.identifier === identifier);
        if (!found) throw new Error(`No issue ${identifier}`);
        return found;
    };
    return { data, issues, web, issue };
}

beforeAll(async () => {
    db = await useTestDatabase();
});

beforeEach(async () => {
    await resetDemo(db);
    updateTag.mockClear();
});

describe("createIssue", () => {
    it("gives the issue the next number of its team, puts it at the top of its column and refreshes the team", async () => {
        const { web, issues } = await workspace();
        const topOfTodo = Math.min(
            ...issues.filter((issue) => issue.teamId === web.id && issue.status === "todo").map((issue) => issue.sortOrder),
        );

        const result = await createIssue({ teamId: web.id, title: "  Export fails for large files  ", status: "todo", priority: 2 });

        expect(result).toEqual({ ok: true, data: { id: expect.any(String), identifier: "WEB-31" } });
        const created = (await workspace()).issue("WEB-31");
        expect(created).toMatchObject({ title: "Export fails for large files", status: "todo", priority: 2 });
        expect(created.sortOrder).toBeLessThan(topOfTodo);
        expect(updateTag).toHaveBeenCalledWith(`team:${web.id}`);
    });

    it.each([
        ["a blank title", { title: "   " }, "titleRequired"],
        ["a title over 120 characters", { title: "word ".repeat(30) }, "titleTooLong"],
        ["a word too long to wrap", { title: "x".repeat(61) }, "wordTooLong"],
        ["a label from another workspace", { title: "Valid", labelIds: ["00000000-0000-4000-8000-000000000000"] }, "notFound"],
    ])("rejects %s without writing", async (_name, input, error) => {
        const { web, issues } = await workspace();

        const result = await createIssue({ teamId: web.id, ...input });

        expect(result).toEqual({ ok: false, error });
        expect((await workspace()).issues).toHaveLength(issues.length);
    });
});

describe("updateIssue", () => {
    it("saves the changed fields and logs one activity entry per change", async () => {
        const { issue, web } = await workspace();
        const target = issue("WEB-3");

        await updateIssue({ id: target.id, patch: { status: "in_progress", priority: 1, title: target.title } });

        const detail = await getIssueDetail(web.id, 3);
        expect(detail?.issue).toMatchObject({ status: "in_progress", priority: 1 });
        expect(detail?.activity.map((entry) => [entry.kind, entry.fromValue, entry.toValue])).toEqual([
            ["created", null, null],
            ["status", "todo", "in_progress"],
            ["priority", "2", "1"],
        ]);
    });

    it("replaces the label set", async () => {
        const { issue, data } = await workspace();
        const design = data.labels.find((label) => label.name === "Design");

        await updateIssue({ id: issue("WEB-1").id, patch: { labelIds: design ? [design.id] : [] } });

        expect((await workspace()).issue("WEB-1").labelIds).toEqual([design?.id]);
    });
});

describe("moveIssue", () => {
    it("moves an issue to another column right after the card it was dropped below", async () => {
        const { issue, web } = await workspace();
        const moving = issue("WEB-3");
        const anchor = issue("WEB-4");
        const done = (await workspace()).issues
            .filter((item) => item.teamId === web.id && item.status === "done")
            .sort((a, b) => a.sortOrder - b.sortOrder);
        const next = done[done.findIndex((item) => item.id === anchor.id) + 1];

        const result = await moveIssue({ id: moving.id, status: "done", afterId: anchor.id });

        expect(result.ok).toBe(true);
        const moved = (await workspace()).issue("WEB-3");
        expect(moved.status).toBe("done");
        expect(moved.sortOrder).toBeGreaterThan(anchor.sortOrder);
        if (next) expect(moved.sortOrder).toBeLessThan(next.sortOrder);
        expect((await getIssueDetail(web.id, 3))?.activity.at(-1)).toMatchObject({ kind: "status", fromValue: "todo", toValue: "done" });
    });

    it("refuses an anchor that is not in the target column", async () => {
        const { issue } = await workspace();

        const result = await moveIssue({ id: issue("WEB-3").id, status: "done", afterId: issue("WEB-1").id });

        expect(result).toEqual({ ok: false, error: "notFound" });
    });
});

describe("deleteIssue and restoreIssue", () => {
    it("hides a deleted issue and brings it back with its comments when undone", async () => {
        const { issue, issues, web } = await workspace();
        const target = issue("WEB-1");

        await deleteIssue({ id: target.id });
        const afterDelete = await workspace();
        await restoreIssue({ id: target.id });

        expect(afterDelete.issues).toHaveLength(issues.length - 1);
        expect(await getIssueDetail(web.id, 1)).toMatchObject({ issue: { id: target.id }, comments: [{}, {}] });
        expect((await getIssueDetail(web.id, 1))?.activity.slice(-2).map((entry) => entry.kind)).toEqual(["deleted", "restored"]);
    });

    it("cannot delete the same issue twice", async () => {
        const { issue } = await workspace();
        await deleteIssue({ id: issue("WEB-1").id });

        const result = await deleteIssue({ id: issue("WEB-1").id });

        expect(result).toEqual({ ok: false, error: "notFound" });
    });
});

describe("addComment", () => {
    it("adds the comment as the current member", async () => {
        const { issue, web } = await workspace();
        const viewer = await getViewer();

        await addComment({ issueId: issue("WEB-2").id, body: "Looks good on mobile." });

        expect((await getIssueDetail(web.id, 2))?.comments).toEqual([
            expect.objectContaining({ body: "Looks good on mobile.", authorId: viewer.memberId }),
        ]);
    });
});
