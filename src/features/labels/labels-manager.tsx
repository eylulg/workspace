"use client";

import { Button } from "@eylulg/ui/button";
import { cx } from "@eylulg/ui/cx";
import { Dialog } from "@eylulg/ui/dialog";
import { EmptyState } from "@eylulg/ui/empty-state";
import { IconButton } from "@eylulg/ui/icon-button";
import { Input } from "@eylulg/ui/input";
import { PageHeader } from "@eylulg/ui/page-header";
import { useToast } from "@eylulg/ui/toast";
import { Tooltip } from "@eylulg/ui/tooltip";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useState, useTransition } from "react";
import { Label as AriaLabel, Radio as AriaRadio, RadioGroup as AriaRadioGroup } from "react-aria-components";
import { LabelDot } from "@/features/issues/issue-icons";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { Link } from "@/i18n/navigation";
import { LABEL_COLORS, type Label } from "@/lib/domain";
import { createLabel, deleteLabel, updateLabel } from "@/server/actions/labels";

function ColorPicker({ value, onChange, label }: { value: string; onChange: (color: string) => void; label: string }) {
    return (
        <AriaRadioGroup value={value} onChange={onChange} orientation="horizontal" className="flex flex-col gap-1.5">
            <AriaLabel className="text-sm font-medium text-secondary">{label}</AriaLabel>
            <div className="flex flex-wrap gap-2">
                {LABEL_COLORS.map((color) => (
                    <AriaRadio
                        key={color}
                        value={color}
                        aria-label={color}
                        className={({ isSelected, isFocusVisible }) =>
                            cx(
                                "size-7 cursor-pointer rounded-full ring-offset-2 ring-offset-(--ui-bg-elevated) transition",
                                isSelected && "ring-2 ring-fg-primary",
                                isFocusVisible && "outline-2 outline-offset-4 outline-focus",
                            )
                        }
                        style={{ backgroundColor: color }}
                    />
                ))}
            </div>
        </AriaRadioGroup>
    );
}

type Editing = { mode: "create" } | { mode: "edit"; label: Label } | null;

export function LabelsManager({ labels, usage }: { labels: Label[]; usage: Record<string, number> }) {
    const t = useTranslations();
    const { toast } = useToast();
    const [editing, setEditing] = useState<Editing>(null);
    const [deleting, setDeleting] = useState<Label | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleConfirmDelete() {
        if (!deleting) return;
        const label = deleting;
        startTransition(async () => {
            const result = await deleteLabel({ id: label.id }).catch(() => null);
            toast(
                !result
                    ? { title: t("errors.unknown"), variant: "error" }
                    : result.ok
                      ? { title: t("labels.deleted", { name: label.name }), variant: "success" }
                      : { title: t(`errors.${result.error}`), variant: "error" },
            );
            // Only close the dialog if it still shows the label this request deleted.
            setDeleting((current) => (current?.id === label.id ? null : current));
        });
    }

    function handleCreate() {
        setEditing({ mode: "create" });
    }

    function handleEditingOpenChange(open: boolean) {
        if (!open) setEditing(null);
    }

    function handleDeletingOpenChange(open: boolean) {
        if (!open) setDeleting(null);
    }

    function handleCloseEditing() {
        setEditing(null);
    }

    function handleCancelDelete() {
        setDeleting(null);
    }

    return (
        <div className="flex max-w-3xl flex-col gap-6">
            <PageHeader
                headingLevel={1}
                title={t("labels.title")}
                description={t("labels.subtitle")}
                actions={
                    <Button iconLeading={Plus} onPress={handleCreate}>
                        {t("labels.new")}
                    </Button>
                }
            />

            {labels.length === 0 ? (
                <EmptyState size="sm" icon={Tag} title={t("labels.empty")} />
            ) : (
                <ul className="divide-y divide-(--ui-border-subtle) overflow-hidden rounded-xl border border-subtle bg-primary">
                    {labels.map((label) => (
                        <LabelRow key={label.id} label={label} count={usage[label.id] ?? 0} onEdit={setEditing} onDelete={setDeleting} />
                    ))}
                </ul>
            )}

            <Dialog
                isOpen={editing !== null}
                onOpenChange={handleEditingOpenChange}
                size="sm"
                title={editing?.mode === "edit" ? t("labels.editTitle") : t("labels.new")}
                closeLabel={t("common.close")}
            >
                {editing && (
                    <LabelForm key={editing.mode === "edit" ? editing.label.id : "new"} editing={editing} onDone={handleCloseEditing} />
                )}
            </Dialog>

            <Dialog
                isOpen={deleting !== null}
                onOpenChange={handleDeletingOpenChange}
                role="alertdialog"
                size="sm"
                title={t("labels.deleteTitle", { name: deleting?.name ?? "" })}
                description={t("labels.deleteBody", { count: deleting ? (usage[deleting.id] ?? 0) : 0 })}
                closeLabel={t("common.close")}
                footer={
                    <>
                        <Button variant="secondary" onPress={handleCancelDelete}>
                            {t("common.cancel")}
                        </Button>
                        <Button variant="destructive" onPress={handleConfirmDelete} isLoading={isPending}>
                            {t("labels.confirmDelete")}
                        </Button>
                    </>
                }
            />
        </div>
    );
}

function LabelRow({
    label,
    count,
    onEdit,
    onDelete,
}: {
    label: Label;
    count: number;
    onEdit: (editing: Editing) => void;
    onDelete: (label: Label) => void;
}) {
    const t = useTranslations("labels");

    function handleEdit() {
        onEdit({ mode: "edit", label });
    }

    function handleDelete() {
        onDelete(label);
    }

    return (
        <li className="flex items-center gap-3 px-4 py-3">
            <LabelDot color={label.color} className="size-3" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-primary">{label.name}</span>
            <Link
                href={`/issues?label=${label.id}`}
                className="rounded-sm text-sm text-tertiary tabular-nums outline-focus hover:text-secondary hover:underline focus-visible:outline-2"
            >
                {t("usage", { count })}
            </Link>
            <Tooltip content={t("edit", { name: label.name })}>
                <IconButton icon={Pencil} variant="tertiary" size="sm" aria-label={t("edit", { name: label.name })} onPress={handleEdit} />
            </Tooltip>
            <Tooltip content={t("delete", { name: label.name })}>
                <IconButton
                    icon={Trash2}
                    variant="tertiary"
                    size="sm"
                    aria-label={t("delete", { name: label.name })}
                    onPress={handleDelete}
                />
            </Tooltip>
        </li>
    );
}

function LabelForm({ editing, onDone }: { editing: NonNullable<Editing>; onDone: () => void }) {
    const t = useTranslations();
    const { toast } = useToast();
    const mounted = useIsMounted();
    const [name, setName] = useState(editing.mode === "edit" ? editing.label.name : "");
    const [color, setColor] = useState(editing.mode === "edit" ? editing.label.color : LABEL_COLORS[7]);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        startTransition(async () => {
            const result = await (
                editing.mode === "edit" ? updateLabel({ id: editing.label.id, name, color }) : createLabel({ name, color })
            ).catch(() => null);
            if (!result) {
                toast({ title: t("errors.unknown"), variant: "error" });
                return;
            }
            if (!result.ok) {
                if (mounted.current) setError(t(`errors.${result.error}`));
                return;
            }
            toast({ title: t(editing.mode === "edit" ? "labels.updated" : "labels.created", { name: name.trim() }), variant: "success" });
            onDone();
        });
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
                label={t("labels.name")}
                value={name}
                onChange={setName}
                isRequired
                autoFocus
                isInvalid={error !== null}
                errorMessage={error ?? undefined}
            />
            <ColorPicker value={color} onChange={setColor} label={t("labels.color")} />
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="secondary" onPress={onDone}>
                    {t("common.cancel")}
                </Button>
                <Button type="submit" isLoading={isPending}>
                    {t("common.save")}
                </Button>
            </div>
        </form>
    );
}
