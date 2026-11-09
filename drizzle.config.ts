import { defineConfig } from "drizzle-kit";

// Migrations are generated from one schema and applied to both PGlite (local, tests) and Postgres (production).
export default defineConfig({
    dialect: "postgresql",
    schema: "./src/server/db/schema.ts",
    out: "./drizzle",
    ...(process.env.DATABASE_URL ? { dbCredentials: { url: process.env.DATABASE_URL } } : {}),
});
