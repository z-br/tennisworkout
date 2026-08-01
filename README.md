# Tennis Workout Builder

A free, no-accounts tennis workout builder. Answer a few questions in a
wizard, get a personalized multi-week strength/conditioning plan, and take it
to the court from your phone. Plans can be remixed, printed, and shared via
public links into a gallery — no login required.

## What it does

- **Wizard** — goals, equipment, injury flags, days/week → generates a
  structured plan (warm-up, main sets, finisher) across weeks.
- **Remix** — fork any plan (your own or a shared one) and tweak it.
- **Companion mode** — phone-first "today's session" view with a rep/set
  tracker and simple session logging.
- **Printables** — a print-friendly plan view and a warm-up card.
- **Share links + gallery** — publish a plan to get a public URL; published
  plans appear in a browsable gallery with basic moderation (report/hide,
  admin controls).
- **No accounts.** Everything you build lives locally first.

## Data model

- **Local-first**: plans, session logs, and streaks live in the browser via
  IndexedDB (see `app/lib/store/local.ts`), with export/import to JSON so you can
  back up or move a plan between devices.
- **Postgres** is used only for the publish/gallery/moderation surface —
  published plans, remix lineage, report counts. Nothing about your local
  drafts or session history touches the server.

## Stack

- [React Router](https://reactrouter.com/) (framework mode, SSR) + TypeScript
- Tailwind CSS v4
- [Zod](https://zod.dev/) for schema validation (plan docs, forms, API input)
- [postgres.js](https://github.com/porsager/postgres) for the publish/gallery DB
- [idb](https://github.com/jakearchibald/idb) for local-first IndexedDB storage
- Vitest (unit) + Playwright (end-to-end smoke)

## Dev setup

```bash
npm install
npm run dev        # http://localhost:5173
```

Publish/gallery/admin routes need Postgres. Spin up a throwaway one and run
migrations:

```bash
docker run --rm -d --name twdb -p 5434:5432 -e POSTGRES_PASSWORD=t postgres:16
DATABASE_URL=postgres://postgres:t@localhost:5434/postgres npm run db:migrate
DATABASE_URL=postgres://postgres:t@localhost:5434/postgres npm run dev
```

`db:migrate` creates the `tennisworkout` schema and applies
`migrations/*.sql`. Without `DATABASE_URL` set, the wizard/local/companion
surfaces work fine; publish/gallery/admin routes will error.

## Tests

```bash
npx vitest run                     # unit tests (DB-backed ones skip without a DB)
TEST_DATABASE_URL=postgres://postgres:t@localhost:5434/postgres npx vitest run   # full suite incl. DB tests
npm run typecheck                  # react-router typegen + tsc

# End-to-end smoke (needs Postgres with migrations applied, see playwright.config.ts):
DATABASE_URL=postgres://postgres:t@localhost:5434/postgres npm run test:e2e
```

## Deploy

Runs on Coolify (Nixpacks build) at `https://tennis.zebraproject.org`.
Environment: `DATABASE_URL` (Postgres, schema `tennisworkout`) and
`ADMIN_TOKEN` (gates the admin/moderation routes). The `start` script runs
migrations before booting the server (`npm run db:migrate && react-router-serve
./build/server/index.js`), so deploys are self-migrating. After the first
deploy, seed the gallery with the founding plan:

```bash
DATABASE_URL=... ADMIN_TOKEN=... node --experimental-strip-types scripts/seed-founding-plan.ts
```

## Source content

`Tennis_Workout_Plan.md`, `Tennis_Workout_OnePager.html`, and
`PreMatch_Warmup_Card.html` at the repo root are the original hand-written
plan documents this app was built from — they're the source material behind
the seeded founding plan and exercise library, kept for reference.
