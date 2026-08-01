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
