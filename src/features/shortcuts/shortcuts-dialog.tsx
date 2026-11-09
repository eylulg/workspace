"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useSyncExternalStore } from "react";
import { Heading as AriaHeading } from "react-aria-components";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { CloseButton } from "@/components/base/buttons/close-button";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { SHORTCUTS } from "@/lib/shortcuts";

const subscribe = () => () => {};
const readIsMac = () => /Mac|iPhone|iPad/.test(navigator.userAgent);
const serverIsMac = () => false;

export function ShortcutsDialog() {
    const t = useTranslations("shortcuts");
    const { helpOpen, setHelpOpen } = useWorkspace();
    // The platform is only known in the browser; the server renders "Ctrl".
    const isMac = useSyncExternalStore(subscribe, readIsMac, serverIsMac);

    function handleClose() {
        setHelpOpen(false);
    }

    return (
        <ModalOverlay isOpen={helpOpen} onOpenChange={setHelpOpen} isDismissable>
            <Modal className="max-w-lg">
                <Dialog aria-labelledby="shortcuts-title">
                    <div className="flex flex-col gap-4 p-6">
                        <div className="flex items-start justify-between gap-4">
                            <AriaHeading slot="title" id="shortcuts-title" className="text-lg font-semibold text-primary">
                                {t("title")}
                            </AriaHeading>
                            <CloseButton size="sm" label={t("close")} onPress={handleClose} />
                        </div>
                        <table className="w-full text-sm">
                            <caption className="sr-only">{t("title")}</caption>
                            <thead className="sr-only">
                                <tr>
                                    <th scope="col">{t("action")}</th>
                                    <th scope="col">{t("keys")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {SHORTCUTS.map((shortcut) => (
                                    <tr key={shortcut.id} className="border-b border-secondary last:border-0">
                                        <th scope="row" className="py-2 pr-4 text-left font-normal text-secondary">
                                            {t(shortcut.id)}
                                        </th>
                                        <td className="py-2 text-right whitespace-nowrap">
                                            <span className="inline-flex gap-1">
                                                {shortcut.keys.map((key, index) => (
                                                    <Kbd key={index}>{key === "mod" ? (isMac ? "⌘" : "Ctrl") : key}</Kbd>
                                                ))}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}

function Kbd({ children }: { children: ReactNode }) {
    return (
        <kbd className="inline-flex min-w-6 items-center justify-center rounded-md bg-secondary px-1.5 py-0.5 font-body text-xs font-medium text-secondary ring-1 ring-secondary ring-inset">
            {children}
        </kbd>
    );
}
