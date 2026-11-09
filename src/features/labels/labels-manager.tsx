"use client";

import { Edit03, Plus, Trash01 } from "@untitledui/icons";
import { useTranslations } from "next-intl";
import { type FormEvent, useState, useTransition } from "react";
import { Heading as AriaHeading, Radio as AriaRadio, RadioGroup as AriaRadioGroup, Label as AriaLabel } from "react-aria-components";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { LabelDot } from "@/features/issues/issue-icons";
import { toastStore } from "@/features/toast/toast-store";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { Link } from "@/i18n/navigation";
import { LABEL_COLORS, type Label } from "@/lib/domain";
import { createLabel, deleteLabel, updateLabel } from "@/server/actions/labels";
import { cx } from "@/utils/cx";

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
                                "size-7 cursor-pointer rounded-full ring-offset-2 ring-offset-bg-primary transition",
                                isSelected && "ring-2 ring-fg-primary",
                                isFocusVisible && "outline-2 outline-offset-4 outline-focus-ring",
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
    const [editing, setEditing] = useState<Editing>(null);
    const [deleting, setDeleting] = useState<Label | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleConfirmDelete() {
        if (!deleting) return;
        const label = deleting;
        startTransition(async () => {
            const result = await deleteLabel({ id: label.id });
            toastStore.show(
                result.ok
                    ? { message: t("labels.deleted", { name: label.name }) }
                    : { message: t(`errors.${result.error}`), tone: "error" },
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
        <div className="flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-display-xs font-semibold text-primary">{t("labels.title")}</h1>
                    <p className="mt-1 text-sm text-tertiary">{t("labels.subtitle")}</p>
                </div>
                <Button iconLeading={Plus} onClick={handleCreate}>
                    {t("labels.new")}
                </Button>
            </div>

            {labels.length === 0 ? (
                <p className="rounded-xl p-6 text-sm text-tertiary ring-1 ring-secondary">{t("labels.empty")}</p>
            ) : (
                <ul className="divide-y divide-border-secondary overflow-hidden rounded-xl bg-primary ring-1 ring-secondary">
                    {labels.map((label) => (
                        <LabelRow key={label.id} label={label} count={usage[label.id] ?? 0} onEdit={setEditing} onDelete={setDeleting} />
                    ))}
                </ul>
            )}

            <ModalOverlay isOpen={editing !== null} onOpenChange={handleEditingOpenChange} isDismissable>
                <Modal className="max-w-md">
                    <Dialog aria-labelledby="label-dialog-title">
                        {editing && (
                            <LabelForm
                                key={editing.mode === "edit" ? editing.label.id : "new"}
                                editing={editing}
                                onDone={handleCloseEditing}
                            />
                        )}
                    </Dialog>
                </Modal>
            </ModalOverlay>

            <ModalOverlay isOpen={deleting !== null} onOpenChange={handleDeletingOpenChange} isDismissable>
                <Modal className="max-w-md">
                    <Dialog role="alertdialog" aria-labelledby="delete-label-title">
                        <div className="flex flex-col gap-4 p-6">
                            <AriaHeading slot="title" id="delete-label-title" className="text-lg font-semibold text-primary">
                                {t("labels.deleteTitle", { name: deleting?.name ?? "" })}
                            </AriaHeading>
                            <p className="text-sm text-tertiary">
                                {t("labels.deleteBody", { count: deleting ? (usage[deleting.id] ?? 0) : 0 })}
                            </p>
                            <div className="flex justify-end gap-3">
                                <Button color="secondary" onClick={handleCancelDelete}>
                                    {t("common.cancel")}
                                </Button>
                                <Button color="primary-destructive" onClick={handleConfirmDelete} isLoading={isPending}>
                                    {t("labels.confirmDelete")}
                                </Button>
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
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
                className="rounded-sm text-sm text-tertiary tabular-nums outline-focus-ring hover:text-secondary hover:underline focus-visible:outline-2"
            >
                {t("usage", { count })}
            </Link>
            <ButtonUtility size="xs" color="tertiary" icon={Edit03} tooltip={t("edit", { name: label.name })} onClick={handleEdit} />
            <ButtonUtility size="xs" color="tertiary" icon={Trash01} tooltip={t("delete", { name: label.name })} onClick={handleDelete} />
        </li>
    );
}

function LabelForm({ editing, onDone }: { editing: NonNullable<Editing>; onDone: () => void }) {
    const t = useTranslations();
    const mounted = useIsMounted();
    const [name, setName] = useState(editing.mode === "edit" ? editing.label.name : "");
    const [color, setColor] = useState(editing.mode === "edit" ? editing.label.color : LABEL_COLORS[7]);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        startTransition(async () => {
            const result =
                editing.mode === "edit" ? await updateLabel({ id: editing.label.id, name, color }) : await createLabel({ name, color });
            if (!result.ok) {
                if (mounted.current) setError(t(`errors.${result.error}`));
                return;
            }
            toastStore.show({ message: t(editing.mode === "edit" ? "labels.updated" : "labels.created", { name: name.trim() }) });
            onDone();
        });
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
            <AriaHeading slot="title" id="label-dialog-title" className="text-lg font-semibold text-primary">
                {editing.mode === "edit" ? t("labels.editTitle") : t("labels.new")}
            </AriaHeading>
            <Input
                label={t("labels.name")}
                value={name}
                onChange={setName}
                isRequired
                autoFocus
                isInvalid={error !== null}
                hint={error ?? undefined}
            />
            <ColorPicker value={color} onChange={setColor} label={t("labels.color")} />
            <div className="flex justify-end gap-3">
                <Button color="secondary" onClick={onDone}>
                    {t("common.cancel")}
                </Button>
                <Button type="submit" isLoading={isPending}>
                    {t("common.save")}
                </Button>
            </div>
        </form>
    );
}
