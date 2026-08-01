# Tennis Workout Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A free React Router 7 web app where tennis players build personalized workout plans (wizard or remix), track workouts phone-first, print one-pagers, and share plans by link into a public gallery.

**Architecture:** Single RR7 framework-mode app. All plan/wizard/ramp logic is pure TypeScript in `app/lib/` (unit-tested, no framework deps). Personal data lives in IndexedDB; only published plans hit Postgres (schema `tennisworkout`, shared instance). SSR for the gallery and `/p/:slug` share pages.

**Tech Stack:** React Router 7 (framework mode) · TypeScript · Tailwind (from RR7 template) · Zod · postgres.js · idb · nanoid · @resvg/resvg-js · Vitest + fake-indexeddb · Playwright

**Spec:** `docs/superpowers/specs/2026-07-31-tennis-workout-builder-design.md` — read it first.

## Global Constraints

- No accounts, no sessions, no cookies for identity. The only server-side state is the `published_plans` table.
- Published plans are **immutable**: publishing always inserts a new row/slug; there is no update path.
- Plan JSON always carries `schemaVersion` (currently `1`); anything reading plan JSON goes through `migratePlan()`.
- All core logic (schema, wizard, ramp, gate, streaks, moderation) is pure functions in `app/lib/**` — no React, no DB, no fetch — so it's unit-testable.
- Postgres access is server-only (`*.server.ts` files), via `DATABASE_URL`, with `search_path=tennisworkout`.
- Publish payload cap: 100 KB. Free-text field caps: name 80 chars, description 500, notes 200.
- Report auto-hide threshold: 3 reports.
- Admin auth: query/header token compared to env `ADMIN_TOKEN`. No auth framework.
- Video links use the YouTube-search-URL pattern: `https://www.youtube.com/results?search_query=<terms>+shorts`.
- Every session appends to `WORKLOG.md` (timestamped) per hub convention.
- Commit after every green test cycle. TDD for all `app/lib/**` logic.

## File Structure

```
app/
  root.tsx, routes.ts, app.css          # RR7 scaffold
  lib/
    plan/schema.ts                      # Zod schema, types, validatePlan, migratePlan
    plan/ramp.ts                        # phase math + symptom gate
    exercises/library.ts                # Exercise type + EXERCISES data + substitutions()
    wizard/generate.ts                  # generatePlan(WizardInput) -> PlanDoc
    store/local.ts                      # IndexedDB wrapper + export/import + streaks
    moderation.ts                       # text filters (pure)
    db.server.ts                        # postgres.js client
    publish.server.ts                   # publishPlan, getPublished, listGallery, report, admin ops
  routes/
    home.tsx                            # / gallery
    build.tsx                           # /build wizard
    plan.edit.tsx                       # /plan/:id/edit
    plan.today.tsx                      # /plan/:id/today
    plan.print.tsx                      # /plan/:id/print
    published.tsx                       # /p/:slug
    published-card.tsx                  # /p/:slug/card.png (resource route)
    api.report.tsx                      # POST report
    admin.tsx                           # /admin
  components/                           # shared UI (PlanCard, ExercisePicker, …)
migrations/001_published_plans.sql
scripts/migrate.ts                      # run pending migrations (also runs on deploy start)
scripts/seed-founding-plan.ts           # publish Greg's plan, featured
tests/e2e/smoke.spec.ts                 # Playwright
WORKLOG.md
```

Existing content files (`Tennis_Workout_Plan.md`, `*_OnePager.html`, `PreMatch_Warmup_Card.*`) stay at repo root as source material; the seed script and library content are derived from them by hand.

---

### Task 1: Scaffold the RR7 app + test tooling

**Files:**
- Create: RR7 template output (`app/`, `vite.config.ts`, `package.json`, …)
- Create: `vitest.config.ts`, `WORKLOG.md`
- Modify: `package.json` (scripts, deps)

**Interfaces:**
- Produces: working `npm run dev` / `npm run build` / `npm test`; path alias `~/*` → `app/*` (RR7 template default) used by every later import.

- [ ] **Step 1: Scaffold in repo root**

```bash
npx create-react-router@latest . --no-git-init --install --template react-router/templates/default
```

(Existing md/html/png files are untouched; if the CLI balks at a non-empty dir, scaffold into `tmp-app/` and `rsync -a tmp-app/ ./ && rm -rf tmp-app`.)

- [ ] **Step 2: Add dependencies**

```bash
npm i zod postgres idb nanoid @resvg/resvg-js
npm i -D vitest fake-indexeddb @playwright/test
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: { include: ["app/**/*.test.ts", "scripts/**/*.test.ts"] },
});
```

```bash
npm i -D vite-tsconfig-paths
```

- [ ] **Step 4: Add scripts to `package.json`**

```json
"scripts": {
  "dev": "react-router dev",
  "build": "react-router build",
  "start": "react-router-serve ./build/server/index.js",
  "test": "vitest run",
  "test:e2e": "playwright test",
  "db:migrate": "node --experimental-strip-types scripts/migrate.ts"
}
```

- [ ] **Step 5: Verify dev server boots**

Run: `npm run build`
Expected: build completes; `build/server/index.js` exists.

- [ ] **Step 6: Create `WORKLOG.md`** with a first dated entry ("scaffolded RR7 app"), then commit.

```bash
git add -A && git commit -m "feat: scaffold React Router 7 app with test tooling"
```

---

### Task 2: Plan schema, validation, migration

**Files:**
- Create: `app/lib/plan/schema.ts`
- Test: `app/lib/plan/schema.test.ts`

**Interfaces:**
- Produces (used by every later task):

```ts
export const SCHEMA_VERSION = 1;
export type Goal = "power" | "footwork" | "injury-management" | "general-fitness";
export type Equipment = "kettlebell" | "dumbbell" | "trx" | "bands" | "pullup-bar"
  | "medicine-ball" | "balance-board" | "flexbar" | "bench" | "none";
export type InjuryFlag = "elbow" | "shoulder" | "knee" | "foot";
export type PlanExercise = { exerciseId: string; sets?: number; reps?: string;
  tempo?: string; loadNote?: string; note?: string; targetSets?: number; targetReps?: string };
export type PlanDay = { label: string; focus: string; warmup: PlanExercise[];
  main: PlanExercise[]; finisher?: PlanExercise[] };
export type Protocol = { name: string; items: PlanExercise[]; cue?: string };
export type RampPhase = { name: string; weeks: [number, number]; pct: number; note?: string };
export type InjuryConfig = { flags: InjuryFlag[]; gate: { proceedMax: number; dropPct: number } };
export type PlanMeta = { name: string; description: string; goals: Goal[];
  equipment: Equipment[]; daysPerWeek: number; remixOf?: string };
export type PlanDoc = { schemaVersion: number; meta: PlanMeta; days: PlanDay[];
  dailyProtocols: Protocol[]; ramp?: { phases: RampPhase[] }; injuryConfig: InjuryConfig };
export function validatePlan(json: unknown): PlanDoc;   // throws ZodError
export function migratePlan(json: unknown): PlanDoc;    // migrates old versions, then validates
```

- [ ] **Step 1: Write failing tests** in `app/lib/plan/schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { migratePlan, validatePlan, SCHEMA_VERSION } from "./schema";

const minimal = {
  schemaVersion: SCHEMA_VERSION,
  meta: { name: "Test", description: "", goals: ["power"], equipment: ["kettlebell"], daysPerWeek: 2 },
  days: [{ label: "Day 1", focus: "Power", warmup: [], main: [{ exerciseId: "kb-swing", sets: 3, reps: "12" }] }],
  dailyProtocols: [],
  injuryConfig: { flags: [], gate: { proceedMax: 3, dropPct: 20 } },
};

describe("validatePlan", () => {
  it("accepts a minimal valid plan", () => {
    expect(validatePlan(minimal).meta.name).toBe("Test");
  });
  it("rejects a plan with no days", () => {
    expect(() => validatePlan({ ...minimal, days: [] })).toThrow();
  });
  it("rejects names over 80 chars", () => {
    expect(() => validatePlan({ ...minimal, meta: { ...minimal.meta, name: "x".repeat(81) } })).toThrow();
  });
  it("rejects unknown schemaVersion", () => {
    expect(() => validatePlan({ ...minimal, schemaVersion: 99 })).toThrow();
  });
});

describe("migratePlan", () => {
  it("passes through current version", () => {
    expect(migratePlan(minimal).schemaVersion).toBe(SCHEMA_VERSION);
  });
  it("throws a readable error for garbage", () => {
    expect(() => migratePlan({ hello: 1 })).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run app/lib/plan/schema.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement `app/lib/plan/schema.ts`**

```ts
import { z } from "zod";

export const SCHEMA_VERSION = 1;

export const GOALS = ["power", "footwork", "injury-management", "general-fitness"] as const;
export const EQUIPMENT = ["kettlebell", "dumbbell", "trx", "bands", "pullup-bar",
  "medicine-ball", "balance-board", "flexbar", "bench", "none"] as const;
export const INJURY_FLAGS = ["elbow", "shoulder", "knee", "foot"] as const;

const planExercise = z.object({
  exerciseId: z.string().min(1),
  sets: z.number().int().positive().optional(),
  reps: z.string().max(40).optional(),
  tempo: z.string().max(40).optional(),
  loadNote: z.string().max(200).optional(),
  note: z.string().max(200).optional(),
  targetSets: z.number().int().positive().optional(),
  targetReps: z.string().max(40).optional(),
});

const planDay = z.object({
  label: z.string().min(1).max(40),
  focus: z.string().max(120),
  warmup: z.array(planExercise),
  main: z.array(planExercise).min(1),
  finisher: z.array(planExercise).optional(),
});

const planSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  meta: z.object({
    name: z.string().min(1).max(80),
    description: z.string().max(500),
    goals: z.array(z.enum(GOALS)).min(1),
    equipment: z.array(z.enum(EQUIPMENT)),
    daysPerWeek: z.number().int().min(1).max(7),
    remixOf: z.string().optional(),
  }),
  days: z.array(planDay).min(1).max(7),
  dailyProtocols: z.array(z.object({
    name: z.string().min(1).max(80),
    items: z.array(planExercise).min(1),
    cue: z.string().max(200).optional(),
  })),
  ramp: z.object({
    phases: z.array(z.object({
      name: z.string().max(40),
      weeks: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
      pct: z.number().min(10).max(150),
      note: z.string().max(200).optional(),
    })).min(1),
  }).optional(),
  injuryConfig: z.object({
    flags: z.array(z.enum(INJURY_FLAGS)),
    gate: z.object({ proceedMax: z.number().min(0).max(10), dropPct: z.number().min(0).max(100) }),
  }),
});

export type PlanDoc = z.infer<typeof planSchema>;
export type PlanMeta = PlanDoc["meta"];
export type PlanDay = z.infer<typeof planDay>;
export type PlanExercise = z.infer<typeof planExercise>;
export type Protocol = PlanDoc["dailyProtocols"][number];
export type RampPhase = NonNullable<PlanDoc["ramp"]>["phases"][number];
export type InjuryConfig = PlanDoc["injuryConfig"];
export type Goal = (typeof GOALS)[number];
export type Equipment = (typeof EQUIPMENT)[number];
export type InjuryFlag = (typeof INJURY_FLAGS)[number];

export function validatePlan(json: unknown): PlanDoc {
  return planSchema.parse(json);
}

// v1 is the only version; the switch is the extension point for future migrations.
export function migratePlan(json: unknown): PlanDoc {
  const version = (json as { schemaVersion?: number })?.schemaVersion;
  switch (version) {
    case SCHEMA_VERSION:
      return validatePlan(json);
    default:
      throw new Error(`Unsupported plan schemaVersion: ${String(version)}`);
  }
}
```

- [ ] **Step 4: Run tests** — `npx vitest run app/lib/plan/schema.test.ts` → PASS.

- [ ] **Step 5: Commit** — `git add app/lib/plan && git commit -m "feat: plan document schema with validation and migration entry point"`

---

### Task 3: Exercise library

**Files:**
- Create: `app/lib/exercises/library.ts`
- Test: `app/lib/exercises/library.test.ts`

**Interfaces:**
- Consumes: `Goal`, `Equipment`, `InjuryFlag` from `~/lib/plan/schema`.
- Produces:

```ts
export type Pattern = "hinge" | "squat" | "push" | "pull" | "rotation" | "carry"
  | "plyo" | "mobility" | "tendon-rehab" | "balance" | "conditioning";
export type Exercise = { id: string; name: string; pattern: Pattern;
  equipment: Equipment[];            // empty array = bodyweight/no equipment
  goals: Goal[];
  injuryLoad: Partial<Record<InjuryFlag, "high" | "moderate" | "safe" | "rehab">>;
  cues: string; video: string;       // YouTube search URL
  levels?: string[] };               // progression ladder names, L1 first
export const EXERCISES: Exercise[];
export function getExercise(id: string): Exercise | undefined;
export function substitutions(exerciseId: string, owned: Equipment[]): Exercise[];
```

**Content note:** seed ~45 entries transcribed from `Tennis_Workout_Plan.md` (every exercise in that plan, including warm-up drills, the 5 elbow-protocol movements, and the push-up/pull-up ladders) plus bodyweight/band alternates for each main movement pattern so `substitutions()` always has answers for minimal-equipment users. Growing to 80–120 entries is content work done post-v1 — the validation test defines "done" structurally, not by count.

- [ ] **Step 1: Write failing tests** in `app/lib/exercises/library.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { EXERCISES, getExercise, substitutions } from "./library";

describe("library integrity", () => {
  it("has unique, kebab-case ids", () => {
    const ids = EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
  it("every entry has cues and a youtube search video link", () => {
    for (const e of EXERCISES) {
      expect(e.cues.length).toBeGreaterThan(10);
      expect(e.video).toContain("youtube.com/results?search_query=");
    }
  });
  it("contains the seed plan's anchor movements", () => {
    for (const id of ["kb-swing", "bulgarian-split-squat", "lateral-bound",
      "tyler-twist", "pallof-press", "pushup", "pullup"]) {
      expect(getExercise(id), id).toBeDefined();
    }
  });
  it("elbow-rehab movements are tagged tendon-rehab", () => {
    expect(getExercise("tyler-twist")!.pattern).toBe("tendon-rehab");
  });
});

describe("substitutions", () => {
  it("suggests same-pattern exercises doable with owned equipment", () => {
    const subs = substitutions("kb-swing", ["dumbbell"]);
    expect(subs.length).toBeGreaterThan(0);
    for (const s of subs) {
      expect(s.pattern).toBe("hinge");
      expect(s.id).not.toBe("kb-swing");
      expect(s.equipment.every((eq) => ["dumbbell"].includes(eq) || eq === "none")).toBe(true);
    }
  });
  it("every main pattern has a no-equipment option", () => {
    for (const pattern of ["hinge", "squat", "push", "pull", "rotation", "plyo"]) {
      const options = EXERCISES.filter((e) => e.pattern === pattern && e.equipment.length === 0);
      expect(options.length, pattern).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run app/lib/exercises/library.test.ts` → FAIL.

- [ ] **Step 3: Implement `app/lib/exercises/library.ts`.** Shape:

```ts
import type { Equipment, Goal, InjuryFlag } from "~/lib/plan/schema";

export type Pattern = "hinge" | "squat" | "push" | "pull" | "rotation" | "carry"
  | "plyo" | "mobility" | "tendon-rehab" | "balance" | "conditioning";

export type Exercise = {
  id: string; name: string; pattern: Pattern; equipment: Equipment[];
  goals: Goal[]; injuryLoad: Partial<Record<InjuryFlag, "high" | "moderate" | "safe" | "rehab">>;
  cues: string; video: string; levels?: string[];
};

const yt = (q: string) => `https://www.youtube.com/results?search_query=${q.replaceAll(" ", "+")}+shorts`;

export const EXERCISES: Exercise[] = [
  {
    id: "kb-swing", name: "Kettlebell Swing", pattern: "hinge",
    equipment: ["kettlebell"], goals: ["power", "general-fitness"],
    injuryLoad: { elbow: "moderate" },
    cues: "Hip hinge power. Drive hips hard, brace at the top, relaxed grip.",
    video: yt("kettlebell swing proper form"),
  },
  {
    id: "tyler-twist", name: "Tyler Twist (FlexBar)", pattern: "tendon-rehab",
    equipment: ["flexbar"], goals: ["injury-management"],
    injuryLoad: { elbow: "rehab" },
    cues: "Affected arm at bottom palm down; top hand twists, bottom hand slowly untwists.",
    video: yt("tyler twist flexbar tennis elbow"),
  },
  // … ~43 more entries transcribed from Tennis_Workout_Plan.md + bodyweight/band
  //   alternates per pattern (e.g. "good-morning-bodyweight" hinge, "split-squat" squat,
  //   "band-row" pull, "shadow-swing-rotation" rotation, "broad-jump" plyo).
];

export function getExercise(id: string) {
  return EXERCISES.find((e) => e.id === id);
}

export function substitutions(exerciseId: string, owned: Equipment[]): Exercise[] {
  const base = getExercise(exerciseId);
  if (!base) return [];
  return EXERCISES.filter((e) =>
    e.id !== exerciseId &&
    e.pattern === base.pattern &&
    e.equipment.every((eq) => eq === "none" || owned.includes(eq)),
  );
}
```

The implementer transcribes the full entry set from `Tennis_Workout_Plan.md` — every exercise, warm-up drill, protocol movement, and ladder in that file becomes an entry (ladders via `levels`, e.g. pushup `levels: ["Incline", "Knee", "Full", "Feet-elevated", "Explosive", "TRX Atomic"]`). Copy cues verbatim from the plan where they exist.

- [ ] **Step 4: Run tests** → PASS. Also run `npx vitest run` (whole suite) → PASS.

- [ ] **Step 5: Commit** — `git commit -am "feat: curated exercise library with substitution engine"`

---

### Task 4: Wizard generation engine

**Files:**
- Create: `app/lib/wizard/generate.ts`
- Test: `app/lib/wizard/generate.test.ts`

**Interfaces:**
- Consumes: `EXERCISES`, `substitutions` (Task 3); `PlanDoc`, types (Task 2).
- Produces:

```ts
export type WizardInput = { goals: Goal[]; daysPerWeek: 2 | 3 | 4;
  equipment: Equipment[]; injuries: InjuryFlag[] };
export function generatePlan(input: WizardInput): PlanDoc;  // deterministic
```

**Generation rules (the actual algorithm — implement exactly):**
1. **Day templates by daysPerWeek:** 4 → [lower-power, upper-rotation, full-explosive, core-stability] (mirrors the seed plan); 3 → [lower-power, upper-rotation, full-explosive]; 2 → [full-power, core-stability]. Each template is a list of pattern slots, e.g. lower-power = [hinge, squat, plyo, balance], upper-rotation = [pull, push, rotation, carry], full-explosive = [hinge, plyo, push, conditioning], core-stability = [rotation, carry, balance, mobility].
2. **Slot filling:** for each slot, candidates = EXERCISES matching pattern, doable with owned equipment (or equipment-free), not already used in the plan. Score: +2 per matching goal tag, +1 if `injuryLoad[flag]` is `"safe"` for every flagged injury, **exclude** if `"high"` for a flagged injury. Pick highest score; tie-break alphabetically by id (determinism).
3. **Doses:** defaults by pattern — strength patterns (hinge/squat/push/pull) `sets: 2, reps: "8–10", targetSets: 3`; plyo `sets: 2, reps: "4–6", targetSets: 3` ; rotation/carry/balance `sets: 2–3` ; mobility no sets. (Starting dose < target = built-in ramp headroom, mirroring the seed plan.)
4. **Warm-ups:** each day gets 3 mobility/warm-up entries matched to the day's first two patterns.
5. **Injuries → protocols:** `elbow` adds the full 5-item daily elbow protocol as a `dailyProtocols` entry and sets `injuryConfig.flags`; `foot` biases calf/balance work into lower days.
6. **Ramp:** every generated plan gets the 4-phase / 8-week ramp (70/80/90/100%).

- [ ] **Step 1: Write failing tests:**

```ts
import { describe, expect, it } from "vitest";
import { generatePlan } from "./generate";
import { validatePlan } from "~/lib/plan/schema";
import { getExercise } from "~/lib/exercises/library";

const base = { goals: ["power"], daysPerWeek: 4, equipment: ["kettlebell", "dumbbell", "bands"], injuries: [] } as const;

describe("generatePlan", () => {
  it("produces a valid PlanDoc with the requested day count", () => {
    const plan = generatePlan({ ...base });
    expect(validatePlan(plan).days).toHaveLength(4);
  });
  it("is deterministic", () => {
    expect(generatePlan({ ...base })).toEqual(generatePlan({ ...base }));
  });
  it("never selects exercises needing unowned equipment", () => {
    const plan = generatePlan({ ...base, equipment: ["bands"] });
    for (const day of plan.days) for (const ex of [...day.warmup, ...day.main]) {
      const e = getExercise(ex.exerciseId)!;
      expect(e.equipment.every((eq) => eq === "none" || eq === "bands"), e.id).toBe(true);
    }
  });
  it("excludes high-elbow-load exercises and adds the elbow protocol when elbow is flagged", () => {
    const plan = generatePlan({ ...base, injuries: ["elbow"] });
    expect(plan.dailyProtocols.some((p) => p.name.toLowerCase().includes("elbow"))).toBe(true);
    expect(plan.injuryConfig.flags).toContain("elbow");
    for (const day of plan.days) for (const ex of day.main) {
      expect(getExercise(ex.exerciseId)!.injuryLoad.elbow).not.toBe("high");
    }
  });
  it("attaches the default 8-week ramp", () => {
    expect(generatePlan({ ...base }).ramp?.phases).toHaveLength(4);
  });
  it("2-day plans still cover hinge+rotation somewhere", () => {
    const plan = generatePlan({ ...base, daysPerWeek: 2 });
    const patterns = plan.days.flatMap((d) => d.main.map((ex) => getExercise(ex.exerciseId)!.pattern));
    expect(patterns).toContain("hinge");
    expect(patterns).toContain("rotation");
  });
});
```

- [ ] **Step 2: Run to verify failure** → FAIL (module not found).

- [ ] **Step 3: Implement `generate.ts`** per the six rules above. Keep it one file: `DAY_TEMPLATES` const, `scoreCandidate()`, `fillSlot()`, `defaultDose()`, `warmupFor()`, `ELBOW_PROTOCOL` const (the 5 movements with doses from the seed plan: tyler-twist 3×15, reverse-tyler-twist 3×15, pronation-supination 2×15, wrist-extensor-stretch 3×30s, finger-extension-band 3×20), `DEFAULT_RAMP` const (Base 1–2 @70, Build 3–4 @80, Develop 5–6 @90, Peak 7–8 @100).

- [ ] **Step 4: Run tests** → PASS (whole suite too).

- [ ] **Step 5: Commit** — `git commit -am "feat: rule-based wizard plan generation"`

---

### Task 5: Ramp engine + symptom gate

**Files:**
- Create: `app/lib/plan/ramp.ts`
- Test: `app/lib/plan/ramp.test.ts`

**Interfaces:**
- Consumes: `RampPhase`, `InjuryConfig`, `PlanExercise` (Task 2).
- Produces:

```ts
export function currentPhase(phases: RampPhase[], week: number): RampPhase; // clamps past end to last
export function scaledDose(ex: PlanExercise, pct: number): { sets?: number; reps?: string };
  // scales sets toward targetSets by pct (round), passes reps/targetReps through:
  // pct>=100 -> targetSets/targetReps; else sets + round((targetSets-sets)*(pct-70)/30) clamped
export function gateDecision(painDuring: number, worseNextMorning: boolean,
  gate: InjuryConfig["gate"]): "proceed" | "hold-or-drop" | "stop";
  // pain <= proceedMax && !worse -> proceed; sharp/radiating handled in UI as manual "stop"
  // pain > proceedMax || worse -> hold-or-drop ; pain >= 8 -> stop
```

- [ ] **Step 1: Failing tests:**

```ts
import { describe, expect, it } from "vitest";
import { currentPhase, gateDecision, scaledDose } from "./ramp";

const phases = [
  { name: "Base", weeks: [1, 2] as [number, number], pct: 70 },
  { name: "Build", weeks: [3, 4] as [number, number], pct: 80 },
  { name: "Peak", weeks: [7, 8] as [number, number], pct: 100 },
];

it("finds the phase containing the week", () => {
  expect(currentPhase(phases, 3).name).toBe("Build");
});
it("clamps weeks past the schedule to the last phase", () => {
  expect(currentPhase(phases, 12).name).toBe("Peak");
});
it("weeks in a gap fall back to the nearest earlier phase", () => {
  expect(currentPhase(phases, 5).name).toBe("Build");
});
it("scaledDose reaches target at 100%", () => {
  expect(scaledDose({ exerciseId: "x", sets: 2, targetSets: 4, targetReps: "15" }, 100))
    .toEqual({ sets: 4, reps: "15" });
});
it("scaledDose holds starting dose at 70%", () => {
  expect(scaledDose({ exerciseId: "x", sets: 2, reps: "12", targetSets: 4 }, 70).sets).toBe(2);
});
it("gate: low pain, not worse -> proceed", () => {
  expect(gateDecision(2, false, { proceedMax: 3, dropPct: 20 })).toBe("proceed");
});
it("gate: worse next morning -> hold-or-drop", () => {
  expect(gateDecision(2, true, { proceedMax: 3, dropPct: 20 })).toBe("hold-or-drop");
});
it("gate: severe pain -> stop", () => {
  expect(gateDecision(8, false, { proceedMax: 3, dropPct: 20 })).toBe("stop");
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** per the signature comments. **Step 4: Run** → PASS.

- [ ] **Step 5: Commit** — `git commit -am "feat: ramp phase math and symptom gate"`

---

### Task 6: Local store (IndexedDB) + export/import + streaks

**Files:**
- Create: `app/lib/store/local.ts`
- Test: `app/lib/store/local.test.ts` (uses `fake-indexeddb`)

**Interfaces:**
- Consumes: `PlanDoc`, `migratePlan` (Task 2).
- Produces:

```ts
export type StoredPlan = { id: string; doc: PlanDoc; createdAt: string;
  updatedAt: string; sourceSlug?: string; startedAt?: string };  // startedAt anchors ramp week
export type SessionLog = { id: string; planId: string; dayIndex: number; date: string;
  entries: { exerciseId: string; actual: string; pain?: number }[] };
export type ProtocolLog = { date: string };  // one per day the daily protocol was done
export async function savePlan(p: StoredPlan): Promise<void>;
export async function getPlan(id: string): Promise<StoredPlan | undefined>;
export async function listPlans(): Promise<StoredPlan[]>;
export async function deletePlan(id: string): Promise<void>;
export async function logSession(log: SessionLog): Promise<void>;
export async function getLogs(planId: string): Promise<SessionLog[]>;
export async function logProtocolDone(date: string): Promise<void>;
export async function getProtocolDates(): Promise<string[]>;
export function protocolStreak(dates: string[], today: string): number; // pure; consecutive days ending today or yesterday
export async function exportAll(): Promise<string>;   // JSON string of all stores
export async function importAll(json: string): Promise<void>; // validates plans via migratePlan
export function storageAvailable(): boolean;          // false in private browsing -> in-memory fallback
```

- [ ] **Step 1: Failing tests** (top of file: `import "fake-indexeddb/auto";`). Cover: save→get roundtrip; listPlans sorted by updatedAt desc; logs append and read back per plan; `protocolStreak(["2026-07-29","2026-07-30","2026-07-31"], "2026-07-31") === 3`; streak of 0 when yesterday+today both missing; export→wipe→import restores plans and logs; `importAll` rejects a payload whose plan fails `migratePlan`.

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** with `idb`'s `openDB("tennisworkout", 1)` creating object stores `plans`, `sessionLogs` (index `planId`), `protocolDays` (key `date`). In-memory `Map` fallback when `indexedDB` is undefined or `open` throws (same API, module-level flag). **Step 4: Run** → PASS.

- [ ] **Step 5: Commit** — `git commit -am "feat: local-first storage with export/import and protocol streaks"`

---

### Task 7: Moderation filters (pure)

**Files:**
- Create: `app/lib/moderation.ts`
- Test: `app/lib/moderation.test.ts`

**Interfaces:**
- Produces:

```ts
export function moderationIssues(doc: PlanDoc): string[]; // [] = clean
// checks every free-text field (meta.name, meta.description, exercise note/loadNote,
// protocol names/cues, day labels/focus): rejects URLs (https?:// or www.),
// rejects a small embedded profanity word-list (word-boundary match),
// (length caps are already enforced by the Zod schema)
```

- [ ] **Step 1: Failing tests:** clean seed-style plan → `[]`; description containing `https://spam.example` → issue mentioning "description"; note containing a profanity from the list → non-empty; name "My Elbow-Safe Plan" (contains no listed word as substring-only match, e.g. "class" problem) → `[]` (proves word-boundary matching).

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** (word list ~25 common profanities as a const; walk the doc collecting labeled issues). **Step 4: Run** → PASS. **Step 5: Commit** — `git commit -am "feat: publish-time moderation checks"`

---

### Task 8: Database migrations + publish server module

**Files:**
- Create: `migrations/001_published_plans.sql`, `scripts/migrate.ts`, `app/lib/db.server.ts`, `app/lib/publish.server.ts`
- Test: `app/lib/publish.server.test.ts` (runs only when `TEST_DATABASE_URL` is set; CI/dev uses a local `docker run postgres` or the shared dev DB — otherwise `describe.skipIf`)

**Interfaces:**
- Consumes: `validatePlan`, `migratePlan` (Task 2); `moderationIssues` (Task 7).
- Produces:

```ts
// db.server.ts
export const sql: postgres.Sql;  // postgres(DATABASE_URL, { connection: { search_path: "tennisworkout" } })

// publish.server.ts
export type PublishedRow = { slug: string; doc: PlanDoc; createdAt: string;
  remixOf: string | null; remixCount: number; featured: boolean };
export async function publishPlan(json: unknown, remixOf?: string):
  Promise<{ ok: true; slug: string } | { ok: false; errors: string[] }>;
  // migratePlan -> moderationIssues -> size cap 100KB -> insert slug nanoid(10)
  // increments remix_count on the remixOf row if given
export async function getPublished(slug: string): Promise<PublishedRow | null>; // null if hidden
export async function listGallery(filter?: { goal?: Goal; equipment?: Equipment;
  daysPerWeek?: number }): Promise<PublishedRow[]>;  // featured first, then newest; hidden excluded
export async function reportPlan(slug: string): Promise<void>; // ++report_count; >=3 sets hidden
export async function adminSetFlags(slug: string, flags: { hidden?: boolean; featured?: boolean },
  token: string): Promise<boolean>; // false unless token === process.env.ADMIN_TOKEN
```

- [ ] **Step 1: Write `migrations/001_published_plans.sql`:**

```sql
CREATE SCHEMA IF NOT EXISTS tennisworkout;
CREATE TABLE IF NOT EXISTS tennisworkout.published_plans (
  slug         text PRIMARY KEY,
  doc          jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  remix_of     text REFERENCES tennisworkout.published_plans(slug),
  remix_count  integer NOT NULL DEFAULT 0,
  report_count integer NOT NULL DEFAULT 0,
  hidden       boolean NOT NULL DEFAULT false,
  featured     boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS published_plans_gallery
  ON tennisworkout.published_plans (featured DESC, created_at DESC) WHERE NOT hidden;
```

- [ ] **Step 2: Write `scripts/migrate.ts`** — connects with `postgres(process.env.DATABASE_URL)`, creates `tennisworkout.schema_migrations(name text primary key, run_at timestamptz)` if missing (bootstrap the schema first: `CREATE SCHEMA IF NOT EXISTS tennisworkout`), reads `migrations/*.sql` sorted, runs each un-run file in a transaction, records it. Log each applied file. Exit non-zero on failure.

- [ ] **Step 3: Failing DB tests** (guarded by `TEST_DATABASE_URL`): publish valid plan → `{ok:true}` and `getPublished` roundtrips the doc; publish with URL in description → `{ok:false}` with error; publish >100KB doc → `{ok:false}`; `reportPlan` ×3 → `getPublished` returns null; `listGallery` puts featured first and excludes hidden; remix publish increments parent `remixCount`; `adminSetFlags` with wrong token → false, right token unhides.

- [ ] **Step 4: Run** — with a throwaway Postgres: `docker run --rm -d -p 5433:5432 -e POSTGRES_PASSWORD=t postgres:16` then `TEST_DATABASE_URL=postgres://postgres:t@localhost:5433/postgres npx vitest run app/lib/publish.server.test.ts` → FAIL, implement `db.server.ts` + `publish.server.ts`, re-run → PASS.

- [ ] **Step 5: Commit** — `git commit -am "feat: postgres migrations and publish/gallery/moderation server module"`

---

### Task 9: Route map + home/gallery page

**Files:**
- Create: `app/routes.ts` (replace template's), `app/routes/home.tsx`, `app/components/PlanCard.tsx`

**Interfaces:**
- Consumes: `listGallery` (Task 8).
- Produces: the app's route table, used by every later UI task:

```ts
import { type RouteConfig, index, route } from "@react-router/dev/routes";
export default [
  index("routes/home.tsx"),
  route("build", "routes/build.tsx"),
  route("plan/:id/edit", "routes/plan.edit.tsx"),
  route("plan/:id/today", "routes/plan.today.tsx"),
  route("plan/:id/print", "routes/plan.print.tsx"),
  route("p/:slug", "routes/published.tsx"),
  route("p/:slug/card.png", "routes/published-card.tsx"),
  route("api/report", "routes/api.report.tsx"),
  route("admin", "routes/admin.tsx"),
] satisfies RouteConfig;
```

- [ ] **Step 1: Write `app/routes.ts`** as above. Create empty placeholder modules for every referenced route (`export default function X() { return null; }`) so the build passes; later tasks fill them in.

- [ ] **Step 2: Implement `home.tsx`:** loader calls `listGallery(parseFilters(url.searchParams))` and returns `{ plans }` (plus a "your plans" section rendered client-side from `listPlans()` in a `useEffect`, since IndexedDB is browser-only). UI: hero ("Build a tennis workout that fits *your* body, gear, and goals" + CTA buttons → `/build` and `#gallery`), filter selects (goal, equipment, days/week — submit as GET query params), grid of `<PlanCard>` (name, description excerpt, goal badges, equipment icon row, days/week, remix count, Featured star), each linking to `/p/:slug`.

- [ ] **Step 3: Verify** — `npm run build` passes; `npm run dev`, visit `/`, see hero + empty gallery (no DB rows yet; loader must render cleanly with `[]` and show a "No shared plans yet" empty state).

- [ ] **Step 4: Commit** — `git commit -am "feat: route table and gallery home page"`

---

### Task 10: Wizard UI (`/build`)

**Files:**
- Create: `app/routes/build.tsx`, `app/components/WizardSteps.tsx`

**Interfaces:**
- Consumes: `generatePlan` (Task 4), `savePlan` (Task 6).
- Produces: on finish, saves a `StoredPlan` (`id: crypto.randomUUID()`) and navigates to `/plan/:id/edit`.

- [ ] **Step 1: Implement** a 4-step client-side wizard (single route, `useState` step index; no server round-trips):
  1. Goals — multi-select cards for the 4 goals (at least one required).
  2. Days per week — 2 / 3 / 4 radio cards.
  3. Equipment — checkbox grid of the 10 equipment values with friendly labels/icons; "none" clears others.
  4. Injuries — checkbox cards (elbow, shoulder, knee, foot) + "none"; short explainer that flags tailor exercise selection and add rehab protocols.
  Finish button: `const doc = generatePlan(input); await savePlan({ id, doc, createdAt, updatedAt })`; `navigate(\`/plan/${id}/edit\`)`.

- [ ] **Step 2: Verify manually** — dev server: complete the wizard with elbow flagged; confirm redirect lands on the editor with a 4-day plan whose protocols include the elbow routine. (Automated coverage arrives in the Playwright task.)

- [ ] **Step 3: Commit** — `git commit -am "feat: guided wizard flow"`

---

### Task 11: Editor UI (`/plan/:id/edit`)

**Files:**
- Create: `app/routes/plan.edit.tsx`, `app/components/ExercisePicker.tsx`, `app/components/DayEditor.tsx`

**Interfaces:**
- Consumes: `getPlan`/`savePlan` (Task 6), `substitutions`/`getExercise`/`EXERCISES` (Task 3), `publishPlan` via the route's `action` (Task 8), `validatePlan` (Task 2).
- Produces: "Publish" posts `{ doc, remixOf }` to its own action → `publishPlan` → redirect to `/p/:slug`; also re-saves the local plan with `sourceSlug: slug`.

- [ ] **Step 1: Implement the editor:** client-loads the plan by `:id` (`clientLoader` + `getPlan`; unknown id → friendly "plan not found on this device" screen with export/import hint). Editable: plan name + description (inputs, live-saved); per-day `DayEditor` — reorder days (up/down buttons), per-exercise row showing name, sets×reps inputs, note input, video link, **Swap** button opening `ExercisePicker` (lists `substitutions(id, doc.meta.equipment)` first, then rest of library grouped by pattern, search box), **Remove**, and per-section **Add exercise**. Daily protocols section: add/remove protocol items the same way. Autosave every change (`savePlan` debounced 500ms) with a "Saved" tick.

- [ ] **Step 2: Wire the action:** `action` parses `formData.get("doc")` JSON, calls `publishPlan(doc, remixOf)`; on `{ok:false}` return errors (render as a banner listing them); on success `redirect(\`/p/${slug}\`)`. Client submit button "Publish & get share link" with a confirm note ("Published plans are public and can't be edited — publish again for a new version").

- [ ] **Step 3: Verify manually** — swap KB Swing for a dumbbell hinge, publish, land on `/p/:slug` (needs local Postgres from Task 8 running with `DATABASE_URL` set).

- [ ] **Step 4: Commit** — `git commit -am "feat: plan editor with swap suggestions and publish action"`

---

### Task 12: Companion UI (`/plan/:id/today`)

**Files:**
- Create: `app/routes/plan.today.tsx`, `app/components/SessionRunner.tsx`, `app/components/ProtocolCard.tsx`, `app/components/RestTimer.tsx`

**Interfaces:**
- Consumes: Tasks 2, 3, 5, 6 — `getPlan`, `getLogs`, `logSession`, `logProtocolDone`, `getProtocolDates`, `protocolStreak`, `currentPhase`, `scaledDose`, `gateDecision`, `getExercise`.

- [ ] **Step 1: Session selection logic (pure helper in the route file, exported for tests):**

```ts
export function nextDayIndex(logs: SessionLog[], dayCount: number): number {
  const last = logs.at(-1);            // getLogs returns date-ascending
  return last ? (last.dayIndex + 1) % dayCount : 0;
}
export function currentWeek(startedAt: string | undefined, today: string): number {
  if (!startedAt) return 1;
  const ms = new Date(today).getTime() - new Date(startedAt).getTime();
  return Math.max(1, Math.floor(ms / (7 * 86400_000)) + 1);
}
```

Unit-test both in `app/routes/plan.today.test.ts` (wraparound: last dayIndex 3 of 4 → 0; week math: day 0 → 1, day 13 → 2).

- [ ] **Step 2: Implement the screen** (phone-first, single column):
  - Header: plan name, "Week N — <Phase name> (pct%)" chip (from `currentWeek` + `currentPhase`; first visit sets `startedAt`).
  - `ProtocolCard` (if plan has dailyProtocols): items checklist, "Done today" button → `logProtocolDone(today)`, streak flame + count from `protocolStreak`.
  - Session: "Day N — <label>" with warm-up as collapsible checklist; each main exercise a card: name, this-phase dose (`scaledDose(ex, phase.pct)`), last-time actual (from most recent log entry for that exerciseId), text input "what you did", optional pain slider 0–10 shown only when the exercise's `injuryLoad` intersects `injuryConfig.flags`; slider answer > gate → inline banner with `gateDecision` advice ("Hold this load or drop ~20% next time"). `RestTimer`: 60/90s chip buttons with countdown.
  - "Finish session" → `logSession({...})` → summary screen (exercises done, any gate warnings) with "Back to plan".

- [ ] **Step 3: Verify** — unit tests pass (`npx vitest run`); manual phone-width walkthrough: complete a session, reload, confirm "next session" advanced and last-time numbers show.

- [ ] **Step 4: Commit** — `git commit -am "feat: phone-first workout companion with ramp, gate, and streaks"`

---

### Task 13: Published plan page + share card (`/p/:slug`, `/p/:slug/card.png`)

**Files:**
- Create: `app/routes/published.tsx`, `app/routes/published-card.tsx`

**Interfaces:**
- Consumes: `getPublished` (Task 8), `savePlan` (Task 6), `getExercise` (Task 3).
- Produces: Remix button behavior relied on by the smoke test — clones the doc into a new local `StoredPlan` with `meta.remixOf = slug`, `sourceSlug = slug`, navigates to `/plan/:newId/edit`.

- [ ] **Step 1: Implement `published.tsx`:** loader `getPublished(slug)`; 404 via `throw data(null, { status: 404 })` when null. Renders the full plan read-only (days, doses, protocols, ramp table, video links), "Remixed from" lineage link when `meta.remixOf`, remix count, **Remix this plan** button (client-side clone as above), **Print** link → `/plan/…/print` works only for local copies, so on the public page link to remix-then-print, **Report** button (fetcher POST to `/api/report`, then "Thanks — reported" state). `meta` export sets OG tags: `og:title` = plan name, `og:description` = description, `og:image` = absolute `/p/:slug/card.png`.

- [ ] **Step 2: Implement `published-card.tsx`** resource route: loader builds a 1200×630 SVG string (dark court-green background, plan name in big type, goal badges, "N days/week · equipment list" line, site name footer), converts with `new Resvg(svg).render().asPng()`, returns `new Response(png, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" } })` (immutable is safe — published plans never change).

- [ ] **Step 3: Verify** — with a published row present: `curl -I localhost:5173/p/<slug>/card.png` → `200`, `image/png`; view `/p/<slug>` and confirm OG tags in page source.

- [ ] **Step 4: Commit** — `git commit -am "feat: public plan page with OG share card"`

---

### Task 14: Printables (`/plan/:id/print`)

**Files:**
- Create: `app/routes/plan.print.tsx`

**Interfaces:**
- Consumes: `getPlan` (Task 6), `getExercise` (Task 3). Reference styling: `Tennis_Workout_OnePager.html` and `PreMatch_Warmup_Card.html` at repo root.

- [ ] **Step 1: Implement** a client-loaded route rendering two print sheets from the plan doc, visually derived from the existing HTML files (port their CSS into the route as a `<style>` block, generalized: day-count-driven grid columns, per-day accent colors cycling `#d64545 #2f7dc4 #e08a1e #2f9e6f`, purple daily-protocol strip): sheet 1 = plan one-pager (daily protocol strip + day grid + ramp footer), sheet 2 = warm-up card if the plan has a protocol/warm-up marked as pre-match (v1 rule: render the first `dailyProtocols` entry plus each day's warm-up list is NOT a warm-up card — only render sheet 2 when a protocol named like /warm.?up/i exists). On-screen: "Print" button (`window.print()`); `@media print` page-breaks between sheets, landscape `@page` for the one-pager.

- [ ] **Step 2: Verify** — browser print preview of the seed plan resembles the existing one-pager; no clipped columns for 2- and 3-day plans.

- [ ] **Step 3: Commit** — `git commit -am "feat: printable one-pager and warm-up card"`

---

### Task 15: Report endpoint + admin page

**Files:**
- Create: `app/routes/api.report.tsx`, `app/routes/admin.tsx`

**Interfaces:**
- Consumes: `reportPlan`, `adminSetFlags`, `listGallery` + a new `listAllForAdmin(token)` you add to `publish.server.ts` (returns hidden rows too, token-gated like `adminSetFlags`).

- [ ] **Step 1: `api.report.tsx`** — `action` only (`POST`, form field `slug`), calls `reportPlan`, returns `{ ok: true }`. Naive rate limit: in-memory `Map<ip, timestamps>` allowing 5 reports/hour per IP (documented as best-effort).

- [ ] **Step 2: `admin.tsx`** — loader reads `?token=`; wrong/missing token → 404 (don't advertise the route). Table of all plans (slug link, name, created, remix/report counts, hidden/featured) with Hide/Unhide and Feature/Unfeature buttons posting to the route's action → `adminSetFlags(slug, flags, token)`.

- [ ] **Step 3: Add `listAllForAdmin` + a DB test** for it (returns hidden; rejects bad token) in `publish.server.test.ts` → run → PASS.

- [ ] **Step 4: Commit** — `git commit -am "feat: report endpoint and token-gated admin page"`

---

### Task 16: Seed the founding plan

**Files:**
- Create: `scripts/seed-founding-plan.ts`, `app/lib/seed/founding-plan.ts`
- Test: `app/lib/seed/founding-plan.test.ts`

**Interfaces:**
- Consumes: `validatePlan` (Task 2), library ids (Task 3), `publishPlan` (Task 8).
- Produces: `export const FOUNDING_PLAN: PlanDoc` — Greg's full plan from `Tennis_Workout_Plan.md` transcribed as data: 4 days with all exercises/doses/targets, daily elbow protocol, pre-match warm-up as a second protocol named "Pre-Match Warm-Up", the 4-phase ramp, `injuryConfig { flags: ["elbow", "foot"], gate: { proceedMax: 3, dropPct: 20 } }`, name "Elbow-Safe Tennis Power Plan", honest description.

- [ ] **Step 1: Test:** `validatePlan(FOUNDING_PLAN)` passes; every `exerciseId` in it exists in the library; it has 4 days and 2 daily protocols. Run → FAIL.

- [ ] **Step 2: Transcribe the plan** into `founding-plan.ts` (source of truth: `Tennis_Workout_Plan.md`; keep the plan file untouched at repo root). Run → PASS.

- [ ] **Step 3: `scripts/seed-founding-plan.ts`** — publishes `FOUNDING_PLAN` via `publishPlan`, then sets `featured: true` via `adminSetFlags` (reads `ADMIN_TOKEN` env). **Idempotent:** skip if a featured plan with the same name already exists (query first). Run against local DB; verify it appears first in `/`.

- [ ] **Step 4: Commit** — `git commit -am "feat: founding seed plan (Greg's elbow-safe power plan)"`

---

### Task 17: Playwright smoke flow

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: `playwright.config.ts`** — `webServer: { command: "npm run dev", port: 5173, reuseExistingServer: true }`, single chromium project, `use: { baseURL: "http://localhost:5173" }`. Requires `DATABASE_URL` pointing at the throwaway Postgres (document in the config header comment).

- [ ] **Step 2: Write the smoke test** (one serial spec, testids added to components as needed):

```ts
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
  await page.getByRole("link", { name: /start today/i }).click();     // -> /today
  await expect(page.getByText(/week 1/i)).toBeVisible();
  await page.getByRole("button", { name: /finish session/i }).click();
  await page.goBack();
  await page.getByRole("button", { name: /publish/i }).click();
  await expect(page).toHaveURL(/\/p\/.+/);
  await page.getByRole("button", { name: /remix this plan/i }).click();
  await expect(page).toHaveURL(/\/plan\/.+\/edit/);
});
```

- [ ] **Step 3: Run** — `npx playwright install chromium` once, then `npm run test:e2e` → PASS (iterate on testids/labels until green — the test is the contract; don't weaken assertions).

- [ ] **Step 4: Commit** — `git commit -am "test: end-to-end smoke flow"`

---

### Task 18: Deploy + hub bookkeeping

**Files:**
- Modify: `package.json` (start script), repo root `README.md` (rewrite for the app), `WORKLOG.md`
- Create (in `~/dev/hub`): `projects/tennisworkout/{readme,todo,notes,ideas}.md`

- [ ] **Step 1: Production start command** — set `"start": "npm run db:migrate && react-router-serve ./build/server/index.js"` (Rose Light pattern: migrations on boot).

- [ ] **Step 2: Push to GitHub** (`z-br/tennisworkout`, branch per session convention; merge to `main` when the user is ready — deploys track `main`).

- [ ] **Step 3: Deploy with the ship-webapp skill** (it owns the exact commands): Coolify project `tennisworkout`, Nixpacks app with FQDN `http://tennis.zebraproject.org`, port 3000, `GET /` healthcheck; provision schema `tennisworkout` + role `tennisworkout_app` on the shared Postgres (DATABASE_URL auto-wired); set `ADMIN_TOKEN` env (generate: `openssl rand -hex 24`); tunnel route `tennis.zebraproject.org` → `http://localhost:80`; verify `curl -s -o /dev/null -w '%{http_code}' https://tennis.zebraproject.org` → `200`.

- [ ] **Step 4: Seed production** — run `scripts/seed-founding-plan.ts` against the prod DATABASE_URL (via the Coolify app container or SSH route in `hub/docs/deployment.md`). Verify the founding plan leads the live gallery.

- [ ] **Step 5: Hub bookkeeping** — create `projects/tennisworkout/` four-file folder in `~/dev/hub` (readme: what/status/links incl. live URL + repo; todo: post-v1 backlog — library to 80–120, AI polish, PWA; notes: dated launch entry; ideas: from spec §11 post-v1 list). Add the project row to hub `README.md` under Active. Update `hub/docs/deployment.md` Deployed apps table. Final `WORKLOG.md` entry. Commit hub + repo.

---

## Self-Review (performed while writing)

- **Spec coverage:** all 7 surfaces have tasks (gallery T9, wizard T10, editor T11, companion T12, published+card T13, printables T14, admin T15); publishing/immutability/moderation T7+T8; local-first + export/import T6; ramp/gate/streaks T5+T6+T12; seed plan T16; smoke test T17; ops/hub T18. Share-card OG image: T13. Report threshold 3: T8.
- **Placeholder scan:** library content and founding-plan transcription are deliberate content-authoring steps with structural tests defining done — not placeholders. No TBDs remain.
- **Type consistency:** `PlanDoc`/`PlanExercise`/`StoredPlan`/`SessionLog`/`PublishedRow` signatures repeated in each consuming task's Interfaces block match Task 2/6/8 definitions verbatim.

## Execution notes

- Tasks 2–8 are pure/back-end and parallelizable after Task 2; UI tasks 9–14 depend on their listed interfaces; 16–18 come last.
- Local dev with DB: `docker run --rm -d -p 5433:5432 -e POSTGRES_PASSWORD=t postgres:16` + `DATABASE_URL=postgres://postgres:t@localhost:5433/postgres`.




