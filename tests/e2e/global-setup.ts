import { chromium, type FullConfig } from "@playwright/test";

// Framework-mode React Router has no index.html for Vite to crawl for entry
// points, so on a cold `npm run dev` start Vite only discovers deps to
// pre-bundle once a real browser requests the client entry module. That
// first request can race the dependency optimizer and force a full reload
// mid-hydration, leaving event handlers unattached — the smoke spec would
// see buttons that never become interactive. Warming the dev server with a
// throwaway navigation (and one retry) here, before the real test runs,
// absorbs that race so the spec itself doesn't need reload/retry logic.
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:5173";
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.goto(`${baseURL}/build`, { waitUntil: "load" });
      try {
        await page.getByTestId("goal-power").click({ timeout: 5_000 });
        await page
          .getByRole("button", { name: /next/i })
          .and(page.locator(":not([disabled])"))
          .waitFor({ timeout: 5_000 });
        return; // hydrated and interactive — dev server is warm
      } catch {
        // Not hydrated yet (or reloaded mid-click) — retry with a fresh load.
      }
    }
  } finally {
    await browser.close();
  }
}
