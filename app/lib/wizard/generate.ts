import type { Equipment, Goal, InjuryFlag, PlanDay, PlanDoc, PlanExercise } from "~/lib/plan/schema";
import { EXERCISES, getExercise, type Exercise, type Pattern } from "~/lib/exercises/library";

export type WizardInput = {
  goals: readonly Goal[];
  daysPerWeek: 2 | 3 | 4;
  equipment: readonly Equipment[];
  injuries: readonly InjuryFlag[];
};

// ─── Day templates (mirrors the seed plan for 3/4-day; 2-day is a condensed
// full-body variant) ─────────────────────────────────────────────────────
type TemplateName = "lower-power" | "upper-rotation" | "full-explosive" | "core-stability" | "full-power";

type Template = { focus: string; slots: Pattern[] };

const DAY_TEMPLATES: Record<TemplateName, Template> = {
  "lower-power": { focus: "Lower Body Power + Lateral Quickness", slots: ["hinge", "squat", "plyo", "balance"] },
  "upper-rotation": { focus: "Upper Body Strength + Rotational Power", slots: ["pull", "push", "rotation", "carry"] },
  "full-explosive": { focus: "Full Body Explosive + Agility", slots: ["hinge", "plyo", "push", "conditioning"] },
  "core-stability": { focus: "Core, Stability + Hip Mobility", slots: ["rotation", "carry", "balance", "mobility"] },
  "full-power": { focus: "Full-Body Power + Movement Prep", slots: ["hinge", "squat", "push", "pull", "plyo", "rotation"] },
};

const DAY_PLANS: Record<2 | 3 | 4, TemplateName[]> = {
  4: ["lower-power", "upper-rotation", "full-explosive", "core-stability"],
  3: ["lower-power", "upper-rotation", "full-explosive"],
  2: ["full-power", "core-stability"],
};

// Curated warm-up pools, one per template, mirroring the seed plan's per-day
// warm-up sections (already ordered/matched to that day's first two patterns).
const WARMUP_POOLS: Record<TemplateName, string[]> = {
  "lower-power": [
    "lateral-shuffle-drill", "childs-pose-rock", "hip-90-90-popup",
    "hip-90-90-ir-hold", "lateral-leg-swings", "lateral-band-walk", "split-step-practice",
  ],
  "upper-rotation": ["band-pull-apart", "shoulder-cars", "arm-swings", "wrist-circles", "band-external-rotation"],
  "full-explosive": ["fast-feet-drill", "worlds-greatest-stretch", "arm-circles-torso-rotation"],
  "core-stability": ["foam-rolling", "cat-cow-stretch", "thread-the-needle"],
  "full-power": [
    "ankle-pogos", "leg-swings-front-back", "walking-lunge-reach-rotate",
    "arm-circles-wrist-rolls", "forearm-elbow-prep-light", "lateral-shuffle-split-accel", "shadow-swings",
  ],
};

// ─── Elbow protocol (runs daily, full dose from day 1, does not ramp) ─────
export const ELBOW_PROTOCOL: PlanExercise[] = [
  { exerciseId: "tyler-twist", sets: 3, reps: "15" },
  { exerciseId: "reverse-tyler-twist", sets: 3, reps: "15" },
  { exerciseId: "pronation-supination", sets: 2, reps: "15 each direction" },
  { exerciseId: "wrist-extensor-stretch", sets: 3, reps: "30 sec" },
  { exerciseId: "finger-extension-band", sets: 3, reps: "20" },
];

// ─── 8-week ramp: Base 1-2 @70%, Build 3-4 @80%, Develop 5-6 @90%, Peak 7-8 @100% ─
export const DEFAULT_RAMP = {
  phases: [
    { name: "Base", weeks: [1, 2] as [number, number], pct: 70, note: "Starting doses. Groove form." },
    { name: "Build", weeks: [3, 4] as [number, number], pct: 80, note: "Add a set to main lifts." },
    { name: "Develop", weeks: [5, 6] as [number, number], pct: 90, note: "Reach target sets/reps on most lifts." },
    { name: "Peak", weeks: [7, 8] as [number, number], pct: 100, note: "Full target loads." },
  ],
};

// ─── Equipment / scoring helpers ───────────────────────────────────────────
function equipmentOk(e: Exercise, owned: readonly Equipment[]): boolean {
  return e.equipment.every((eq) => eq === "none" || owned.includes(eq));
}

/** Score a candidate exercise for a slot. Returns null if it must be excluded
 * (high injury load for a flagged injury). */
export function scoreCandidate(e: Exercise, goals: readonly Goal[], injuries: readonly InjuryFlag[]): number | null {
  for (const flag of injuries) {
    if (e.injuryLoad[flag] === "high") return null;
  }
  let score = 0;
  for (const g of goals) if (e.goals.includes(g)) score += 2;
  if (injuries.every((flag) => e.injuryLoad[flag] === "safe")) score += 1;
  // Foot bias: prefer foot-safe/rehab balance work when foot is flagged.
  if (e.pattern === "balance" && injuries.includes("foot")) {
    const footLoad = e.injuryLoad.foot;
    if (footLoad === "safe" || footLoad === "rehab") score += 3;
  }
  return score;
}

/** Pick the best candidate for a pattern slot: highest score, ties broken
 * alphabetically by id for determinism. */
export function fillSlot(
  pattern: Pattern,
  owned: readonly Equipment[],
  goals: readonly Goal[],
  injuries: readonly InjuryFlag[],
  usedIds: Set<string>,
): Exercise | undefined {
  const scored: { e: Exercise; score: number }[] = [];
  for (const e of EXERCISES) {
    if (e.pattern !== pattern) continue;
    if (usedIds.has(e.id)) continue;
    if (!equipmentOk(e, owned)) continue;
    const score = scoreCandidate(e, goals, injuries);
    if (score === null) continue;
    scored.push({ e, score });
  }
  scored.sort((a, b) => b.score - a.score || a.e.id.localeCompare(b.e.id));
  return scored[0]?.e;
}

/** Fallback so a day never ends up with zero main exercises: best no-equipment
 * exercise across the day's slot patterns, ignoring goal score (injury
 * exclusions still apply). Respects plan-wide usedIds to avoid duplication. */
function fallbackForDay(slots: Pattern[], injuries: readonly InjuryFlag[], usedIds: Set<string>): Exercise | undefined {
  const candidates = EXERCISES.filter(
    (e) => slots.includes(e.pattern) && e.equipment.length === 0
      && injuries.every((flag) => e.injuryLoad[flag] !== "high")
      && !usedIds.has(e.id),
  );
  candidates.sort((a, b) => a.id.localeCompare(b.id));

  if (candidates.length > 0) {
    return candidates[0];
  }

  // Fallback: if all bodyweight candidates have been used elsewhere in the plan,
  // pick an unfiltered one. A duplicate beats an empty day.
  const unfiltered = EXERCISES.filter(
    (e) => slots.includes(e.pattern) && e.equipment.length === 0
      && injuries.every((flag) => e.injuryLoad[flag] !== "high"),
  );
  unfiltered.sort((a, b) => a.id.localeCompare(b.id));
  return unfiltered[0];
}

// ─── Doses ─────────────────────────────────────────────────────────────────
export function defaultDose(pattern: Pattern): Partial<PlanExercise> {
  switch (pattern) {
    case "hinge":
    case "squat":
    case "push":
    case "pull":
      return { sets: 2, reps: "8–10", targetSets: 3 };
    case "plyo":
      return { sets: 2, reps: "4–6", targetSets: 3 };
    case "rotation":
    case "carry":
    case "balance":
    case "conditioning":
      return { sets: 2, targetSets: 3 };
    case "tendon-rehab":
      return { sets: 2, reps: "10–15", targetSets: 3 };
    case "mobility":
    default:
      return {};
  }
}

// ─── Warm-ups ───────────────────────────────────────────────────────────────
/** 3 mobility/warm-up entries for a day, drawn from the template's curated
 * pool (already matched to the day's first two patterns), filtered to owned
 * equipment and injury-safe, scored by goal match, with a generic mobility
 * fallback if the pool comes up short. */
export function warmupFor(
  template: TemplateName,
  owned: readonly Equipment[],
  goals: readonly Goal[],
  injuries: readonly InjuryFlag[],
  usedInMain: ReadonlySet<string> = new Set(),
): PlanExercise[] {
  const poolIds = WARMUP_POOLS[template];
  const usedLocal = new Set<string>();
  const picks: Exercise[] = [];

  const eligible = (e: Exercise) =>
    equipmentOk(e, owned) && injuries.every((flag) => e.injuryLoad[flag] !== "high")
    && !usedLocal.has(e.id) && !usedInMain.has(e.id);

  const poolExercises = poolIds
    .map((id) => getExercise(id))
    .filter((e): e is Exercise => !!e && eligible(e))
    .map((e) => ({ e, score: scoreCandidate(e, goals, injuries) ?? 0, order: poolIds.indexOf(e.id) }))
    .sort((a, b) => b.score - a.score || a.order - b.order || a.e.id.localeCompare(b.e.id));

  for (const { e } of poolExercises) {
    if (picks.length >= 3) break;
    picks.push(e);
    usedLocal.add(e.id);
  }

  // Fallback: fill any remaining slots from the general mobility pool.
  if (picks.length < 3) {
    const fallback = EXERCISES
      .filter((e) => (e.pattern === "mobility" || e.pattern === "conditioning" || e.pattern === "plyo") && eligible(e))
      .sort((a, b) => a.id.localeCompare(b.id));
    for (const e of fallback) {
      if (picks.length >= 3) break;
      picks.push(e);
      usedLocal.add(e.id);
    }
  }

  return picks.map((e) => ({ exerciseId: e.id }));
}

// ─── Main entry point ───────────────────────────────────────────────────────
export function generatePlan(input: WizardInput): PlanDoc {
  const { goals, daysPerWeek, equipment, injuries } = input;
  const templateNames = DAY_PLANS[daysPerWeek];
  const usedIds = new Set<string>();

  const days: PlanDay[] = templateNames.map((name, i) => {
    const template = DAY_TEMPLATES[name];
    const main: PlanExercise[] = [];

    for (const pattern of template.slots) {
      const ex = fillSlot(pattern, equipment, goals, injuries, usedIds);
      if (!ex) continue;
      usedIds.add(ex.id);
      main.push({ exerciseId: ex.id, ...defaultDose(ex.pattern) });
    }

    if (main.length === 0) {
      const fb = fallbackForDay(template.slots, injuries, usedIds);
      if (fb) {
        usedIds.add(fb.id);
        main.push({ exerciseId: fb.id, ...defaultDose(fb.pattern) });
      }
    }

    // Foot bias: add calf raise to lower-body days (hinge/squat) if not
    // already selected and it's actually doable with owned equipment.
    const isLowerBody = template.slots.includes("hinge") || template.slots.includes("squat");
    if (injuries.includes("foot") && isLowerBody) {
      const calf = getExercise("calf-raise-single-leg");
      if (
        calf && !usedIds.has(calf.id) && equipmentOk(calf, equipment)
        && injuries.every((flag) => calf.injuryLoad[flag] !== "high")
      ) {
        usedIds.add(calf.id);
        main.push({ exerciseId: calf.id, ...defaultDose(calf.pattern) });
      }
    }

    const warmup = warmupFor(name, equipment, goals, injuries, usedIds);

    return {
      label: `Day ${i + 1}`,
      focus: template.focus,
      warmup,
      main,
    };
  });

  const dailyProtocols: PlanDoc["dailyProtocols"] = [];
  if (injuries.includes("elbow")) {
    dailyProtocols.push({
      name: "Daily Elbow Protocol",
      items: ELBOW_PROTOCOL,
      cue: "Every day, regardless of whether you trained — tie it to a fixed daily cue. Runs at full dose from day 1; does not ramp.",
    });
  }

  const equipmentDesc = equipment.filter((e) => e !== "none").join(", ") || "bodyweight only";
  const goalDesc = goals.join("/") || "general-fitness";

  return {
    schemaVersion: 1,
    meta: {
      name: "My Tennis Workout",
      description: `${daysPerWeek}-day ${goalDesc} plan · ${equipmentDesc}`,
      goals: [...goals],
      equipment: [...equipment],
      daysPerWeek,
    },
    days,
    dailyProtocols,
    ramp: DEFAULT_RAMP,
    injuryConfig: {
      flags: [...injuries],
      gate: { proceedMax: 3, dropPct: 20 },
    },
  };
}
