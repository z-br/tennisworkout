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
      className="block rounded-2xl border border-gray-200 p-4 hover:border-gray-400 hover:shadow-sm transition dark:border-gray-800 dark:hover:border-gray-600"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{name}</h3>
        {featured && (
          <span className="shrink-0 text-amber-500" title="Featured" aria-label="Featured">
            ★
          </span>
        )}
      </div>

      {description && (
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {excerpt(description, EXCERPT_LENGTH)}
        </p>
      )}

      {goals.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {goals.map((goal) => (
            <span
              key={goal}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {goal}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
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
