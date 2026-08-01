import { describe, expect, it } from "vitest";
import type { PlanExercise, Protocol, RampPhase } from "~/lib/plan/schema";
import {
  accentClass,
  dailyStripProtocol,
  doseLabel,
  equipmentList,
  isWarmupProtocolName,
  rampSummary,
  warmupCardProtocol,
} from "./plan.print";

function ex(patch: Partial<PlanExercise>): PlanExercise {
  return { exerciseId: "x", ...patch };
}

describe("doseLabel", () => {
  it("prefers sets×reps", () => {
    expect(doseLabel(ex({ sets: 3, reps: "12" }))).toBe("3×12");
  });
  it("falls back to targetSets×targetReps", () => {
    expect(doseLabel(ex({ targetSets: 4, targetReps: "15" }))).toBe("4×15");
  });
  it("prefers sets×reps over target when both present", () => {
    expect(doseLabel(ex({ sets: 2, reps: "8", targetSets: 3, targetReps: "10" }))).toBe("2×8");
  });
  it("omits when neither pair is complete", () => {
    expect(doseLabel(ex({ sets: 2 }))).toBeUndefined();
    expect(doseLabel(ex({ targetSets: 3 }))).toBeUndefined();
    expect(doseLabel(ex({}))).toBeUndefined();
  });
});

describe("accentClass", () => {
  it("cycles d1-d4", () => {
    expect([0, 1, 2, 3, 4, 5].map(accentClass)).toEqual(["d1", "d2", "d3", "d4", "d1", "d2"]);
  });
});

describe("isWarmupProtocolName", () => {
  it("matches warm-up variants", () => {
    expect(isWarmupProtocolName("Pre-Match Warm-Up")).toBe(true);
    expect(isWarmupProtocolName("Warmup")).toBe(true);
    expect(isWarmupProtocolName("Daily Elbow Protocol")).toBe(false);
  });
});

describe("dailyStripProtocol / warmupCardProtocol", () => {
  const protocols: Protocol[] = [
    { name: "Daily Elbow Protocol", items: [ex({})] },
    { name: "Pre-Match Warm-Up", items: [ex({})] },
  ];

  it("picks the first non-warmup entry for the daily strip", () => {
    expect(dailyStripProtocol(protocols)?.name).toBe("Daily Elbow Protocol");
  });
  it("picks the warm-up entry for the warm-up card", () => {
    expect(warmupCardProtocol(protocols)?.name).toBe("Pre-Match Warm-Up");
  });
  it("returns undefined when no warm-up protocol exists", () => {
    expect(warmupCardProtocol([protocols[0]])).toBeUndefined();
  });
});

describe("equipmentList", () => {
  it("abbreviates and joins, dropping empty labels", () => {
    expect(equipmentList(["kettlebell", "trx", "none"])).toBe("KB · TRX");
  });
  it("returns empty string for no equipment", () => {
    expect(equipmentList([])).toBe("");
  });
});

describe("rampSummary", () => {
  it("joins phase name, pct, and week range", () => {
    const phases: RampPhase[] = [
      { name: "Base", weeks: [1, 2], pct: 70 },
      { name: "Peak", weeks: [7, 8], pct: 100 },
    ];
    expect(rampSummary(phases)).toBe("Base 70% (wk 1–2) · Peak 100% (wk 7–8)");
  });
});
