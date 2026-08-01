import postgres from "postgres";

// Lazy singleton: the app must be able to build/boot without DATABASE_URL set
// until a server route actually touches the DB, so we never connect at
// import time.
let cached: postgres.Sql | undefined;

export function getSql(): postgres.Sql {
  if (!cached) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not set");
    }
    cached = postgres(databaseUrl, {
      connection: { search_path: "tennisworkout" },
      onnotice: () => {},
    });
  }
  return cached;
}
