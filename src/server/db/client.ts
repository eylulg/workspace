import path from 'node:path';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS_FOLDER = path.join(process.cwd(), 'drizzle');

const globalForDb = globalThis as unknown as { __workspaceDb?: Promise<Database> };

/**
 * Production connects to Postgres through DATABASE_URL (Neon on Vercel).
 * Without it the app runs on PGlite, an embedded Postgres compiled to WebAssembly,
 * and migrates itself, so no database server is needed. Visitors get their workspace on first request.
 */
async function createDatabase(): Promise<Database> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const { default: postgres } = await import('postgres');
    // prepare: false keeps the client compatible with pooled (PgBouncer) connection strings.
    return drizzle(postgres(url, { max: 5, prepare: false }), { schema }) as unknown as Database;
  }
  const dir = process.env.PGLITE_DIR ?? '.pglite';
  return createPgliteDatabase(dir === 'memory' ? undefined : dir);
}

export async function createPgliteDatabase(dataDir: string | undefined): Promise<Database> {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db as unknown as Database;
}

export function getDb(): Promise<Database> {
  globalForDb.__workspaceDb ??= createDatabase().catch((error: unknown) => {
    globalForDb.__workspaceDb = undefined;
    throw error;
  });
  return globalForDb.__workspaceDb;
}

/** Lets integration tests run the real actions against their own in-memory database. */
export function setDbForTesting(db: Database | undefined) {
  globalForDb.__workspaceDb = db ? Promise.resolve(db) : undefined;
}
