import { type Database, createPgliteDatabase, setDbForTesting } from "@/server/db/client";
import { seedDemoWorkspace } from "@/server/db/seed";
import { visitorSlug } from "@/server/visitor-workspace";

/** A fresh in-memory Postgres with the real migrations, installed as the app database. */
export async function useTestDatabase(): Promise<Database> {
    const db = await createPgliteDatabase(undefined);
    setDbForTesting(db);
    return db;
}

/** The visitor every test acts as. */
export const TEST_SESSION = "00000000-0000-4000-8000-0000000000aa";

/** Mocks the guest cookie, because the workspace a request sees is the one keyed by it. */
export const testCookies = async () => ({ get: () => ({ value: TEST_SESSION }) });

/** Puts the test visitor's workspace back to the fixture, so every test starts from the same rows. */
export async function resetDemo(db: Database) {
    await seedDemoWorkspace(db, visitorSlug(TEST_SESSION), new Date("2026-11-09T09:00:00Z"));
}
