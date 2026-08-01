import { useEffect, useState, type ChangeEvent } from "react";
import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/home";
import { PlanCard } from "~/components/PlanCard";
import { listGallery, type PublishedRow } from "~/lib/publish.server";
import { GOALS, EQUIPMENT, type Goal, type Equipment } from "~/lib/plan/schema";
import { exportAll, importAll, listPlans, type StoredPlan } from "~/lib/store/local";

const DAYS_PER_WEEK_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

type GalleryFilter = { goal?: Goal; equipment?: Equipment; daysPerWeek?: number };

function parseFilters(params: URLSearchParams): GalleryFilter {
  const filter: GalleryFilter = {};

  const goal = params.get("goal");
  if (goal && (GOALS as readonly string[]).includes(goal)) {
    filter.goal = goal as Goal;
  }

  const equipment = params.get("equipment");
  if (equipment && (EQUIPMENT as readonly string[]).includes(equipment)) {
    filter.equipment = equipment as Equipment;
  }

  const daysRaw = params.get("days");
  if (daysRaw !== null) {
    const days = Number(daysRaw);
    if (Number.isInteger(days) && days >= 1 && days <= 7) {
      filter.daysPerWeek = days;
    }
  }

  return filter;
}

export function meta() {
  return [
    { title: "Tennis Workout Builder" },
    {
      name: "description",
      content: "Build a tennis workout that fits your body, your gear, your goals.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const filter = parseFilters(url.searchParams);

  try {
    const plans = await listGallery(filter);
    return { plans, dbUnavailable: false };
  } catch {
    // listGallery requires DATABASE_URL / a reachable DB. Local dev without
    // one should still render the page with an empty gallery instead of a
    // 500, so any failure here degrades to an empty result.
    return { plans: [] as PublishedRow[], dbUnavailable: true };
  }
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { plans, dbUnavailable } = loaderData;
  const [searchParams] = useSearchParams();
  const [yourPlans, setYourPlans] = useState<StoredPlan[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listPlans()
      .then((stored) => {
        if (!cancelled) setYourPlans(stored);
      })
      .catch(() => {
        // listPlans only fails if IndexedDB itself is broken (not just
        // unavailable — that degrades to the in-memory backend). Nothing
        // useful to show the user; the plans list just stays empty.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleExport() {
    let json: string;
    try {
      json = await exportAll();
    } catch {
      setImportError("Export failed — couldn't read local data");
      return;
    }
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tennisworkout-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same filename later
    if (!file) return;
    setImportError(null);
    try {
      const text = await file.text();
      await importAll(text);
      setYourPlans(await listPlans());
    } catch {
      setImportError("Import failed — not a valid backup file");
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16">
      <section className="flex flex-col items-center gap-6 pt-16 pb-12 text-center">
        <h1 className="max-w-2xl text-3xl font-bold text-gray-900 sm:text-4xl dark:text-gray-100">
          Build a tennis workout that fits your body, your gear, your goals.
        </h1>
        <p className="max-w-xl text-gray-600 dark:text-gray-400">
          A free plan builder tuned for tennis players: pick your goals and equipment, get a
          weekly plan with a ramp-up schedule, and track it as you go.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/build"
            className="rounded-full bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
          >
            Build my plan
          </Link>
          <a
            href="#gallery"
            className="rounded-full border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-500"
          >
            Browse shared plans
          </a>
        </div>
      </section>

      <section className="pb-12">
        {yourPlans.length > 0 && (
          <>
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
              Your plans
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {yourPlans.map((plan) => (
                <li
                  key={plan.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                >
                  <Link to={`/plan/${plan.id}/today`} className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-gray-900 dark:text-gray-100">
                      {plan.doc.meta.name}
                    </span>
                  </Link>
                  <Link
                    to={`/plan/${plan.id}/edit`}
                    className="shrink-0 text-sm text-gray-500 hover:underline dark:text-gray-400"
                  >
                    edit
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-700 dark:text-gray-300">Data:</span>
          <button
            type="button"
            onClick={() => void handleExport()}
            className="rounded-full border border-gray-300 px-3 py-1.5 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-500"
          >
            Export data
          </button>
          <label className="cursor-pointer rounded-full border border-gray-300 px-3 py-1.5 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-500">
            Import data
            <input
              type="file"
              accept="application/json"
              onChange={(e) => void handleImportFile(e)}
              className="hidden"
            />
          </label>
        </div>
        {importError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{importError}</p>
        )}
      </section>

      <section id="gallery" className="scroll-mt-8">
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
          Shared plans
        </h2>

        <form method="get" className="mb-6 flex flex-wrap gap-3">
          <select
            name="goal"
            defaultValue={searchParams.get("goal") ?? ""}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="">Any goal</option>
            {GOALS.map((goal) => (
              <option key={goal} value={goal}>
                {goal}
              </option>
            ))}
          </select>

          <select
            name="equipment"
            defaultValue={searchParams.get("equipment") ?? ""}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="">Any equipment</option>
            {EQUIPMENT.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            name="days"
            defaultValue={searchParams.get("days") ?? ""}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="">Any days/week</option>
            {DAYS_PER_WEEK_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} day{n === 1 ? "" : "s"}/week
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300"
          >
            Filter
          </button>
        </form>

        {plans.length === 0 ? (
          dbUnavailable ? (
            <p className="rounded-xl border border-amber-300 bg-amber-50 p-8 text-center text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Shared plans are temporarily unavailable.
            </p>
          ) : (
            <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
              No shared plans yet — be the first to publish one.
            </p>
          )
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((row) => (
              <PlanCard key={row.slug} row={row} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
