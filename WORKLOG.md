# WORKLOG

## 2026-07-31

- Scaffolded RR7 app (`create-react-router` default template) at repo root, added zod/postgres/idb/nanoid/@resvg-js deps plus vitest/fake-indexeddb/@playwright/test/vite-tsconfig-paths dev deps, wired `vitest.config.ts` and npm scripts (dev/build/start/test/test:e2e/db:migrate); `npm run build` passes.

## 2026-08-01

- Executed the full 18-task SDD plan via subagents: exercise library, plan-generation library, wizard, remix, ramp/streaks logic, local-first IndexedDB store, moderation, and publish server modules; 7 routes (wizard, editor, companion/today, print, published+card, gallery, admin); founding plan seeded via `scripts/seed-founding-plan.ts`. Test suite: 103 Vitest tests (92 unit, 11 Postgres-backed) plus a Playwright end-to-end smoke test, all green. Set production `start` script to run migrations on boot (`npm run db:migrate && react-router-serve ./build/server/index.js`), rewrote root `README.md` for the shipped app. Ready for deploy (push/Coolify deferred to a follow-up session).

## 2026-08-01 — deployed
- Merged to main (fast-forward, 28 commits) and pushed. Deployed via ship-webapp: Coolify app `nsxys5fchjnqxcgnhippepaj`, Nixpacks, node 24 (`.nvmrc`), tunnel route + DNS. Fixed deploy blocker (lockfile missing linux-side `@emnapi/runtime`; regenerated). Seeded + featured founding plan `/p/dJl8iS9qtp` via the live publish/admin actions. Live: https://tennis.zebraproject.org

## 2026-08-31 — remix dead-click fix verified
- User-reported: Remix button "does nothing" on published plans. Root cause: pre-hydration click window (SSR renders the button before React attaches handlers; long on slow connections). Fix `56f8568`: remix/report buttons disabled + "Loading…" until hydrated. Verified live under throttled network: early state disabled, click after hydration navigates to editor.

## 2026-08-31 — "Championship Order of Play" restyle
- Full visual restyle per the Claude Design brief (Wimbledon elegance × US Open energy): Fraunces display serif + Archivo body, grass/ivory/court-blue/optic token system in Tailwind @theme, restyled hero, gallery, wizard, editor, companion, published pages. Print sheets untouched (heritage). Design system pushed to Claude Design project "Tennis Workout Builder".

## 2026-08-31 — UX polish batch (user feedback session)
- Print reachable from editor + Your Plans; public plans get direct /p/:slug/print (retired "Remix to print"). Icons on action buttons. Hydration dead-click fix on published pages. Delete plans (two-tap confirm, cleans session logs). Local-vs-published clarity: dashed device panel, per-plan "This device only"/"Published" chips, editor publish-status line. Export/import moved into Advanced disclosure. "Championship Order of Play" restyle + amped hero shipped; design system pushed to Claude Design.

## 2026-08-31 — custom exercises + admin promotion pipeline
- Players can create custom exercises in the editor picker (stored in the plan doc, schema-additive customExercises field, moderated free text, derived video search links, "custom" tags everywhere, no injury logic). Admin gained a "Custom exercise candidates" section: custom exercises across published plans grouped by name with usage counts + copyable library-entry templates whose TODOs (pattern/equipment/goals/injuryLoad) make promotion a deliberate curation step.
