import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("creates an issue from the command palette", async ({ page }) => {
    await page.goto("/en/issues?team=WEB");
    await expect(page.getByRole("heading", { level: 1, name: "Web issues" })).toBeVisible();

    const search = page.getByRole("combobox", { name: "Command palette" });
    // Retries until the page has hydrated and the button opens the palette.
    await expect(async () => {
        if (!(await search.isVisible()))
            await page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: "Open command palette" }).click();
        await expect(search).toBeVisible({ timeout: 1000 });
    }).toPass();
    await search.fill("Create issue");
    await page.keyboard.press("Enter");
    await page.getByRole("textbox", { name: /Title/ }).fill("Palette created issue");
    await page.getByRole("button", { name: "Create issue" }).click();

    await expect(page.getByText(/^Created WEB-\d+$/)).toBeVisible();
    await expect(page.getByRole("link", { name: /Palette created issue/ })).toBeVisible();
});

test("moves an issue to the next column on the board with the keyboard", async ({ page }) => {
    await page.goto("/en/issues?team=WEB&view=board");
    const handle = page.getByRole("button", { name: /^Move WEB-3 / });

    const announcement = page.getByRole("status").filter({ hasText: /WEB-3/ });

    await handle.focus();
    await page.keyboard.press("Space");
    await expect(announcement).toHaveText(/in Todo|to Todo/);
    await page.keyboard.press("ArrowRight");
    await expect(announcement).toHaveText(/moved to In progress/);
    await page.keyboard.press("Space");

    const inProgress = page.getByRole("region", { name: /^In progress/ });
    await expect(inProgress.getByRole("link", { name: /Seed new accounts with a sample project/ })).toBeVisible();
    await page.reload();
    await expect(
        page.getByRole("region", { name: /^In progress/ }).getByRole("link", { name: /Seed new accounts with a sample project/ }),
    ).toBeVisible();
});

test("switches the interface to German and keeps the page", async ({ page }) => {
    await page.goto("/en/issues?view=board");

    await page
        .getByRole("navigation", { name: "Main" })
        .getByRole("button", { name: /^Language:/ })
        .click();
    await page.getByRole("menuitemradio", { name: "Deutsch" }).click();

    await expect(page).toHaveURL(/\/de\/issues\?view=board$/);
    await expect(page.getByRole("heading", { level: 1, name: "Vorgänge" })).toBeVisible();
});

test("fits a 375 pixel wide screen without horizontal scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });

    await page.goto("/en/issues");

    await expect(page.getByRole("heading", { level: 1, name: "Issues" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

for (const scheme of ["light", "dark"] as const) {
    for (const path of ["/en/issues", "/en/issues?view=board", "/en/issue/WEB-1", "/en/projects", "/en/labels"]) {
        test(`has no axe violations on ${path} in ${scheme} mode`, async ({ page }) => {
            await page.emulateMedia({ colorScheme: scheme });

            await page.goto(path);
            await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

            const results = await new AxeBuilder({ page }).analyze();
            expect(
                results.violations.map(
                    (violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`,
                ),
            ).toEqual([]);
        });
    }
}
