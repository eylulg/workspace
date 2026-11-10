import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/** Runs against the production build (`npm run build` first) on an in-memory PGlite database. */
export default defineConfig({
    testDir: "tests/e2e",
    // The demo workspace is shared state, so tests run one at a time.
    workers: 1,
    fullyParallel: false,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: "retain-on-failure",
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: {
        command: "npm run start:e2e",
        url: `http://localhost:${PORT}/en/issues`,
        reuseExistingServer: false,
        timeout: 120_000,
    },
});
