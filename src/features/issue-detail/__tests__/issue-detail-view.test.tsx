import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceChrome } from "@/features/shell/workspace-chrome";
import { makeIssue } from "@/test-utils/fixtures";
import { router } from "@/test-utils/navigation-mock";
import { renderInWorkspace } from "@/test-utils/render";
import { IssueDetailView } from "../issue-detail-view";

const actions = vi.hoisted(() => ({ deleteIssue: vi.fn(), restoreIssue: vi.fn(), updateIssue: vi.fn() }));
vi.mock("@/server/actions/issues", () => ({
    ...actions,
    moveIssue: vi.fn(),
    createIssue: vi.fn(),
    addComment: vi.fn(),
}));

const issue = { ...makeIssue({ number: 4, title: "Empty states for board columns" }), description: "", creatorId: null };

describe("IssueDetailView", () => {
    it("shows a status change right away while the server is still answering", async () => {
        const user = userEvent.setup();
        let finish: (value: unknown) => void = () => {};
        actions.updateIssue.mockReturnValue(new Promise((resolve) => (finish = resolve)));
        renderInWorkspace(
            <WorkspaceChrome>
                <IssueDetailView detail={{ issue, comments: [], activity: [] }} teamKey="WEB" />
            </WorkspaceChrome>,
        );

        await user.click(screen.getByRole("button", { name: "Status: Todo" }));
        await user.click(await screen.findByRole("menuitemradio", { name: "Done" }));

        expect(await screen.findByRole("button", { name: "Status: Done" })).toBeInTheDocument();
        expect(actions.updateIssue).toHaveBeenCalledWith({ id: issue.id, patch: { status: "done" } });
        finish({ ok: true, data: { id: issue.id } });
    });

    it("deletes the issue, goes back to the list and restores it from the toast", async () => {
        const user = userEvent.setup();
        actions.deleteIssue.mockResolvedValue({ ok: true, data: { id: issue.id } });
        actions.restoreIssue.mockResolvedValue({ ok: true, data: { id: issue.id } });
        renderInWorkspace(
            <WorkspaceChrome>
                <IssueDetailView detail={{ issue, comments: [], activity: [] }} teamKey="WEB" />
            </WorkspaceChrome>,
        );

        await user.click(screen.getByRole("button", { name: "Delete issue" }));
        await user.click(await screen.findByRole("button", { name: "Undo" }));

        expect(router.push).toHaveBeenCalledWith("/en/issues?team=WEB");
        expect(actions.restoreIssue).toHaveBeenCalledWith({ id: issue.id });
        expect(await screen.findByText("Restored WEB-4")).toBeInTheDocument();
    });
});
