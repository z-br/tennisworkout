import { defineConfig, devices } from "@playwright/test";

// End-to-end smoke test config.
//
// Requires a reachable Postgres with migrations applied. Point
// TEST_DATABASE_URL (or DATABASE_URL) at it, or spin up a throwaway
// container and run the migration script before `npm run test:e2e`:
//
//   docker run --rm -d --name twtest17 -p 5434:5432 -e POSTGRES_PASSWORD=t postgres:16
//   # wait for pg_isready, then:
//   DATABASE_URL=postgres://postgres:t@localhost:5434/postgres \
//     node --experimental-strip-types scripts/migrate.ts
//   DATABASE_URL=postgres://postgres:t@localhost:5434/postgres npm run test:e2e
//
// Defaults to localhost:5434 (matching the throwaway container above) so
// `npm run test:e2e` works out of the box once that container is running.
const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgres://postgres:t@localhost:5434/postgres";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  // Warms the Vite dev server with a throwaway navigation before the real
  // spec runs — see tests/e2e/global-setup.ts for why.
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    port: 5173,
    reuseExistingServer: true,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
