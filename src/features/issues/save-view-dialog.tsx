"use client";

import { Button } from "@eylulg/ui/button";
import { Dialog } from "@eylulg/ui/dialog";
import { Input } from "@eylulg/ui/input";
import { useToast } from "@eylulg/ui/toast";
import { useTranslations } from "next-intl";
import { type FormEvent, useState, useTransition } from "react";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { type IssueQuery, serializeIssueQuery } from "@/lib/issue-query";
import { saveView } from "@/server/actions/views";

interface SaveViewDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    query: IssueQuery;
}

export function SaveViewDialog({ isOpen, onOpenChange, query }: SaveViewDialogProps) {
    const t = useTranslations("views");
    const tc = useTranslations("common");
    return (
        <Dialog
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            size="sm"
            title={t("saveTitle")}
            description={t("saveDescription")}
            closeLabel={tc("close")}
        >
            {isOpen ? <SaveViewForm query={query} onOpenChange={onOpenChange} /> : null}
        </Dialog>
    );
}

function SaveViewForm({ query, onOpenChange }: Omit<SaveViewDialogProps, "isOpen">) {
    const t = useTranslations();
    const { toast } = useToast();
    const mounted = useIsMounted();
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        startTransition(async () => {
            const result = await saveView({ name, query: serializeIssueQuery(query) }).catch(() => null);
            if (!result) {
                toast({ title: t("errors.unknown"), variant: "error" });
                return;
            }
            if (!result.ok) {
                if (mounted.current) setError(t(`errors.${result.error}`));
                return;
            }
            toast({ title: t("views.saved", { name: name.trim() }), variant: "success" });
            onOpenChange(false);
        });
    }

    function handleCancel() {
        onOpenChange(false);
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
                label={t("views.name")}
                value={name}
                onChange={setName}
                isRequired
                autoFocus
                isInvalid={error !== null}
                errorMessage={error ?? undefined}
            />
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="secondary" onPress={handleCancel}>
                    {t("common.cancel")}
                </Button>
                <Button type="submit" isLoading={isPending}>
                    {t("views.submit")}
                </Button>
            </div>
        </form>
    );
}
