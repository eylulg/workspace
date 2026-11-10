import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

const [outDir, port = "4802"] = process.argv.slice(2);
if (!outDir) throw new Error("Usage: node scripts/perf.mjs <output dir> [port]");

const RUNS = 3;
const ROUTES = {
    issues: "/en/issues",
    board: "/en/issues?view=board",
    issue: "/en/issue/WEB-12",
    projects: "/en/projects",
};

const kb = (bytes) => Math.round((bytes / 1024) * 10) / 10;

function summarise(lhr) {
    const requests = lhr.audits["network-requests"].details.items;
    const sum = (type, key) => requests.filter((item) => item.resourceType === type).reduce((total, item) => total + item[key], 0);
    const document = requests.find((item) => item.resourceType === "Document");
    return {
        score: Math.round(lhr.categories.performance.score * 100),
        jsGzipKb: kb(sum("Script", "transferSize")),
        jsRawKb: kb(sum("Script", "resourceSize")),
        cssGzipKb: kb(sum("Stylesheet", "transferSize")),
        htmlRawKb: kb(document?.resourceSize ?? 0),
        htmlGzipKb: kb(document?.transferSize ?? 0),
        requests: requests.length,
        lcpMs: Math.round(lhr.audits["largest-contentful-paint"].numericValue),
        cls: Math.round(lhr.audits["cumulative-layout-shift"].numericValue * 1000) / 1000,
        tbtMs: Math.round(lhr.audits["total-blocking-time"].numericValue),
    };
}

mkdirSync(outDir, { recursive: true });
const chrome = await launch({ chromePath: process.env.CHROME_PATH, chromeFlags: ["--headless=new", "--no-sandbox"] });
const summary = {};
try {
    const selected = process.env.ONLY?.split(",");
    for (const [name, route] of Object.entries(ROUTES).filter(([name]) => !selected || selected.includes(name))) {
        const runs = [];
        for (let index = 0; index < RUNS; index += 1) {
            const result = await lighthouse(
                `http://localhost:${port}${route}`,
                { port: chrome.port, output: "json", onlyCategories: ["performance"], logLevel: "error" },
                undefined,
            );
            if (result) runs.push(result.lhr);
        }
        runs.sort((a, b) => a.categories.performance.score - b.categories.performance.score);
        const median = runs[Math.floor(runs.length / 2)];
        if (!median) throw new Error(`No Lighthouse result for ${route}`);
        writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(median));
        summary[name] = { route, runs: runs.map((run) => run.categories.performance.score), ...summarise(median) };
    }
} finally {
    await chrome.kill();
}
writeFileSync(path.join(outDir, "summary.json"), `${JSON.stringify(summary, null, 4)}\n`);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
