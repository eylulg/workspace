/**
 * Applies the SQL migrations in ./drizzle.
 * With DATABASE_URL set it migrates that Postgres database (Neon in production),
 * otherwise the local PGlite database in PGLITE_DIR.
 */
import path from "node:path";

const migrationsFolder = path.join(process.cwd(), "drizzle");

async function main() {
    const url = process.env.DATABASE_URL;
    if (url) {
        const { drizzle } = await import("drizzle-orm/postgres-js");
        const { migrate } = await import("drizzle-orm/postgres-js/migrator");
        const { default: postgres } = await import("postgres");
        const client = postgres(url, { max: 1, prepare: false });
        await migrate(drizzle(client), { migrationsFolder });
        await client.end();
        console.log("Migrated Postgres database.");
        return;
    }
    const { createPgliteDatabase } = await import("../src/server/db/client");
    await createPgliteDatabase(process.env.PGLITE_DIR ?? ".pglite");
    console.log(`Migrated PGlite database in ${process.env.PGLITE_DIR ?? ".pglite"}.`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
