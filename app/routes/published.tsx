import { useState } from "react";
import { data, isRouteErrorResponse, Link, useFetcher, useNavigate, useRouteError } from "react-router";
import type { Route } from "./+types/published";
import { getExercise } from "~/lib/exercises/library";
import { getPublished, type PublishedRow } from "~/lib/publish.server";
import type { PlanDay, PlanExercise } from "~/lib/plan/schema";
import { savePlan } from "~/lib/store/local";

export async function loader({ params, request }: Route.LoaderArgs) {
  const origin = new URL(request.url).origin;

  let row;
  try {
    row = await getPublished(params.slug);
  } catch {
    // getPublished requires a reachable DB; surface as 503 rather than a
    // generic 500 so the ErrorBoundary can explain what happened.
    throw data("Unavailable", { status: 503 });
  }
  if (!row) throw data("Not found", { status: 404 });

  return { row, origin };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { row, origin } = loaderData;
  const title = row.doc.meta.name;
  const description = row.doc.meta.description || "A shared tennis workout plan";
  const image = `${origin}/p/${row.slug}/card.png`;

  return [
    { title: `${title} — Tennis Workout Builder` },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: image },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

export function ErrorBoundary() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const isNotFound = status === 404;

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-24 text-center">
      <h1 className="mb-3 text-2xl font-bold text-gray-900 dark:text-gray-100">
        {isNotFound ? "Plan not found" : "Unavailable right now"}
      </h1>
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        {isNotFound
          ? "This plan doesn't exist, or it's no longer public."
          : "We couldn't load this plan. Please try again in a moment."}
      </p>
      <Link
        to="/"
        className="rounded-full bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
      >
        Back home
      </Link>
    </main>
  );
}

/** "sets × reps"-style dose text, falling back to whichever of sets/reps/targets is present. */
function doseText(ex: PlanExercise): string | undefined {
  const sets = ex.sets ?? ex.targetSets;
  const reps = ex.reps ?? ex.targetReps;
  if (sets !== undefined && reps !== undefined) return `${sets} × ${reps}`;
  if (sets !== undefined) return `${sets} sets`;
  return reps;
}

function PlanExerciseItem({ ex }: { ex: PlanExercise }) {
  const exercise = getExercise(ex.exerciseId);
  const name = exercise?.name ?? ex.exerciseId;
  const dose = doseText(ex);

  return (
    <li className="py-1.5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="font-medium text-gray-900 dark:text-gray-100">{name}</span>
        {dose && <span className="text-sm text-gray-500 dark:text-gray-400">{dose}</span>}
        {exercise?.video && (
          <a
            href={exercise.video}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-emerald-600 hover:underline dark:text-emerald-400"
          >
            ▶ video
          </a>
        )}
      </div>
      {ex.note && <p className="text-sm text-gray-600 dark:text-gray-400">{ex.note}</p>}
    </li>
  );
}

function ExerciseGroup({ title, items }: { title: string; items: PlanExercise[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {title}
      </h4>
      <ul className="mt-1 divide-y divide-gray-100 dark:divide-gray-800">
        {items.map((ex, i) => (
          <PlanExerciseItem key={i} ex={ex} />
        ))}
      </ul>
    </div>
  );
}

function DaySection({ day }: { day: PlanDay }) {
  return (
    <section className="mb-6 rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{day.label}</h3>
      {day.focus && <p className="text-sm text-gray-500 dark:text-gray-400">{day.focus}</p>}
      <ExerciseGroup title="Warm-up" items={day.warmup} />
      <ExerciseGroup title="Main" items={day.main} />
      <ExerciseGroup title="Finisher" items={day.finisher ?? []} />
    </section>
  );
}

async function cloneAsRemix(row: PublishedRow): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await savePlan({
    id,
    doc: {
      ...row.doc,
      meta: { ...row.doc.meta, name: `${row.doc.meta.name} (remix)`, remixOf: row.slug },
    },
    createdAt: now,
    updatedAt: now,
    sourceSlug: row.slug,
  });
  return id;
}

export default function Published({ loaderData }: Route.ComponentProps) {
  const { row } = loaderData;
  const { doc } = row;
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const [reported, setReported] = useState(false);

  async function handleRemix() {
    const id = await cloneAsRemix(row);
    navigate(`/plan/${id}/edit`);
  }

  async function handleRemixToPrint() {
    const id = await cloneAsRemix(row);
    navigate(`/plan/${id}/print`);
  }

  function handleReport() {
    fetcher.submit({ slug: row.slug }, { method: "post", action: "/api/report" });
    setReported(true);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-32 pt-8">
      <Link to="/" className="text-sm text-gray-500 hover:underline dark:text-gray-400">
        ← Back home
      </Link>

      <header className="mt-4 mb-8">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{doc.meta.name}</h1>
          {row.featured && (
            <span className="shrink-0 text-amber-500" title="Featured" aria-label="Featured">
              ★
            </span>
          )}
        </div>

        {doc.meta.description && (
          <p className="mt-2 text-gray-600 dark:text-gray-400">{doc.meta.description}</p>
        )}

        {doc.meta.goals.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {doc.meta.goals.map((goal) => (
              <span
                key={goal}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                {goal}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
          <span>{doc.meta.equipment.length > 0 ? doc.meta.equipment.join(", ") : "no equipment"}</span>
          <span>·</span>
          <span>
            {doc.meta.daysPerWeek} day{doc.meta.daysPerWeek === 1 ? "" : "s"}/week
          </span>
          <span>·</span>
          <span>
            {row.remixCount} remix{row.remixCount === 1 ? "" : "es"}
          </span>
        </div>

        {row.remixOf && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Remixed from{" "}
            <Link
              to={`/p/${row.remixOf}`}
              className="text-emerald-600 hover:underline dark:text-emerald-400"
            >
              {row.remixOf}
            </Link>
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="remix-btn"
            onClick={() => void handleRemix()}
            className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
          >
            Remix this plan
          </button>
          <button
            type="button"
            onClick={() => void handleRemixToPrint()}
            title="Printables only work on your own local copy — this makes one for you, then opens the print view."
            className="text-sm text-gray-500 hover:underline dark:text-gray-400"
          >
            Remix to print
          </button>
          <button
            type="button"
            onClick={handleReport}
            disabled={reported}
            className="text-sm text-gray-500 hover:underline disabled:cursor-default disabled:no-underline disabled:opacity-60 dark:text-gray-400"
          >
            {reported ? "Thanks — reported" : "Report"}
          </button>
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-100">Days</h2>
        {doc.days.map((day, i) => (
          <DaySection key={i} day={day} />
        ))}
      </section>

      {doc.dailyProtocols.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Daily protocols
          </h2>
          {doc.dailyProtocols.map((protocol, i) => (
            <div key={i} className="mb-4 rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {protocol.name}
              </h3>
              {protocol.cue && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{protocol.cue}</p>
              )}
              <ExerciseGroup title="Items" items={protocol.items} />
            </div>
          ))}
        </section>
      )}

      {doc.ramp && (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-100">Ramp-up</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <th className="pb-2 pr-4 font-semibold">Phase</th>
                <th className="pb-2 pr-4 font-semibold">Weeks</th>
                <th className="pb-2 font-semibold">Load</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {doc.ramp.phases.map((phase, i) => (
                <tr key={i}>
                  <td className="py-2 pr-4 text-gray-900 dark:text-gray-100">{phase.name}</td>
                  <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">
                    {phase.weeks[0]}–{phase.weeks[1]}
                  </td>
                  <td className="py-2 text-gray-600 dark:text-gray-400">{phase.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
