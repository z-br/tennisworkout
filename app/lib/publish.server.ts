import { nanoid } from "nanoid";
import { getSql } from "./db.server";
import { migratePlan, type PlanDoc, type Goal, type Equipment } from "./plan/schema";
import { moderationIssues } from "./moderation";

export type PublishedRow = {
  slug: string;
  doc: PlanDoc;
  createdAt: string;
  remixOf: string | null;
  remixCount: number;
  reportCount: number;
  hidden: boolean;
  featured: boolean;
};

const MAX_DOC_SIZE = 100_000;
const REPORT_HIDE_THRESHOLD = 3;

type Row = {
  slug: string;
  doc: PlanDoc;
  created_at: Date;
  remix_of: string | null;
  remix_count: number;
  report_count: number;
  hidden: boolean;
  featured: boolean;
};

function toPublishedRow(row: Row): PublishedRow {
  return {
    slug: row.slug,
    doc: row.doc,
    createdAt: row.created_at.toISOString(),
    remixOf: row.remix_of,
    remixCount: row.remix_count,
    reportCount: row.report_count,
    hidden: row.hidden,
    featured: row.featured,
  };
}

export async function publishPlan(
  json: unknown,
  remixOf?: string,
): Promise<{ ok: true; slug: string } | { ok: false; errors: string[] }> {
  let doc: PlanDoc;
  try {
    doc = migratePlan(json);
  } catch (err) {
    return { ok: false, errors: [err instanceof Error ? err.message : String(err)] };
  }

  const issues = moderationIssues(doc);
  if (issues.length > 0) {
    return { ok: false, errors: issues };
  }

  if (JSON.stringify(doc).length > MAX_DOC_SIZE) {
    return { ok: false, errors: ["plan too large"] };
  }

  const sql = getSql();
  const slug = nanoid(10);

  await sql.begin(async (tx) => {
    // Only link + increment the parent when it actually exists. A
    // nonexistent remixOf must not fail the publish.
    let parentSlug: string | null = null;
    if (remixOf) {
      const parent = await tx`SELECT slug FROM published_plans WHERE slug = ${remixOf}`;
      if (parent.length > 0) parentSlug = remixOf;
    }

    await tx`
      INSERT INTO published_plans (slug, doc, remix_of)
      VALUES (${slug}, ${tx.json(doc)}, ${parentSlug})
    `;

    if (parentSlug) {
      await tx`UPDATE published_plans SET remix_count = remix_count + 1 WHERE slug = ${parentSlug}`;
    }
  });

  return { ok: true, slug };
}

export async function getPublished(slug: string): Promise<PublishedRow | null> {
  const sql = getSql();
  const rows = await sql<Row[]>`
    SELECT slug, doc, created_at, remix_of, remix_count, report_count, hidden, featured
    FROM published_plans
    WHERE slug = ${slug} AND NOT hidden
  `;
  if (rows.length === 0) return null;
  return toPublishedRow(rows[0]);
}

export async function listGallery(filter?: {
  goal?: Goal;
  equipment?: Equipment;
  daysPerWeek?: number;
}): Promise<PublishedRow[]> {
  const sql = getSql();
  const rows = await sql<Row[]>`
    SELECT slug, doc, created_at, remix_of, remix_count, report_count, hidden, featured
    FROM published_plans
    WHERE NOT hidden
    ${filter?.goal ? sql`AND doc->'meta'->'goals' ? ${filter.goal}` : sql``}
    ${filter?.equipment ? sql`AND doc->'meta'->'equipment' ? ${filter.equipment}` : sql``}
    ${filter?.daysPerWeek !== undefined ? sql`AND (doc->'meta'->>'daysPerWeek')::int = ${filter.daysPerWeek}` : sql``}
    ORDER BY featured DESC, created_at DESC
    LIMIT 100
  `;
  return rows.map(toPublishedRow);
}

export async function reportPlan(slug: string): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE published_plans
    SET
      report_count = report_count + 1,
      hidden = hidden OR (report_count + 1 >= ${REPORT_HIDE_THRESHOLD})
    WHERE slug = ${slug}
  `;
}

export async function adminSetFlags(
  slug: string,
  flags: { hidden?: boolean; featured?: boolean },
  token: string,
): Promise<boolean> {
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) return false;

  const sql = getSql();
  const result = await sql`
    UPDATE published_plans
    SET
      hidden = COALESCE(${flags.hidden ?? null}, hidden),
      featured = COALESCE(${flags.featured ?? null}, featured)
    WHERE slug = ${slug}
  `;
  return result.count > 0;
}

export async function listAllForAdmin(token: string): Promise<PublishedRow[] | null> {
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) return null;

  const sql = getSql();
  const rows = await sql<Row[]>`
    SELECT slug, doc, created_at, remix_of, remix_count, report_count, hidden, featured
    FROM published_plans
    ORDER BY created_at DESC
    LIMIT 500
  `;
  return rows.map(toPublishedRow);
}
