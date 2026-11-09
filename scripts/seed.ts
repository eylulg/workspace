/**
 * Replaces the demo workspace with a fresh copy of the fixture.
 * Run `npm run db:migrate` first. Stop the dev server when seeding the local PGlite
 * database, because PGlite allows one process at a time.
 */
async function main() {
    const { getDb } = await import("../src/server/db/client");
    const { seedDemoWorkspace } = await import("../src/server/db/seed");
    const db = await getDb();
    const result = await seedDemoWorkspace(db);
    console.log(`Seeded demo workspace with ${result.issueCount} issues.`);
    process.exit(0);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
