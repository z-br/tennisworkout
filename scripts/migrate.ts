import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");

// Applies every un-run file in migrations/*.sql (sorted) inside its own
// transaction, recording it in tennisworkout.schema_migrations. Returns the
// list of migration filenames that were newly applied.
export async function runMigrations(databaseUrl: string): Promise<string[]> {
  const sql = postgres(databaseUrl, { onnotice: () => {} });
  const applied: string[] = [];
  try {
    await sql`CREATE SCHEMA IF NOT EXISTS tennisworkout`;
    await sql`
      CREATE TABLE IF NOT EXISTS tennisworkout.schema_migrations (
        name text PRIMARY KEY,
        run_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();

    for (const file of files) {
      const already = await sql`
        SELECT 1 FROM tennisworkout.schema_migrations WHERE name = ${file}
      `;
      if (already.length > 0) continue;

      const contents = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(contents);
        await tx`INSERT INTO tennisworkout.schema_migrations (name) VALUES (${file})`;
      });
      applied.push(file);
      console.log(`Applied migration: ${file}`);
    }
  } finally {
    await sql.end();
  }
  return applied;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  runMigrations(databaseUrl)
    .then((applied) => {
      if (applied.length === 0) console.log("No new migrations to apply.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
