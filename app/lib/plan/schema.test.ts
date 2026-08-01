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
