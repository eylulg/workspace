import { ToastProvider } from "@eylulg/ui/toast";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { type IssueIndexEntry, WorkspaceProvider } from "@/features/workspace/workspace-context";
import type { WorkspaceData } from "@/lib/domain";
import { workspaceData } from "./fixtures";
import messages from "../../messages/en.json";

/** Renders a feature the way the app shell does: English messages and the demo workspace in context. */
export function renderInWorkspace(
    ui: ReactElement,
    { data = workspaceData, issueIndex = [] }: { data?: WorkspaceData; issueIndex?: IssueIndexEntry[] } = {},
) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Amsterdam">
            <ToastProvider>
                <WorkspaceProvider data={data} issueIndex={issueIndex}>
                    {ui}
                </WorkspaceProvider>
            </ToastProvider>
        </NextIntlClientProvider>,
    );
}
