import { type Database, createPgliteDatabase, setDbForTesting } from "@/server/db/client";
import { seedDemoWorkspace } from "@/server/db/seed";

/** A fresh in-memory Postgres with the real migrations, installed as the app database. */
export async function useTestDatabase(): Promise<Database> {
    const db = await createPgliteDatabase(undefined, { seed: false });
    setDbForTesting(db);
    return db;
}

/** Puts the demo workspace back to the fixture, so every test starts from the same rows. */
export async function resetDemo(db: Database) {
    await seedDemoWorkspace(db, new Date("2026-11-09T09:00:00Z"));
}
