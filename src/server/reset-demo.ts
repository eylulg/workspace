import "server-only";
import { getDb } from "./db/client";
import { seedDemoWorkspace } from "./db/seed";

/**
 * The demo is one shared workspace. Resetting deletes it and seeds it again,
 * which gives every row new ids, so old cache entries are never read again.
 */
export async function resetDemoWorkspace() {
    const db = await getDb();
    return seedDemoWorkspace(db);
}
