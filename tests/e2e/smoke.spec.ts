import { test, expect } from "@playwright/test";

// Single end-to-end smoke flow covering the whole product surface: build a
// plan via the wizard, edit it, start today's session and log it, go back
// to the editor and publish, land on the public page, and remix it. See
// playwright.config.ts for the Postgres prerequisite.
test("wizard -> edit -> log -> publish -> public page -> remix", async ({ page }) => {
  await page.goto("/build");
  await page.getByTestId("goal-power").click();
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByTestId("days-4").click();
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByTestId("equip-kettlebell").click();
  await page.getByTestId("equip-bands").click();
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByTestId("injury-elbow").click();
  await page.getByRole("button", { name: /create my plan/i }).click();
  await expect(page).toHaveURL(/\/plan\/.+\/edit/);
  await page.getByLabel(/plan name/i).fill("Smoke Test Plan");
  await page.getByRole("link", { name: /start today/i }).click(); // -> /today
  await expect(page.getByText(/week 1/i)).toBeVisible();
  await page.getByRole("button", { name: /finish session/i }).click();
  await page.goBack();
  await page.getByRole("button", { name: /publish/i }).click();
  await expect(page).toHaveURL(/\/p\/.+/);
  await page.getByRole("button", { name: /remix this plan/i }).click();
  await expect(page).toHaveURL(/\/plan\/.+\/edit/);
});
