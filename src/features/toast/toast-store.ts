import { useSyncExternalStore } from "react";

export interface Toast {
    id: number;
    message: string;
    tone: "neutral" | "error";
    action?: { label: string; onAction: () => void };
}

type Listener = () => void;

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

const emit = () => listeners.forEach((listener) => listener());

export const toastStore = {
    show(toast: Omit<Toast, "id" | "tone"> & { tone?: Toast["tone"] }): number {
        const id = nextId++;
        // Keep the three most recent so the region never covers the page.
        toasts = [...toasts, { tone: "neutral" as const, ...toast, id }].slice(-3);
        emit();
        return id;
    },
    dismiss(id: number) {
        toasts = toasts.filter((toast) => toast.id !== id);
        emit();
    },
    clear() {
        toasts = [];
        emit();
    },
    subscribe(listener: Listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
    getSnapshot: () => toasts,
};

const EMPTY: Toast[] = [];

export const useToasts = () => useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot, () => EMPTY);
