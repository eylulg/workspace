"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ChangeEvent, type FormEvent, type KeyboardEvent, useState, useTransition } from "react";
import { Heading as AriaHeading, type Key } from "react-aria-components";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import { track } from "@/features/analytics/analytics";
import { toastStore } from "@/features/toast/toast-store";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { useRouter } from "@/i18n/navigation";
import type { IssueSummary } from "@/lib/domain";
import { createIssue } from "@/server/actions/issues";
import { AssigneeMenu, LabelsMenu, PriorityMenu, ProjectMenu, StatusMenu } from "./property-menus";

type Draft = Pick<IssueSummary, "teamId" | "title" | "status" | "priority" | "assigneeId" | "projectId" | "labelIds"> & {
    description: string;
    dueDate: string;
};

export const DATE_INPUT_CLASS =
    "h-8 rounded-md bg-primary px-2 text-sm text-primary ring-1 ring-primary outline-focus-ring ring-inset focus-visible:outline-2";

export function CreateIssueDialog() {
    const { createOpen, setCreateOpen } = useWorkspace();

    function handleDone() {
        setCreateOpen(false);
    }

    return (
        <ModalOverlay isOpen={createOpen} onOpenChange={setCreateOpen} isDismissable>
            <Modal className="max-w-2xl">
                <Dialog aria-labelledby="create-issue-title">{createOpen ? <CreateIssueForm onDone={handleDone} /> : null}</Dialog>
            </Modal>
        </ModalOverlay>
    );
}

function CreateIssueForm({ onDone }: { onDone: () => void }) {
    const t = useTranslations();
    const router = useRouter();
    const params = useSearchParams();
    const { data } = useWorkspace();
    const mounted = useIsMounted();
    const defaultTeam = data.teams.find((team) => team.key === params.get("team")?.toUpperCase()) ?? data.teams[0];
    const [draft, setDraft] = useState<Draft>({
        teamId: defaultTeam?.id ?? "",
        title: "",
        description: "",
        status: "todo",
        priority: 0,
        assigneeId: null,
        projectId: null,
        labelIds: [],
        dueDate: "",
    });
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function set<K extends keyof Draft>(key: K, value: Draft[K]) {
        setDraft((current) => ({ ...current, [key]: value }));
    }

    function submit() {
        if (!draft.title.trim()) {
            setError(t("errors.titleRequired"));
            return;
        }
        startTransition(async () => {
            const result = await createIssue({ ...draft, dueDate: draft.dueDate || null });
            if (!result.ok) {
                if (mounted.current) setError(t(`errors.${result.error}`));
                return;
            }
            const { identifier } = result.data;
            track("issue_created", { teamId: draft.teamId, priority: draft.priority, hasProject: draft.projectId !== null });
            toastStore.show({
                message: t("create.created", { identifier }),
                action: { label: t("create.view"), onAction: () => router.push(`/issue/${identifier}`) },
            });
            onDone();
        });
    }

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        submit();
    }

    // Cmd or Ctrl + Enter submits from the text fields, like in Linear.
    function handleFieldKeyDown(event: KeyboardEvent) {
        if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return;
        event.preventDefault();
        submit();
    }

    function handleTeamChange(key: Key | null) {
        if (key === null) return;
        setDraft((current) => ({ ...current, teamId: String(key), projectId: null }));
    }

    function handleTitleChange(value: string) {
        set("title", value);
        setError(null);
    }

    function handleDescriptionChange(value: string) {
        set("description", value);
    }

    function handleStatusChange(value: Draft["status"]) {
        set("status", value);
    }

    function handlePriorityChange(value: Draft["priority"]) {
        set("priority", value);
    }

    function handleAssigneeChange(value: string | null) {
        set("assigneeId", value);
    }

    function handleProjectChange(value: string | null) {
        set("projectId", value);
    }

    function handleLabelsChange(value: string[]) {
        set("labelIds", value);
    }

    function handleDueDateChange(event: ChangeEvent<HTMLInputElement>) {
        set("dueDate", event.target.value);
    }

    return (
        <form className="flex flex-col gap-5 p-4 sm:p-6" onSubmit={handleSubmit}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <AriaHeading slot="title" id="create-issue-title" className="text-lg font-semibold text-primary">
                    {t("create.title")}
                </AriaHeading>
                <Select
                    aria-label={t("create.team")}
                    size="sm"
                    className="w-40"
                    selectedKey={draft.teamId}
                    onSelectionChange={handleTeamChange}
                    items={data.teams.map((team) => ({ id: team.id, label: team.name, supportingText: team.key }))}
                >
                    {(item) => <Select.Item id={item.id} label={item.label} supportingText={item.supportingText} />}
                </Select>
            </div>

            <Input
                label={t("create.titleLabel")}
                placeholder={t("create.titlePlaceholder")}
                value={draft.title}
                onChange={handleTitleChange}
                onKeyDown={handleFieldKeyDown}
                isRequired
                autoFocus
                isInvalid={error !== null}
                hint={error ?? undefined}
                name="title"
            />

            <TextArea
                label={t("create.descriptionLabel")}
                placeholder={t("create.descriptionPlaceholder")}
                value={draft.description}
                onChange={handleDescriptionChange}
                onKeyDown={handleFieldKeyDown}
                rows={5}
            />

            <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-medium text-secondary">{t("issue.properties")}</legend>
                <div className="bg-secondary_subtle flex flex-wrap items-center gap-1 rounded-lg p-1 ring-1 ring-secondary">
                    <StatusMenu value={draft.status} onChange={handleStatusChange} />
                    <PriorityMenu value={draft.priority} onChange={handlePriorityChange} />
                    <AssigneeMenu value={draft.assigneeId} onChange={handleAssigneeChange} />
                    <ProjectMenu teamId={draft.teamId} value={draft.projectId} onChange={handleProjectChange} />
                    <LabelsMenu value={draft.labelIds} onChange={handleLabelsChange} />
                    <label className="flex h-8 items-center gap-2 rounded-md px-2 text-sm text-secondary">
                        <span>{t("issue.dueDate")}</span>
                        <input type="date" value={draft.dueDate} onChange={handleDueDateChange} className={DATE_INPUT_CLASS} />
                    </label>
                </div>
            </fieldset>

            <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-tertiary">{t("create.submitHint")}</p>
                <div className="flex justify-end gap-3">
                    <Button color="secondary" onClick={onDone}>
                        {t("common.cancel")}
                    </Button>
                    <Button type="submit" isLoading={isPending}>
                        {t("create.submit")}
                    </Button>
                </div>
            </div>
        </form>
    );
}
