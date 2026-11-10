"use client";

import { useToast } from "@eylulg/ui/toast";
import { useTranslations } from "next-intl";
import { startTransition as startGlobalTransition, useTransition } from "react";
import { track } from "@/features/analytics/analytics";
import { useActionToast } from "@/features/toast/use-action-toast";
import type { ActionResult } from "@/lib/action-result";
import type { IssueSummary, Status } from "@/lib/domain";
import type { IssuePatch, OptimisticAction } from "@/lib/optimistic";
import { deleteIssue, moveIssue, restoreIssue, updateIssue } from "@/server/actions/issues";

type Apply = (action: OptimisticAction) => void;

/**
 * Wraps the issue Server Actions with optimistic updates. `apply` comes from the
 * `useOptimistic` hook of the view that renders the issues; while the action runs
 * React shows the optimistic list, and when it settles the server render takes over
 * (or the change rolls back on failure and a toast explains why).
 */
export function useIssueMutations(apply: Apply | null) {
    const t = useTranslations();
    const { toast } = useToast();
    const showActionToast = useActionToast();
    const [isPending, startTransition] = useTransition();

    const report = (result: ActionResult<unknown>) => {
        if (!result.ok) toast({ title: t(`errors.${result.error}`), variant: "error" });
        return result.ok;
    };

    const run = (optimistic: OptimisticAction | null, action: () => Promise<ActionResult<unknown>>, onSuccess?: () => void) => {
        startTransition(async () => {
            if (optimistic && apply) apply(optimistic);
            try {
                if (report(await action())) onSuccess?.();
            } catch {
                toast({ title: t("errors.unknown"), variant: "error" });
            }
        });
    };

    const update = (issue: Pick<IssueSummary, "id" | "identifier" | "status">, patch: IssuePatch) => {
        run(
            { type: "update", id: issue.id, patch },
            () => updateIssue({ id: issue.id, patch }),
            () => {
                if (patch.status && patch.status !== issue.status)
                    track("status_changed", { from: issue.status, to: patch.status, via: "menu" });
            },
        );
    };

    const move = (issue: Pick<IssueSummary, "id" | "status">, status: Status, afterId: string | null) => {
        run(
            { type: "move", id: issue.id, status, afterId },
            () => moveIssue({ id: issue.id, status, afterId }),
            () => {
                if (status !== issue.status) track("status_changed", { from: issue.status, to: status, via: "board" });
            },
        );
    };

    // Undo can fire after the view that deleted the issue has unmounted, so it uses the global transition.
    const restore = (issue: Pick<IssueSummary, "id" | "identifier">) => {
        startGlobalTransition(async () => {
            const result = await restoreIssue({ id: issue.id }).catch(() => null);
            if (!result) toast({ title: t("errors.unknown"), variant: "error" });
            else if (report(result)) toast({ title: t("issue.restored", { identifier: issue.identifier }), variant: "success" });
        });
    };

    const remove = (issue: Pick<IssueSummary, "id" | "identifier">, onDeleted?: () => void) => {
        run(
            { type: "remove", id: issue.id },
            () => deleteIssue({ id: issue.id }),
            () => {
                onDeleted?.();
                showActionToast({
                    title: t("issue.deleted", { identifier: issue.identifier }),
                    action: { label: t("common.undo"), onAction: () => restore(issue) },
                });
            },
        );
    };

    return { update, move, remove, restore, isPending };
}
