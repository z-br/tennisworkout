import { Link } from "react-router";
import type { PublishedRow } from "~/lib/publish.server";

const EXCERPT_LENGTH = 120;

function excerpt(text: string, length: number): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length).trimEnd()}…`;
}

export function PlanCard({ row }: { row: PublishedRow }) {
  const { doc, slug, remixCount, featured } = row;
  const { name, description, goals, equipment, daysPerWeek } = doc.meta;

  return (
    <Link
      to={`/p/${slug}`}
      className="group block rounded-2xl border border-ivory-300 bg-white p-4 transition hover:-translate-y-0.5 hover:border-grass-600 hover:shadow-md dark:border-grass-800 dark:bg-grass-900 dark:hover:border-ivory-300"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-lg font-semibold text-grass-900 dark:text-ivory-100">{name}</h3>
        {featured && (
          <span
            className="shrink-0 rounded-full bg-optic-400 px-1.5 text-sm text-grass-950"
            title="Featured"
            aria-label="Featured"
          >
            ★
          </span>
        )}
      </div>

      {description && (
        <p className="mt-1 text-sm text-grass-800/80 dark:text-ivory-200/80">
          {excerpt(description, EXCERPT_LENGTH)}
        </p>
      )}

      {goals.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {goals.map((goal) => (
            <span
              key={goal}
              className="rounded-full bg-court-100 px-2 py-0.5 text-xs font-medium text-court-700 dark:bg-court-700/30 dark:text-court-100"
            >
              {goal}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-grass-700 dark:text-ivory-300">
        <span>
          {equipment.length > 0 ? equipment.join(", ") : "no equipment"}
        </span>
        <span>·</span>
        <span>
          {daysPerWeek} day{daysPerWeek === 1 ? "" : "s"}/week
        </span>
        <span>·</span>
        <span>
          {remixCount} remix{remixCount === 1 ? "" : "es"}
        </span>
      </div>
    </Link>
  );
}
