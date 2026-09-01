import { useSyncExternalStore } from "react";
import { data, isRouteErrorResponse, Link, useFetcher, useNavigate, useRouteError } from "react-router";
import { Icon } from "~/components/Icon";
import type { Route } from "./+types/published";
import { getExercise } from "~/lib/exercises/library";
import { getPublished, type PublishedRow } from "~/lib/publish.server";
import type { PlanDay, PlanExercise } from "~/lib/plan/schema";
import { savePlan } from "~/lib/store/local";

export async function loader({ params, request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  // Behind a reverse proxy (Coolify/Cloudflare Tunnel) the request URL's
  // protocol is whatever the proxy used internally (often http), not what
  // the client actually connected with — honor x-forwarded-proto so the
  // og:image URL doesn't point at an http origin.
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const origin = forwardedProto ? `${forwardedProto}://${url.host}` : url.origin;

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
      <h1 className="mb-3 text-2xl font-bold text-grass-900 dark:text-ivory-100">
        {isNotFound ? "Plan not found" : "Unavailable right now"}
      </h1>
      <p className="mb-6 text-grass-800/80 dark:text-ivory-200/80">
        {isNotFound
          ? "This plan doesn't exist, or it's no longer public."
          : "We couldn't load this plan. Please try again in a moment."}
      </p>
      <Link
        to="/"
        className="rounded-full bg-grass-900 px-6 py-3 font-semibold text-ivory-50 hover:bg-grass-700 dark:bg-optic-400 dark:text-grass-950 dark:hover:bg-optic-300"
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
        <span className="font-medium text-grass-900 dark:text-ivory-100">{name}</span>
        {dose && <span className="text-sm text-grass-700 dark:text-ivory-300">{dose}</span>}
        {exercise?.video && (
          <a
            href={exercise.video}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-court-600 hover:underline dark:text-court-100"
          >
            ▶ video
          </a>
        )}
      </div>
      {ex.note && <p className="text-sm text-grass-800/80 dark:text-ivory-200/80">{ex.note}</p>}
    </li>
  );
}

function ExerciseGroup({ title, items }: { title: string; items: PlanExercise[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-grass-700 dark:text-ivory-300">
        {title}
      </h4>
      <ul className="mt-1 divide-y divide-ivory-200 dark:divide-grass-800">
        {items.map((ex, i) => (
          <PlanExerciseItem key={i} ex={ex} />
        ))}
      </ul>
    </div>
  );
}

function DaySection({ day }: { day: PlanDay }) {
  return (
    <section className="mb-6 rounded-2xl border border-ivory-300 p-5 dark:border-grass-800">
      <h3 className="text-lg font-semibold text-grass-900 dark:text-ivory-100">{day.label}</h3>
      {day.focus && <p className="text-sm text-grass-700 dark:text-ivory-300">{day.focus}</p>}
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

// False during SSR and hydration, true once React has attached event handlers.
// The remix/report buttons write to IndexedDB / submit fetches — clicks before
// hydration would silently no-op, so they stay disabled until this flips.
function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export default function Published({ loaderData }: Route.ComponentProps) {
  const { row } = loaderData;
  const { doc } = row;
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const hydrated = useHydrated();

  async function handleRemix() {
    const id = await cloneAsRemix(row);
    navigate(`/plan/${id}/edit`);
  }

  function handleReport() {
    fetcher.submit({ slug: row.slug }, { method: "post", action: "/api/report" });
  }

  const isReporting = fetcher.state !== "idle";
  const reportSucceeded = fetcher.data?.ok === true;
  const reportFailed = fetcher.data?.ok === false;

  return (
    <main className="mx-auto max-w-2xl px-4 pb-32 pt-8">
      <Link to="/" className="text-sm text-grass-700 hover:underline dark:text-ivory-300">
        ← Back home
      </Link>

      <header className="mt-4 mb-8">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-3xl font-semibold text-grass-900 dark:text-ivory-100">{doc.meta.name}</h1>
          {row.featured && (
            <span
              className="shrink-0 rounded-full bg-optic-400 px-1.5 text-sm text-grass-950"
              title="Featured"
              aria-label="Featured"
            >
              ★
            </span>
          )}
        </div>

        {doc.meta.description && (
          <p className="mt-2 text-grass-800/80 dark:text-ivory-200/80">{doc.meta.description}</p>
        )}

        {doc.meta.goals.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {doc.meta.goals.map((goal) => (
              <span
                key={goal}
                className="rounded-full bg-court-100 px-2 py-0.5 text-xs font-medium text-court-700 dark:bg-court-700/30 dark:text-court-100"
              >
                {goal}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-grass-700 dark:text-ivory-300">
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
          <p className="mt-2 text-sm text-grass-700 dark:text-ivory-300">
            Remixed from{" "}
            <Link
              to={`/p/${row.remixOf}`}
              className="text-court-600 hover:underline dark:text-court-100"
            >
              {row.remixOf}
            </Link>
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="remix-btn"
            disabled={!hydrated}
            aria-busy={!hydrated}
            onClick={() => void handleRemix()}
            className="inline-flex items-center gap-2 rounded-full bg-grass-900 px-5 py-2.5 text-sm font-semibold text-ivory-50 hover:bg-grass-700 disabled:cursor-wait disabled:opacity-50 dark:bg-optic-400 dark:text-grass-950 dark:hover:bg-optic-300"
          >
            <Icon name="remix" />
            {hydrated ? "Remix this plan" : "Loading…"}
          </button>
          <Link
            to={`/p/${row.slug}/print`}
            className="inline-flex items-center gap-1.5 text-sm text-grass-700 hover:underline dark:text-ivory-300"
          >
            <Icon name="print" />
            Print
          </Link>
          <div className="flex flex-col items-start gap-1">
            <button
              type="button"
              onClick={handleReport}
              disabled={!hydrated || isReporting || reportSucceeded}
              className="inline-flex items-center gap-1.5 text-sm text-grass-700 hover:underline disabled:cursor-default disabled:no-underline disabled:opacity-60 dark:text-ivory-300"
            >
              <Icon name="flag" size={13} />
              {reportSucceeded ? "Thanks — reported" : isReporting ? "Reporting…" : "Report"}
            </button>
            {reportFailed && (
              <span className="text-xs text-red-600 dark:text-red-400">
                Couldn't report — try again
              </span>
            )}
          </div>
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-grass-900 dark:text-ivory-100">Days</h2>
        {doc.days.map((day, i) => (
          <DaySection key={i} day={day} />
        ))}
      </section>

      {doc.dailyProtocols.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-grass-900 dark:text-ivory-100">
            Daily protocols
          </h2>
          {doc.dailyProtocols.map((protocol, i) => (
            <div key={i} className="mb-4 rounded-2xl border border-ivory-300 p-5 dark:border-grass-800">
              <h3 className="text-lg font-semibold text-grass-900 dark:text-ivory-100">
                {protocol.name}
              </h3>
              {protocol.cue && (
                <p className="text-sm text-grass-700 dark:text-ivory-300">{protocol.cue}</p>
              )}
              <ExerciseGroup title="Items" items={protocol.items} />
            </div>
          ))}
        </section>
      )}

      {doc.ramp && (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-grass-900 dark:text-ivory-100">Ramp-up</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-grass-700 dark:text-ivory-300">
                <th className="pb-2 pr-4 font-semibold">Phase</th>
                <th className="pb-2 pr-4 font-semibold">Weeks</th>
                <th className="pb-2 font-semibold">Load</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200 dark:divide-grass-800">
              {doc.ramp.phases.map((phase, i) => (
                <tr key={i}>
                  <td className="py-2 pr-4 text-grass-900 dark:text-ivory-100">{phase.name}</td>
                  <td className="py-2 pr-4 text-grass-800/80 dark:text-ivory-200/80">
                    {phase.weeks[0]}–{phase.weeks[1]}
                  </td>
                  <td className="py-2 text-grass-800/80 dark:text-ivory-200/80">{phase.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
