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
