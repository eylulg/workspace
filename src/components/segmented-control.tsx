"use client";

import type { IconComponent } from "@eylulg/ui";
import { ToggleButton, ToggleButtonGroup, type Selection } from "react-aria-components";

interface SegmentedControlProps<T extends string> {
    label: string;
    value: T;
    options: Array<{ id: T; label: string; icon?: IconComponent }>;
    onChange: (value: T) => void;
}

const GROUP_CLASS = "inline-flex items-center gap-0.5 rounded-md border border-default bg-primary p-0.5";
const BUTTON_CLASS =
    "inline-flex h-control-xs cursor-pointer items-center gap-1.5 rounded-sm px-2.5 text-sm font-medium text-tertiary transition-colors data-hovered:bg-hover data-hovered:text-secondary data-selected:bg-tertiary data-selected:text-primary data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-focus";

/**
 * A single choice shown as joined buttons. The library has no segmented control yet, so this is
 * React Aria's ToggleButtonGroup with the library tokens, the same parts the library ThemeToggle uses.
 */
export function SegmentedControl<T extends string>({ label, value, options, onChange }: SegmentedControlProps<T>) {
    function handleSelectionChange(keys: Selection) {
        if (keys === "all") return;
        const next = options.find((option) => keys.has(option.id));
        if (next) onChange(next.id);
    }

    return (
        <ToggleButtonGroup
            aria-label={label}
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[value]}
            onSelectionChange={handleSelectionChange}
            className={GROUP_CLASS}
        >
            {options.map(({ id, label: text, icon: Icon }) => (
                <ToggleButton key={id} id={id} className={BUTTON_CLASS}>
                    {Icon && <Icon aria-hidden="true" className="size-4" />}
                    {text}
                </ToggleButton>
            ))}
        </ToggleButtonGroup>
    );
}
