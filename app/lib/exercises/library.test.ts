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
