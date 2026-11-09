import { notFound } from "next/navigation";

// Always a 404, so there is no instant shell to validate.
export const instant = false;

/** Sends unknown paths inside a locale to the localized not found page. */
export default function CatchAll() {
    notFound();
}
