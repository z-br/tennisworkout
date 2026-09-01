import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "./plan/schema";

// This suite talks to a real Postgres instance. It only runs when
// TEST_DATABASE_URL is set (e.g. a throwaway `docker run postgres`), so that
// `npx vitest run` still passes for everyone else.
describe.skipIf(!process.env.TEST_DATABASE_URL)("publish.server", () => {
  let runMigrations: (databaseUrl: string) => Promise<string[]>;
  let getSql: () => import("postgres").Sql;
  let publishPlan: typeof import("./publish.server").publishPlan;
  let getPublished: typeof import("./publish.server").getPublished;
  let listGallery: typeof import("./publish.server").listGallery;
  let reportPlan: typeof import("./publish.server").reportPlan;
  let adminSetFlags: typeof import("./publish.server").adminSetFlags;
  let listAllForAdmin: typeof import("./publish.server").listAllForAdmin;
  let listCustomExerciseCandidates: typeof import("./publish.server").listCustomExerciseCandidates;

  const testDatabaseUrl = process.env.TEST_DATABASE_URL!;

  const basePlan = () => ({
    schemaVersion: SCHEMA_VERSION,
    meta: {
      name: "Power Plan",
      description: "A clean plan",
      goals: ["power"],
      equipment: ["kettlebell"],
      daysPerWeek: 2,
    },
    days: [
      {
        label: "Day 1",
        focus: "Power",
        warmup: [],
        main: [{ exerciseId: "kb-swing", sets: 3, reps: "12" }],
      },
    ],
    dailyProtocols: [],
    injuryConfig: { flags: [], gate: { proceedMax: 3, dropPct: 20 } },
  });

  const bigPlan = () => ({
    ...basePlan(),
    days: Array.from({ length: 5 }, (_, dayIndex) => ({
      label: `Day ${dayIndex + 1}`,
      focus: "Power",
      warmup: [],
      main: Array.from({ length: 80 }, (_, exIndex) => ({
        exerciseId: `kb-swing-${exIndex}`,
        sets: 3,
        reps: "12",
        note: "x".repeat(200),
        loadNote: "y".repeat(200),
      })),
    })),
  });

  beforeAll(async () => {
    ({ runMigrations } = await import("../../scripts/migrate"));
    await runMigrations(testDatabaseUrl);

    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.ADMIN_TOKEN = "test-admin-token";

    ({ getSql } = await import("./db.server"));
    ({ publishPlan, getPublished, listGallery, reportPlan, adminSetFlags, listAllForAdmin, listCustomExerciseCandidates } =
      await import("./publish.server"));
  });

  beforeEach(async () => {
    await getSql()`TRUNCATE tennisworkout.published_plans RESTART IDENTITY CASCADE`;
  });

  afterAll(async () => {
    await getSql().end();
  });

  it("publishes a valid plan and roundtrips it via getPublished", async () => {
    const result = await publishPlan(basePlan());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const row = await getPublished(result.slug);
    expect(row).not.toBeNull();
    expect(row?.doc.meta.name).toBe("Power Plan");
    expect(row?.remixOf).toBeNull();
    expect(row?.remixCount).toBe(0);
    expect(row?.featured).toBe(false);
    expect(typeof row?.createdAt).toBe("string");
  });

  it("rejects a plan with a URL in the description", async () => {
    const plan = basePlan();
    plan.meta.description = "Check out https://example.com for more";

    const result = await publishPlan(plan);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes("link"))).toBe(true);
  });

  it("rejects a plan document larger than 100KB", async () => {
    const plan = bigPlan();
    expect(JSON.stringify(plan).length).toBeGreaterThan(100_000);

    const result = await publishPlan(plan);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("plan too large");
  });

  it("hides a plan after 3 reports", async () => {
    const result = await publishPlan(basePlan());
    if (!result.ok) throw new Error("publish failed");

    expect(await getPublished(result.slug)).not.toBeNull();

    await reportPlan(result.slug);
    await reportPlan(result.slug);
    expect(await getPublished(result.slug)).not.toBeNull();

    await reportPlan(result.slug);
    expect(await getPublished(result.slug)).toBeNull();
  });

  it("lists gallery with featured first and hidden excluded", async () => {
    const a = await publishPlan(basePlan());
    const b = await publishPlan(basePlan());
    const c = await publishPlan(basePlan());
    if (!a.ok || !b.ok || !c.ok) throw new Error("publish failed");

    // Feature the last-published one; it should still sort first.
    await adminSetFlags(c.slug, { featured: true }, "test-admin-token");
    // Hide one; it must be excluded entirely.
    await reportPlan(b.slug);
    await reportPlan(b.slug);
    await reportPlan(b.slug);

    const gallery = await listGallery();
    const slugs = gallery.map((row) => row.slug);

    expect(slugs).toContain(a.slug);
    expect(slugs).not.toContain(b.slug);
    expect(slugs[0]).toBe(c.slug);
    expect(gallery.find((row) => row.slug === c.slug)?.featured).toBe(true);
  });

  it("filters gallery by goal, equipment, and daysPerWeek", async () => {
    const powerPlan = basePlan();
    const footworkPlan = { ...basePlan(), meta: { ...basePlan().meta, goals: ["footwork"], equipment: ["bands"], daysPerWeek: 4 } };

    const a = await publishPlan(powerPlan);
    const b = await publishPlan(footworkPlan);
    if (!a.ok || !b.ok) throw new Error("publish failed");

    const byGoal = await listGallery({ goal: "footwork" });
    expect(byGoal.map((r) => r.slug)).toEqual([b.slug]);

    const byEquipment = await listGallery({ equipment: "kettlebell" });
    expect(byEquipment.map((r) => r.slug)).toEqual([a.slug]);

    const byDays = await listGallery({ daysPerWeek: 4 });
    expect(byDays.map((r) => r.slug)).toEqual([b.slug]);
  });

  it("increments the parent's remixCount when publishing a remix", async () => {
    const parent = await publishPlan(basePlan());
    if (!parent.ok) throw new Error("publish failed");

    const child = await publishPlan(basePlan(), parent.slug);
    expect(child.ok).toBe(true);
    if (!child.ok) return;

    const childRow = await getPublished(child.slug);
    expect(childRow?.remixOf).toBe(parent.slug);

    const parentRow = await getPublished(parent.slug);
    expect(parentRow?.remixCount).toBe(1);
  });

  it("does not fail publish when remixOf points at a nonexistent slug", async () => {
    const result = await publishPlan(basePlan(), "does-not-exist");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const row = await getPublished(result.slug);
    expect(row?.remixOf).toBeNull();
  });

  it("adminSetFlags returns false for a wrong token and true (unhiding) for the right one", async () => {
    const result = await publishPlan(basePlan());
    if (!result.ok) throw new Error("publish failed");

    await reportPlan(result.slug);
    await reportPlan(result.slug);
    await reportPlan(result.slug);
    expect(await getPublished(result.slug)).toBeNull();

    const wrongTokenResult = await adminSetFlags(result.slug, { hidden: false }, "wrong-token");
    expect(wrongTokenResult).toBe(false);
    expect(await getPublished(result.slug)).toBeNull();

    const rightTokenResult = await adminSetFlags(result.slug, { hidden: false }, "test-admin-token");
    expect(rightTokenResult).toBe(true);
    expect(await getPublished(result.slug)).not.toBeNull();
  });

  it("listAllForAdmin returns hidden rows with the right token", async () => {
    const a = await publishPlan(basePlan());
    const b = await publishPlan(basePlan());
    if (!a.ok || !b.ok) throw new Error("publish failed");

    await reportPlan(b.slug);
    await reportPlan(b.slug);
    await reportPlan(b.slug);
    expect(await getPublished(b.slug)).toBeNull();

    const rows = await listAllForAdmin("test-admin-token");
    expect(rows).not.toBeNull();
    const slugs = rows?.map((row) => row.slug) ?? [];
    expect(slugs).toContain(a.slug);
    expect(slugs).toContain(b.slug);
  });

  it("listAllForAdmin returns null with a wrong token", async () => {
    const result = await publishPlan(basePlan());
    if (!result.ok) throw new Error("publish failed");

    expect(await listAllForAdmin("wrong-token")).toBeNull();
  });

  describe("listCustomExerciseCandidates", () => {
    it("groups custom exercises across published plans, case-insensitively", async () => {
      const withCustom = (name: string) => ({
        ...basePlan(),
        days: [
          {
            label: "Day 1",
            focus: "Power",
            warmup: [],
            main: [{ exerciseId: "custom-aaa1", sets: 2, reps: "10" }],
          },
        ],
        customExercises: [{ id: "custom-aaa1", name, cues: "Land soft." }],
      });
      const r1 = await publishPlan(withCustom("Bosu 360 Smash"));
      const r2 = await publishPlan(withCustom("bosu 360 smash"));
      expect(r1.ok && r2.ok).toBe(true);

      const candidates = await listCustomExerciseCandidates(process.env.ADMIN_TOKEN!);
      expect(candidates).not.toBeNull();
      const smash = candidates!.find((c) => c.name.toLowerCase() === "bosu 360 smash");
      expect(smash?.uses).toBe(2);
      expect(smash?.sampleCues).toBe("Land soft.");
      expect(smash?.examplePlanSlug).toBeTruthy();
    });

    it("returns null with a wrong token", async () => {
      expect(await listCustomExerciseCandidates("nope")).toBeNull();
    });
  });

});
