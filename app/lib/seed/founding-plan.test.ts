import { describe, expect, it } from "vitest";
import { validatePlan } from "~/lib/plan/schema";
import { getExercise } from "~/lib/exercises/library";
import { FOUNDING_PLAN } from "./founding-plan";

describe("FOUNDING_PLAN", () => {
  it("passes schema validation", () => {
    expect(() => validatePlan(FOUNDING_PLAN)).not.toThrow();
  });

  it("has 4 days", () => {
    expect(FOUNDING_PLAN.days).toHaveLength(4);
  });

  it("has 2 daily protocols", () => {
    expect(FOUNDING_PLAN.dailyProtocols).toHaveLength(2);
  });

  it("has a 4-phase ramp", () => {
    expect(FOUNDING_PLAN.ramp?.phases).toHaveLength(4);
  });

  it("flags elbow and foot in injuryConfig", () => {
    expect(FOUNDING_PLAN.injuryConfig.flags).toEqual(
      expect.arrayContaining(["elbow", "foot"]),
    );
  });

  it("references only exerciseIds that exist in the library", () => {
    const missing: string[] = [];
    const check = (id: string, where: string) => {
      if (!getExercise(id)) missing.push(`${where}: ${id}`);
    };

    FOUNDING_PLAN.days.forEach((day, i) => {
      day.warmup.forEach((ex) => check(ex.exerciseId, `day ${i + 1} warmup`));
      day.main.forEach((ex) => check(ex.exerciseId, `day ${i + 1} main`));
      day.finisher?.forEach((ex) => check(ex.exerciseId, `day ${i + 1} finisher`));
    });
    FOUNDING_PLAN.dailyProtocols.forEach((protocol) => {
      protocol.items.forEach((ex) => check(ex.exerciseId, `protocol "${protocol.name}"`));
    });

    expect(missing).toEqual([]);
  });

  it("names the pre-match warm-up protocol", () => {
    expect(FOUNDING_PLAN.dailyProtocols.map((p) => p.name)).toContain("Pre-Match Warm-Up");
  });
});
