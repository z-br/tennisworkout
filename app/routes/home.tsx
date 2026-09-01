import { useEffect, useState, type ChangeEvent } from "react";
import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/home";
import { Icon } from "~/components/Icon";
import { PlanCard } from "~/components/PlanCard";
import { listGallery, type PublishedRow } from "~/lib/publish.server";
import { GOALS, EQUIPMENT, type Goal, type Equipment } from "~/lib/plan/schema";
import { deletePlan, exportAll, importAll, listPlans, type StoredPlan } from "~/lib/store/local";

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
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (confirmingDelete !== id) {
      setConfirmingDelete(id);
      return;
    }
    setConfirmingDelete(null);
    await deletePlan(id);
    setYourPlans(await listPlans());
  }

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
      <section className="hero-court relative -mx-4 mb-12 overflow-hidden px-4 text-ivory-100 sm:rounded-b-3xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-optic-400/60"
        />
        {/* court-line motif: sideline + service line, barely-there */}
        <div aria-hidden="true" className="court-lines pointer-events-none absolute inset-0" />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 pt-20 pb-16 text-center">
          <p className="hero-rise text-[11px] font-semibold tracking-[0.35em] text-ivory-300 uppercase">
            Order of play · your season
          </p>
          <h1
            className="font-display hero-rise max-w-3xl text-5xl leading-[1.08] font-semibold text-ivory-50 sm:text-6xl"
            style={{ animationDelay: "80ms" }}
          >
            A tennis workout that fits{" "}
            <em className="relative inline-block not-italic">
              your
              <span aria-hidden="true" className="hero-underline absolute right-0 -bottom-1 left-0 h-1.5 rounded-full bg-optic-400" />
            </em>{" "}
            body, gear, and goals.
          </h1>
          <p className="hero-rise max-w-xl text-lg text-ivory-200" style={{ animationDelay: "160ms" }}>
            A free plan builder tuned for tennis players: pick your goals and equipment, get a
            weekly plan with a ramp-up schedule, and track it as you go.
          </p>
          <div className="hero-rise flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "240ms" }}>
            <Link
              to="/build"
              className="rounded-full bg-optic-400 px-7 py-3.5 text-lg font-semibold text-grass-950 shadow-[0_0_0_0_rgba(217,242,79,0.4)] transition hover:-translate-y-0.5 hover:bg-optic-300 hover:shadow-[0_6px_24px_-4px_rgba(217,242,79,0.5)]"
            >
              Build my plan
            </Link>
            <a
              href="#gallery"
              className="rounded-full border border-ivory-100/40 px-7 py-3.5 text-lg font-medium text-ivory-100 transition hover:border-optic-400 hover:text-optic-300"
            >
              Browse shared plans
            </a>
          </div>
        </div>
      </section>

      <section className="pb-12">
        {yourPlans.length > 0 && (
          <div className="rounded-2xl border-2 border-dashed border-grass-600/40 bg-ivory-100/60 p-5 dark:border-ivory-300/30 dark:bg-grass-900/40">
            <div className="mb-1 flex items-center gap-2">
              <Icon name="device" size={18} />
              <h2 className="font-display text-2xl font-semibold text-grass-900 dark:text-ivory-100">
                Your plans
              </h2>
              <span className="rounded-full bg-ivory-200 px-2 py-0.5 text-xs font-medium text-grass-700 dark:bg-grass-800 dark:text-ivory-300">
                stored in this browser
              </span>
            </div>
            <p className="mb-4 text-sm text-grass-700 dark:text-ivory-300">
              These are your private working copies. <strong>This device only</strong> = never
              shared. <strong>Published</strong> = you've shared a snapshot to the gallery — your
              local edits stay private until you publish again.
            </p>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {yourPlans.map((plan) => (
                <li
                  key={plan.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ivory-300 bg-white p-4 dark:border-grass-800 dark:bg-grass-900"
                >
                  <Link to={`/plan/${plan.id}/today`} className="min-w-0 flex-1">
                    <span className="font-display block truncate font-semibold text-grass-900 dark:text-ivory-100">
                      {plan.doc.meta.name}
                    </span>
                  </Link>
                  {plan.sourceSlug ? (
                    <Link
                      to={`/p/${plan.sourceSlug}`}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-grass-100 px-2 py-0.5 text-xs font-medium text-grass-800 hover:bg-grass-200 dark:bg-grass-800 dark:text-ivory-200"
                      title="This plan has a published version — tap to view it"
                    >
                      <Icon name="globe" size={11} />
                      Published
                    </Link>
                  ) : (
                    <span
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ivory-200 px-2 py-0.5 text-xs font-medium text-grass-700 dark:bg-grass-800 dark:text-ivory-300"
                      title="Only on this device — publish from the editor to share it"
                    >
                      <Icon name="device" size={11} />
                      This device only
                    </span>
                  )}
                  <Link
                    to={`/plan/${plan.id}/edit`}
                    className="inline-flex shrink-0 items-center gap-1 text-sm text-grass-700 hover:underline dark:text-ivory-300"
                  >
                    <Icon name="edit" size={13} />
                    edit
                  </Link>
                  <Link
                    to={`/plan/${plan.id}/print`}
                    className="inline-flex shrink-0 items-center gap-1 text-sm text-grass-700 hover:underline dark:text-ivory-300"
                  >
                    <Icon name="print" size={13} />
                    print
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleDelete(plan.id)}
                    onBlur={() => setConfirmingDelete(null)}
                    className={
                      confirmingDelete === plan.id
                        ? "inline-flex shrink-0 items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-sm font-medium text-white"
                        : "inline-flex shrink-0 items-center gap-1 text-sm text-grass-700 hover:text-red-600 dark:text-ivory-300 dark:hover:text-red-400"
                    }
                  >
                    <Icon name="trash" size={13} />
                    {confirmingDelete === plan.id ? "Really delete?" : "delete"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <details className="mt-4 text-sm text-grass-700 dark:text-ivory-300">
          <summary className="cursor-pointer select-none text-xs text-grass-700/70 hover:text-grass-900 dark:text-ivory-300/60 dark:hover:text-ivory-100">
            Advanced · backup &amp; device transfer
          </summary>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleExport()}
              className="inline-flex items-center gap-1.5 rounded-full border border-ivory-300 px-3 py-1.5 hover:border-grass-600 dark:border-grass-700 dark:hover:border-ivory-300"
            >
              <Icon name="download" size={13} />
              Export data
            </button>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-ivory-300 px-3 py-1.5 hover:border-grass-600 dark:border-grass-700 dark:hover:border-ivory-300">
              <Icon name="upload" size={13} />
              Import data
              <input
                type="file"
                accept="application/json"
                onChange={(e) => void handleImportFile(e)}
                className="hidden"
              />
            </label>
            <span className="text-xs text-grass-700/70 dark:text-ivory-300/60">
              Moves your plans &amp; history between devices as a JSON file.
            </span>
          </div>
          {importError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{importError}</p>
          )}
        </details>
      </section>

      <section id="gallery" className="scroll-mt-8">
        <div className="mb-4 flex items-center gap-4">
          <h2 className="font-display text-2xl font-semibold text-grass-900 dark:text-ivory-100">
            Shared plans
          </h2>
          <div className="court-rule flex-1 text-grass-900 dark:text-ivory-300" aria-hidden="true" />
        </div>

        <form method="get" className="mb-6 flex flex-wrap gap-3">
          <select
            name="goal"
            defaultValue={searchParams.get("goal") ?? ""}
            className="rounded-lg border border-ivory-300 bg-white px-3 py-2 text-sm text-grass-950 dark:border-grass-700 dark:bg-grass-900 dark:text-ivory-100"
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
            className="rounded-lg border border-ivory-300 bg-white px-3 py-2 text-sm text-grass-950 dark:border-grass-700 dark:bg-grass-900 dark:text-ivory-100"
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
            className="rounded-lg border border-ivory-300 bg-white px-3 py-2 text-sm text-grass-950 dark:border-grass-700 dark:bg-grass-900 dark:text-ivory-100"
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
            className="rounded-lg border border-grass-600 px-4 py-2 text-sm font-medium text-grass-800 hover:bg-grass-50 dark:border-grass-600 dark:text-ivory-200 dark:hover:bg-grass-900"
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
            <p className="rounded-xl border border-dashed border-ivory-300 p-8 text-center text-grass-700 dark:border-grass-700 dark:text-ivory-300">
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
