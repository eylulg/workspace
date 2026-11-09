"use client";

import { useTranslations } from "next-intl";
import { type KeyboardEvent, useId, useState } from "react";
import { Label as AriaLabel, type Selection, TextField as AriaTextField } from "react-aria-components";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { TextAreaBase } from "@/components/base/textarea/textarea";
import { Markdown } from "./markdown";

type Mode = "write" | "preview";

/**
 * A Markdown textarea with a preview tab. Saves explicitly so a half typed edit is never stored.
 * The parent keys it by the saved value, so a newer description from the server resets the draft.
 */
export function DescriptionEditor({ value, onSave }: { value: string; onSave: (value: string) => void }) {
    const t = useTranslations("issue");
    const tc = useTranslations("common");
    const headingId = useId();
    const [mode, setMode] = useState<Mode>(value ? "preview" : "write");
    const [draft, setDraft] = useState(value);

    const dirty = draft !== value;

    function save() {
        onSave(draft);
        setMode("preview");
    }

    function handleModeChange(keys: Selection) {
        if (keys === "all") return;
        if (keys.has("write")) setMode("write");
        else if (keys.has("preview")) setMode("preview");
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey) || !dirty) return;
        event.preventDefault();
        save();
    }

    function handleDiscard() {
        setDraft(value);
    }

    return (
        <section aria-labelledby={headingId} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
                <h2 id={headingId} className="text-sm font-semibold text-primary">
                    {t("description")}
                </h2>
                <ButtonGroup
                    aria-label={t("descriptionMode")}
                    size="sm"
                    selectionMode="single"
                    disallowEmptySelection
                    selectedKeys={[mode]}
                    onSelectionChange={handleModeChange}
                >
                    <ButtonGroupItem id="write">{tc("write")}</ButtonGroupItem>
                    <ButtonGroupItem id="preview">{tc("preview")}</ButtonGroupItem>
                </ButtonGroup>
            </div>
            {mode === "write" ? (
                <AriaTextField value={draft} onChange={setDraft} className="flex flex-col gap-1.5">
                    <AriaLabel className="sr-only">{t("description")}</AriaLabel>
                    <TextAreaBase
                        rows={10}
                        placeholder={t("descriptionPlaceholder")}
                        className="font-mono text-sm"
                        onKeyDown={handleKeyDown}
                    />
                    <p className="text-xs text-tertiary">{t("markdownHint")}</p>
                </AriaTextField>
            ) : draft.trim() ? (
                <Markdown className="rounded-lg p-1">{draft}</Markdown>
            ) : (
                <p className="text-sm text-tertiary italic">{t("noDescription")}</p>
            )}
            {dirty && (
                <div className="flex justify-end gap-2">
                    <Button size="sm" color="secondary" onClick={handleDiscard}>
                        {tc("discard")}
                    </Button>
                    <Button size="sm" onClick={save}>
                        {t("saveDescription")}
                    </Button>
                </div>
            )}
        </section>
    );
}
