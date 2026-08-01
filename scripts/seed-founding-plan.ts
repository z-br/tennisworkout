import { fileURLToPath } from "node:url";
import { getSql } from "../app/lib/db.server.ts";
import { publishPlan, adminSetFlags } from "../app/lib/publish.server.ts";
import { FOUNDING_PLAN } from "../app/lib/seed/founding-plan.ts";

export type SeedResult =
  | { ok: true; slug: string; alreadySeeded: boolean }
  | { ok: false; errors: string[] };

// Publishes the founding plan (Greg's elbow-safe power plan) and marks it
// featured so it sorts first in the gallery. Idempotent: if a featured plan
// with this name is already published, it returns that slug without
// publishing again. Run with:
//   DATABASE_URL=... ADMIN_TOKEN=... node --experimental-strip-types scripts/seed-founding-plan.ts
export async function seedFoundingPlan(): Promise<SeedResult> {
  if (!process.env.DATABASE_URL) {
    return { ok: false, errors: ["DATABASE_URL is not set"] };
  }
  if (!process.env.ADMIN_TOKEN) {
    return { ok: false, errors: ["ADMIN_TOKEN is not set"] };
  }

  const sql = getSql();

  const existing = await sql`
    SELECT slug FROM tennisworkout.published_plans
    WHERE doc->'meta'->>'name' = ${FOUNDING_PLAN.meta.name} AND featured
  `;
  if (existing.length > 0) {
    return { ok: true, slug: existing[0].slug as string, alreadySeeded: true };
  }

  const published = await publishPlan(FOUNDING_PLAN);
  if (!published.ok) {
    return { ok: false, errors: published.errors };
  }

  const flagged = await adminSetFlags(published.slug, { featured: true }, process.env.ADMIN_TOKEN);
  if (!flagged) {
    return { ok: false, errors: [`adminSetFlags failed for slug ${published.slug}`] };
  }

  return { ok: true, slug: published.slug, alreadySeeded: false };
}

async function main(): Promise<void> {
  try {
    const result = await seedFoundingPlan();
    if (!result.ok) {
      console.error("Seeding failed:", result.errors.join("; "));
      process.exitCode = 1;
      return;
    }
    if (result.alreadySeeded) {
      console.log(`already seeded (${result.slug})`);
    } else {
      console.log(`Seeded founding plan: ${result.slug}`);
    }
  } catch (err) {
    console.error("Seeding failed:", err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  } finally {
    // Only tear down the connection if it could have been opened —
    // getSql() throws if DATABASE_URL was never set.
    if (process.env.DATABASE_URL) {
      await getSql().end();
    }
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  void main();
}
