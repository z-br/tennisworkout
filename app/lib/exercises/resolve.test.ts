import { describe, expect, it } from "vitest";
import { exerciseDisplayName, newCustomExerciseId, resolveExercise } from "./resolve";
import { validatePlan, type PlanDoc } from "~/lib/plan/schema";

const doc: PlanDoc = {
  schemaVersion: 1,
  meta: { name: "T", description: "", goals: ["power"], equipment: ["kettlebell"], daysPerWeek: 2 },
  days: [
    {
      label: "Day 1",
      focus: "Power",
      warmup: [],
      main: [{ exerciseId: "kb-swing", sets: 3, reps: "12" }, { exerciseId: "custom-abc123", sets: 2, reps: "10" }],
    },
  ],
  dailyProtocols: [],
  injuryConfig: { flags: [], gate: { proceedMax: 3, dropPct: 20 } },
  customExercises: [{ id: "custom-abc123", name: "Bosu 360 Smash", cues: "Explode up, land soft." }],
};

describe("schema with customExercises", () => {
  it("validates a plan carrying custom exercises", () => {
    expect(validatePlan(doc).customExercises).toHaveLength(1);
  });
  it("rejects custom ids not matching the custom- prefix", () => {
    const bad = { ...doc, customExercises: [{ id: "kb-swing", name: "X" }] };
    expect(() => validatePlan(bad)).toThrow();
  });
  it("still accepts plans without the field", () => {
    const { customExercises: _drop, ...rest } = doc;
    expect(validatePlan(rest).customExercises).toBeUndefined();
  });
});

describe("resolveExercise", () => {
  it("resolves library exercises with custom=false", () => {
    const r = resolveExercise(doc, "kb-swing");
    expect(r?.custom).toBe(false);
    expect(r?.name).toBe("Kettlebell Swing");
  });
  it("resolves plan-local custom exercises with a derived video search link", () => {
    const r = resolveExercise(doc, "custom-abc123");
    expect(r?.custom).toBe(true);
    expect(r?.name).toBe("Bosu 360 Smash");
    expect(r?.video).toContain("youtube.com/results?search_query=Bosu%20360%20Smash");
  });
  it("returns undefined for unknown ids; display name falls back to the id", () => {
    expect(resolveExercise(doc, "nope")).toBeUndefined();
    expect(exerciseDisplayName(doc, "nope")).toBe("nope");
  });
});

describe("newCustomExerciseId", () => {
  it("matches the schema's id pattern", () => {
    expect(newCustomExerciseId()).toMatch(/^custom-[a-z0-9-]+$/);
  });
});
