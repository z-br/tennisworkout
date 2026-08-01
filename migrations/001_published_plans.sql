CREATE SCHEMA IF NOT EXISTS tennisworkout;
CREATE TABLE IF NOT EXISTS tennisworkout.published_plans (
  slug         text PRIMARY KEY,
  doc          jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  remix_of     text REFERENCES tennisworkout.published_plans(slug),
  remix_count  integer NOT NULL DEFAULT 0,
  report_count integer NOT NULL DEFAULT 0,
  hidden       boolean NOT NULL DEFAULT false,
  featured     boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS published_plans_gallery
  ON tennisworkout.published_plans (featured DESC, created_at DESC) WHERE NOT hidden;
