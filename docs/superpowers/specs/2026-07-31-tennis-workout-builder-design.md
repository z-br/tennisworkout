# Tennis Workout Builder — Design Spec

**Date:** 2026-07-31
**Status:** Approved pending user review
**Working name:** Tennis Workout Builder — launches on `tennis.zebraproject.org`. A distinct product name/domain can be adopted later with zero architectural impact (it's a Cloudflare zone + tunnel-route change).

## 1. Concept

A free web app for building, using, and sharing tennis-specific workout plans. Seeded by Greg's existing plan ([Tennis_Workout_Plan.md](../../../Tennis_Workout_Plan.md)): 4-day strength program, daily elbow protocol, pre-match warm-up, 8-week ramp, symptom gates. The insight: the plan is personal (body, goals, equipment, injuries), but the *structure* generalizes. The product makes it easy for any tennis player to get a plan fitted to them — and to share and remix plans with others.

Non-goals: no payments ever, no user accounts, no native apps, no non-tennis sports (v1).

## 2. Decisions made (interview summary)

| Question | Decision |
|---|---|
| Creation flow | Guided wizard **and** remix-any-plan editor |
| Usage mode | Full workout companion (phone-first tracking) **plus** printable one-pagers/warm-up cards |
| Identity/data | No accounts. Local-first (IndexedDB); publishing mints anonymous share links |
| Discovery | Public gallery + direct links |
| Generation | Rule-based from a curated exercise library now; optional AI polish later |
| Architecture | React Router 7 full-stack (framework mode), single app |
| Hosting | Coolify + Cloudflare Tunnel via ship-webapp; `tennis.zebraproject.org`; shared Postgres, schema `tennisworkout` |

## 3. Surfaces (routes)

1. **Home / Explore (`/`)** — gallery of published plans as cards: name, goal focus, days/week, equipment icons, remix count. Filters: goal, equipment, days/week. Featured plans (admin-picked) sort first. Greg's plan is the founding seed plan.
2. **Wizard (`/build`)** — steps: goals (power, footwork, injury management, general fitness) → days/week → equipment checklist → injury flags (elbow, shoulder, knee, foot/plantar, none) → generates a draft plan from the exercise library → opens in the editor.
3. **Editor (`/plan/:id/edit`)** — remix surface. Reorder days; swap any exercise (suggestions filtered to same movement pattern + owned equipment); edit sets/reps/tempo/notes; add/remove warm-up items, finishers, daily protocols. Every published plan has a **Remix** button that clones it into the local editor.
4. **Companion (`/plan/:id/today`)** — phone-first session runner. See §6.
5. **Published plan (`/p/:slug`)** — server-rendered public view of a published plan, with OG meta tags + generated share-card image. Remix button.
6. **Printables (`/plan/:id/print`)** — auto-generated one-pager and warm-up card (style of the existing `Tennis_Workout_OnePager.html` / `PreMatch_Warmup_Card.html`), print-CSS.
7. **Admin (`/admin?token=…`)** — env-secret-protected; hide/unhide/feature published plans. No auth system.

## 4. Data model

### Plan document (core structure)

One versioned JSON object (`schemaVersion` field):

- **Metadata:** name, description, goal tags, equipment used, days/week, `remixOf` (slug lineage).
- **Days[]:** label + focus; warm-up items; main work; optional finisher. Exercises reference the library by id, with per-plan overrides: sets, reps, tempo, load notes, free-text notes.
- **Daily protocols[]:** standalone routines done every day, separate from workout days (e.g. the elbow protocol). Rendered as a persistent daily card.
- **Ramp schedule (optional):** phases with week ranges and % targets (generalization of the 8-week table). Companion computes current-phase doses.
- **Injury config:** flags + symptom-gate rules (pain thresholds → proceed/hold/drop-20%).

### Exercise library

Curated, versioned data file in the repo (~80–120 entries at v1; seeded from Greg's plan + standard tennis S&C movements). Per entry: name; movement pattern (hinge, squat, push, pull, rotation, carry, plyo, mobility, tendon-rehab); equipment required; goal tags; injury flags (e.g. `elbow-loading: high`, `elbow-safe`); coaching cues; video demo link (YouTube search-URL pattern, as in the source plan); optional progression levels (push-up L1–L6, pull-up L1–L5 style ladders). The library powers wizard assembly and editor swap suggestions.

### Storage split

- **Browser (IndexedDB):** the user's plans (drafts + adopted/remixed copies), workout logs, current ramp phase, streaks. Export/import as a JSON file for backup or device transfer. No sync.
- **Postgres (schema `tennisworkout`):** published plans only. Table `published_plans`: id/slug, plan JSON (jsonb), created_at, remix_of, remix_count, report_count, hidden, featured. No users table, no sessions.

## 5. Publishing, sharing, moderation

- **Publish:** POST plan JSON to a server action → schema-validated + size-capped → mint slug → live at `/p/:slug`.
- **Immutable:** published plans never change. "Update" = publish a new version (new slug, `remixOf` lineage back to predecessor; old links keep working). Kills edit-spam; keeps shared links stable.
- **Link previews:** `/p/:slug` server-renders with OG tags + a generated share-card image (plan name, focus, equipment icons) so links unfurl well in group chats — the primary sharing channel.
- **Moderation (anonymous publishing risk):** plans are structured text only — no images, no HTML. Free-text fields get length caps + profanity/URL filter at publish time. **Report** button on public plans: 3 reports auto-hides the plan pending review. Admin route to hide/feature. Featured plans lead the gallery.
- **Remix lineage:** public plans show "Remixed from *X*" credit; gallery cards show remix counts.

## 6. Workout companion

- **No fixed calendar.** Plans run as "next session" (Day 1 → 2 → … → repeat), honoring rest-day guidance as text, not scheduling.
- **Session screen:** warm-up as collapsible checklist; main work as cards showing this-phase target vs. last-logged numbers; tap-to-log actuals; rest-timer chip; per-exercise video link.
- **Daily protocols:** persistent home-screen card, every day, with a streak counter (frequency is the active ingredient; the streak is the motivator).
- **Symptom gate:** after logging a flagged exercise, optional 0–10 pain slider; answers drive hold / drop-20% suggestions per the plan's gate rules.
- **Ramp engine:** computes current week's doses from the phase table; prompts "gate stayed green?" before advancing phases.
- **Progression ladders:** level-based exercises render as ladders with move-up criteria.

### v1 simplifications

Two bullets above ship narrower in v1 than described; both are post-v1 follow-ups, not open bugs:

- **Ramp phase advancement** is calendar-week only — the phase table advances automatically off `startedAt` + elapsed weeks. There's no explicit "gate stayed green?" prompt gating the advance; the symptom gate still drives hold/drop-20% suggestions during a session, it just doesn't block moving to the next phase.
- **Symptom gate input** is the during-session 0–10 pain slider only. The "worse next morning" follow-up input described for the gate is deferred; next-day soreness isn't captured or fed back into gate decisions yet.

## 7. Architecture

- **React Router 7, framework mode** (precedent: The Rose Light on the same infra). SSR for `/`, `/p/:slug` (SEO + link previews); client-side interactivity for wizard/editor/companion.
- **Server:** RR7 loaders/actions; Postgres via the shared instance (schema-per-project convention, role `tennisworkout_app`); migrations run on start (Rose Light pattern: `npm run db:migrate:deploy && npm run start`).
- **Wizard generation is pure code:** deterministic rules over the library (filter by equipment/injury flags → pick per movement-pattern slots per goal → assemble days). Fully unit-testable. An optional "refine with AI" step may be added post-v1; nothing in v1 depends on it.
- **Client storage:** IndexedDB via a thin wrapper; `schemaVersion` migrations run on read so old exports/published plans always load.

## 8. Error handling

- Local-first: workouts run fully offline once loaded; most network failures can't lose data.
- Publish failure: clear error + retry; the plan remains local regardless.
- IndexedDB unavailable (private browsing): degrade to in-memory + warning banner.
- Invalid/oversized publish payloads: rejected server-side with schema errors.

## 9. Testing

- **Vitest (core logic):** wizard generation rules, ramp math, symptom-gate logic, schema validation + migrations. This is where the real complexity lives.
- **Library validation test:** every entry well-formed; for each movement pattern × common equipment sets, at least one substitution reachable.
- **Playwright smoke:** wizard → plan → companion log → publish → visit `/p/:slug` → remix.

## 10. Ops & conventions

- Repo: `z-br/tennisworkout` (this repo, restructured into an app; existing plan files kept and mined as seed content).
- Deploy via **ship-webapp**: dedicated Coolify project, Nixpacks, app domain `http://tennis.zebraproject.org` (Cloudflare terminates TLS), tunnel route, `GET /` healthcheck, `pg-provision` for schema `tennisworkout` + role `tennisworkout_app`.
- **WORKLOG.md** at repo root per hub convention; hub gets `projects/tennisworkout/` (readme/todo/notes/ideas).

## 11. v1 cut line

**In v1:** all seven surfaces; exercise library; rule-based wizard; editor/remix; companion with logging, ramp engine, streaks, symptom gate; publish + gallery + reports + admin; printables; export/import; share-card OG images.

**Explicitly post-v1:** AI plan refinement; accounts/sync of any kind; comments/ratings; non-tennis sports; PWA offline-install polish; localization.
