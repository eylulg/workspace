import { themeStorageKey } from "@eylulg/ui/chrome";

/**
 * The library ThemeToggle owns the theme and exports no setter. It reads the choice from localStorage
 * and re-reads it on a `storage` event, so the palette writes the key and fires that event itself.
 */
export function setTheme(preference: "light" | "dark") {
    try {
        window.localStorage.setItem(themeStorageKey, preference);
    } catch {
        return;
    }
    window.dispatchEvent(new StorageEvent("storage", { key: themeStorageKey, newValue: preference }));
}
