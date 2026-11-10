"use client";

import { Button } from "@eylulg/ui/button";
import { type ToastVariant, useToast } from "@eylulg/ui/toast";

interface ActionToast {
    title: string;
    variant?: ToastVariant;
    action: { label: string; onAction: () => void };
}

/** A toast with one action, such as Undo. The library toast has no action slot, so the button goes in its description. */
export function useActionToast() {
    const { toast, dismiss } = useToast();

    return function showActionToast({ title, variant = "success", action }: ActionToast) {
        function handlePress() {
            action.onAction();
            dismiss(id);
        }
        const id = toast({
            title,
            variant,
            description: (
                <Button variant="tertiary" size="sm" onPress={handlePress}>
                    {action.label}
                </Button>
            ),
        });
    };
}
