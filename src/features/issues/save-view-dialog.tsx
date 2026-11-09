"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useState, useTransition } from "react";
import { Heading as AriaHeading } from "react-aria-components";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { toastStore } from "@/features/toast/toast-store";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { type IssueQuery, serializeIssueQuery } from "@/lib/issue-query";
import { saveView } from "@/server/actions/views";

interface SaveViewDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    query: IssueQuery;
}

export function SaveViewDialog({ isOpen, onOpenChange, query }: SaveViewDialogProps) {
    return (
        <ModalOverlay isOpen={isOpen} onOpenChange={onOpenChange} isDismissable>
            <Modal className="max-w-md">
                <Dialog aria-labelledby="save-view-title">
                    {isOpen ? <SaveViewForm query={query} onOpenChange={onOpenChange} /> : null}
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}

function SaveViewForm({ query, onOpenChange }: Omit<SaveViewDialogProps, "isOpen">) {
    const t = useTranslations();
    const mounted = useIsMounted();
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        startTransition(async () => {
            const result = await saveView({ name, query: serializeIssueQuery(query) });
            if (!result.ok) {
                if (mounted.current) setError(t(`errors.${result.error}`));
                return;
            }
            toastStore.show({ message: t("views.saved", { name: name.trim() }) });
            onOpenChange(false);
        });
    }

    function handleCancel() {
        onOpenChange(false);
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
            <div>
                <AriaHeading slot="title" id="save-view-title" className="text-lg font-semibold text-primary">
                    {t("views.saveTitle")}
                </AriaHeading>
                <p className="mt-1 text-sm text-tertiary">{t("views.saveDescription")}</p>
            </div>
            <Input
                label={t("views.name")}
                value={name}
                onChange={setName}
                isRequired
                autoFocus
                isInvalid={error !== null}
                hint={error ?? undefined}
            />
            <div className="flex justify-end gap-3">
                <Button color="secondary" onClick={handleCancel}>
                    {t("common.cancel")}
                </Button>
                <Button type="submit" isLoading={isPending}>
                    {t("views.submit")}
                </Button>
            </div>
        </form>
    );
}
