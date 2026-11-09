import type { ReactNode } from "react";
import { WorkspaceProvider } from "@/features/workspace/workspace-context";
import { getWorkspaceData, getWorkspaceIssues } from "@/server/queries";
import { getViewer } from "@/server/session";
import { WorkspaceChrome } from "./workspace-chrome";

/** Server component: loads the workspace once per request and hands it to the client chrome. */
export async function AppShell({ children }: { children: ReactNode }) {
    const viewer = await getViewer();
    const data = await getWorkspaceData(viewer.workspaceId, viewer.memberId);
    const issues = await getWorkspaceIssues(data);
    const issueIndex = issues.map(({ id, identifier, title, status, priority, assigneeId, teamId }) => ({
        id,
        identifier,
        title,
        status,
        priority,
        assigneeId,
        teamId,
    }));
    return (
        <WorkspaceProvider data={data} issueIndex={issueIndex}>
            <WorkspaceChrome>{children}</WorkspaceChrome>
        </WorkspaceProvider>
    );
}

export const ShellFallback = () => (
    <div className="flex min-h-dvh bg-primary" aria-busy="true">
        <div className="hidden w-64 shrink-0 border-r border-secondary lg:block" />
        <div className="flex-1 p-8">
            <div className="h-8 w-48 animate-pulse rounded-md bg-secondary motion-reduce:animate-none" />
            <div className="mt-6 flex flex-col gap-2">
                {Array.from({ length: 8 }, (_, index) => (
                    <div key={index} className="bg-secondary_subtle h-10 animate-pulse rounded-md motion-reduce:animate-none" />
                ))}
            </div>
        </div>
    </div>
);
