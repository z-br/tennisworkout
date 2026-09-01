import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import type { PlanDoc } from "~/lib/plan/schema";
import {
  deletePlan,
  exportAll,
  getLogs,
  getPlan,
  getProtocolDates,
  importAll,
  listPlans,
  logProtocolDone,
  logSession,
  protocolStreak,
  savePlan,
  storageAvailable,
  type SessionLog,
  type StoredPlan,
} from "./local";

const doc: PlanDoc = {
  schemaVersion: 1,
  meta: { name: "T", description: "", goals: ["power"], equipment: ["kettlebell"], daysPerWeek: 2 },
  days: [{ label: "Day 1", focus: "Power", warmup: [], main: [{ exerciseId: "kb-swing", sets: 3, reps: "12" }] }],
  dailyProtocols: [],
  injuryConfig: { flags: [], gate: { proceedMax: 3, dropPct: 20 } },
};

function makePlan(id: string, overrides: Partial<StoredPlan> = {}): StoredPlan {
  return {
    id,
    doc,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  // Fresh in-memory IndexedDB per test for isolation (see task-6 note on
  // not caching a stale db connection across resets).
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
});

describe("savePlan / getPlan", () => {
  it("round-trips a plan", async () => {
    const plan = makePlan("p1");
    await savePlan(plan);
    const got = await getPlan("p1");
    expect(got).toEqual(plan);
  });

  it("returns undefined for a missing plan", async () => {
    const got = await getPlan("nope");
    expect(got).toBeUndefined();
  });

  it("overwrites an existing plan with the same id", async () => {
    await savePlan(makePlan("p1", { updatedAt: "2026-07-01T00:00:00.000Z" }));
    await savePlan(makePlan("p1", { updatedAt: "2026-07-02T00:00:00.000Z" }));
    const got = await getPlan("p1");
    expect(got?.updatedAt).toBe("2026-07-02T00:00:00.000Z");
  });
});

describe("listPlans", () => {
  it("sorts by updatedAt descending", async () => {
    await savePlan(makePlan("oldest", { updatedAt: "2026-07-01T00:00:00.000Z" }));
    await savePlan(makePlan("newest", { updatedAt: "2026-07-31T00:00:00.000Z" }));
    await savePlan(makePlan("middle", { updatedAt: "2026-07-15T00:00:00.000Z" }));
    const plans = await listPlans();
    expect(plans.map((p) => p.id)).toEqual(["newest", "middle", "oldest"]);
  });

  it("returns an empty array when no plans exist", async () => {
    expect(await listPlans()).toEqual([]);
  });
});

describe("deletePlan", () => {
  it("removes a plan so it is no longer returned", async () => {
    await savePlan(makePlan("p1"));
    await deletePlan("p1");
    expect(await getPlan("p1")).toBeUndefined();
    expect(await listPlans()).toEqual([]);
  });

  it("also removes the plan's session logs, leaving other plans' logs alone", async () => {
    await savePlan(makePlan("p1"));
    await savePlan(makePlan("p2"));
    await logSession({ id: "l1", planId: "p1", dayIndex: 0, date: "2026-08-30", entries: [] });
    await logSession({ id: "l2", planId: "p1", dayIndex: 1, date: "2026-08-31", entries: [] });
    await logSession({ id: "l3", planId: "p2", dayIndex: 0, date: "2026-08-31", entries: [] });
    await deletePlan("p1");
    expect(await getLogs("p1")).toEqual([]);
    expect((await getLogs("p2")).map((l) => l.id)).toEqual(["l3"]);
  });
});

describe("logSession / getLogs", () => {
  it("appends logs and reads them back for the right plan, sorted by date ascending", async () => {
    const log1: SessionLog = {
      id: "l1",
      planId: "p1",
      dayIndex: 0,
      date: "2026-07-30",
      entries: [{ exerciseId: "kb-swing", actual: "3x12" }],
    };
    const log2: SessionLog = {
      id: "l2",
      planId: "p1",
      dayIndex: 1,
      date: "2026-07-28",
      entries: [{ exerciseId: "kb-swing", actual: "3x10", pain: 2 }],
    };
    const otherPlanLog: SessionLog = {
      id: "l3",
      planId: "p2",
      dayIndex: 0,
      date: "2026-07-29",
      entries: [],
    };
    await logSession(log1);
    await logSession(log2);
    await logSession(otherPlanLog);

    const logs = await getLogs("p1");
    expect(logs.map((l) => l.id)).toEqual(["l2", "l1"]);
    expect(logs.every((l) => l.planId === "p1")).toBe(true);
  });

  it("returns an empty array for a plan with no logs", async () => {
    expect(await getLogs("nope")).toEqual([]);
  });

  it("breaks ties on the same date by loggedAt ascending, missing loggedAt sorting first", async () => {
    const noLoggedAt: SessionLog = {
      id: "l1",
      planId: "p1",
      dayIndex: 0,
      date: "2026-07-30",
      entries: [],
    };
    const earlier: SessionLog = {
      id: "l2",
      planId: "p1",
      dayIndex: 1,
      date: "2026-07-30",
      entries: [],
      loggedAt: "2026-07-30T09:00:00.000Z",
    };
    const later: SessionLog = {
      id: "l3",
      planId: "p1",
      dayIndex: 2,
      date: "2026-07-30",
      entries: [],
      loggedAt: "2026-07-30T18:00:00.000Z",
    };
    // Insert out of order to prove sorting, not insertion order, decides.
    await logSession(later);
    await logSession(noLoggedAt);
    await logSession(earlier);

    const logs = await getLogs("p1");
    expect(logs.map((l) => l.id)).toEqual(["l1", "l2", "l3"]);
  });
});

describe("logProtocolDone / getProtocolDates", () => {
  it("records and returns protocol days", async () => {
    await logProtocolDone("Elbow Protocol", "2026-07-30");
    await logProtocolDone("Elbow Protocol", "2026-07-31");
    const dates = await getProtocolDates("Elbow Protocol");
    expect(new Set(dates)).toEqual(new Set(["2026-07-30", "2026-07-31"]));
  });

  it("does not duplicate the same date logged twice", async () => {
    await logProtocolDone("Elbow Protocol", "2026-07-30");
    await logProtocolDone("Elbow Protocol", "2026-07-30");
    const dates = await getProtocolDates("Elbow Protocol");
    expect(dates).toEqual(["2026-07-30"]);
  });

  it("keeps each protocol's days independent by protocol name", async () => {
    await logProtocolDone("Elbow Protocol", "2026-07-30");
    await logProtocolDone("Warm-up Routine", "2026-07-31");

    expect(await getProtocolDates("Elbow Protocol")).toEqual(["2026-07-30"]);
    expect(await getProtocolDates("Warm-up Routine")).toEqual(["2026-07-31"]);
  });

  it("returns an empty array for a protocol with no logged days", async () => {
    await logProtocolDone("Elbow Protocol", "2026-07-30");
    expect(await getProtocolDates("Other Protocol")).toEqual([]);
  });
});

describe("protocolStreak", () => {
  it("counts 3 consecutive days ending today", () => {
    expect(protocolStreak(["2026-07-29", "2026-07-30", "2026-07-31"], "2026-07-31")).toBe(3);
  });

  it("is 0 when both today and yesterday are missing", () => {
    expect(protocolStreak(["2026-07-20"], "2026-07-31")).toBe(0);
  });

  it("is 0 for an empty dates array", () => {
    expect(protocolStreak([], "2026-07-31")).toBe(0);
  });

  it("still counts the streak when today hasn't been logged yet but yesterday has", () => {
    expect(protocolStreak(["2026-07-29", "2026-07-30"], "2026-07-31")).toBe(2);
  });

  it("stops counting at the first gap", () => {
    expect(protocolStreak(["2026-07-25", "2026-07-30", "2026-07-31"], "2026-07-31")).toBe(2);
  });

  it("normalizes unsorted and duplicated dates", () => {
    expect(
      protocolStreak(
        ["2026-07-31", "2026-07-29", "2026-07-30", "2026-07-30", "2026-07-31"],
        "2026-07-31",
      ),
    ).toBe(3);
  });
});

describe("export / import", () => {
  it("restores plans and logs after a wipe", async () => {
    const plan = makePlan("p1");
    const log: SessionLog = {
      id: "l1",
      planId: "p1",
      dayIndex: 0,
      date: "2026-07-30",
      entries: [{ exerciseId: "kb-swing", actual: "3x12" }],
    };
    await savePlan(plan);
    await logSession(log);
    await logProtocolDone("Elbow Protocol", "2026-07-30");

    const exported = await exportAll();

    // Wipe by pointing at a brand-new empty database.
    (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
    expect(await listPlans()).toEqual([]);

    await importAll(exported);

    expect(await getPlan("p1")).toEqual(plan);
    expect(await getLogs("p1")).toEqual([log]);
    expect(await getProtocolDates("Elbow Protocol")).toEqual(["2026-07-30"]);
  });

  it("export produces valid JSON with the expected shape", async () => {
    await savePlan(makePlan("p1"));
    await logProtocolDone("Elbow Protocol", "2026-07-30");
    const exported = await exportAll();
    const parsed = JSON.parse(exported);
    expect(parsed.exportVersion).toBe(2);
    expect(parsed.plans).toHaveLength(1);
    expect(parsed.sessionLogs).toEqual([]);
    expect(parsed.protocolDays).toEqual([
      { key: "Elbow Protocol|2026-07-30", protocolName: "Elbow Protocol", date: "2026-07-30" },
    ]);
  });

  it("merges on import, overwriting existing plans by id", async () => {
    await savePlan(makePlan("p1", { updatedAt: "2026-07-01T00:00:00.000Z" }));
    const payload = JSON.stringify({
      exportVersion: 2,
      plans: [makePlan("p1", { updatedAt: "2026-07-31T00:00:00.000Z" })],
      sessionLogs: [],
      protocolDays: [],
    });
    await importAll(payload);
    const got = await getPlan("p1");
    expect(got?.updatedAt).toBe("2026-07-31T00:00:00.000Z");
  });

  it("rejects a payload whose plan fails migratePlan, without writing anything", async () => {
    const badPayload = JSON.stringify({
      exportVersion: 2,
      plans: [makePlan("bad", { doc: { ...doc, schemaVersion: 99 } as unknown as PlanDoc })],
      sessionLogs: [],
      protocolDays: [],
    });
    await expect(importAll(badPayload)).rejects.toThrow();
    expect(await getPlan("bad")).toBeUndefined();
  });

  it("does not write any plans from a payload if one of several fails validation", async () => {
    const badPayload = JSON.stringify({
      exportVersion: 2,
      plans: [
        makePlan("good", { updatedAt: "2026-07-01T00:00:00.000Z" }),
        makePlan("bad", { doc: { ...doc, schemaVersion: 99 } as unknown as PlanDoc }),
      ],
      sessionLogs: [],
      protocolDays: [],
    });
    await expect(importAll(badPayload)).rejects.toThrow();
    expect(await getPlan("good")).toBeUndefined();
  });

  it("maps a v1 backup's date-only protocolDays entries onto \"Daily Protocol\"", async () => {
    const legacyPayload = JSON.stringify({
      exportVersion: 1,
      plans: [],
      sessionLogs: [],
      protocolDays: [{ date: "2026-07-30" }, { date: "2026-07-31" }],
    });
    await importAll(legacyPayload);
    expect(await getProtocolDates("Daily Protocol")).toEqual(["2026-07-30", "2026-07-31"]);
  });
});

describe("storageAvailable", () => {
  it("is true when indexedDB is defined", () => {
    expect(storageAvailable()).toBe(true);
  });

  it("is false when indexedDB is undefined, and storage still works via the in-memory fallback", async () => {
    const original = (globalThis as unknown as { indexedDB?: IDBFactory }).indexedDB;
    // @ts-expect-error -- simulating an environment without IndexedDB (e.g. private browsing)
    delete globalThis.indexedDB;

    try {
      expect(storageAvailable()).toBe(false);
      const plan = makePlan("mem1");
      await savePlan(plan);
      expect(await getPlan("mem1")).toEqual(plan);
    } finally {
      (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = original as IDBFactory;
    }
  });
});
