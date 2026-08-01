import { describe, expect, it } from "vitest";
import type { SessionLog } from "~/lib/store/local";
import { currentWeek, nextDayIndex } from "./plan.today";

function log(dayIndex: number, date: string): SessionLog {
  return { id: `l-${date}`, planId: "p1", dayIndex, date, entries: [] };
}

describe("nextDayIndex", () => {
  it("starts at day 0 with no logs", () => {
    expect(nextDayIndex([], 4)).toBe(0);
  });
  it("wraps around after the last day", () => {
    const logs = [log(0, "2026-07-01"), log(1, "2026-07-02"), log(2, "2026-07-03"), log(3, "2026-07-04")];
    expect(nextDayIndex(logs, 4)).toBe(0);
  });
  it("advances to the day after the most recent log", () => {
    const logs = [log(0, "2026-07-01"), log(1, "2026-07-02")];
    expect(nextDayIndex(logs, 4)).toBe(2);
  });
});

describe("currentWeek", () => {
  it("defaults to week 1 when startedAt is unset", () => {
    expect(currentWeek(undefined, "2026-07-01")).toBe(1);
  });
  it("is week 1 on the start day", () => {
    expect(currentWeek("2026-07-01", "2026-07-01")).toBe(1);
  });
  it("is week 2 on day 13", () => {
    expect(currentWeek("2026-07-01", "2026-07-14")).toBe(2);
  });
});
