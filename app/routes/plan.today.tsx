import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/plan.today";
import { ProtocolCard } from "~/components/ProtocolCard";
import { SessionRunner } from "~/components/SessionRunner";
import { currentPhase } from "~/lib/plan/ramp";
import {
  getLogs,
  getPlan,
  getProtocolDates,
  logProtocolDone,
  protocolStreak,
  savePlan,
  type SessionLog,
  type StoredPlan,
} from "~/lib/store/local";

export function meta() {
  return [{ title: "Today — Tennis Workout Builder" }];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const plan = await getPlan(params.id);
  if (!plan) return null;
  const protocolNames = plan.doc.dailyProtocols.map((p) => p.name);
  const [logs, protocolDatesLists] = await Promise.all([
    getLogs(plan.id),
    Promise.all(protocolNames.map((name) => getProtocolDates(name))),
  ]);
  const protocolDatesByName: Record<string, string[]> = {};
  protocolNames.forEach((name, i) => {
    protocolDatesByName[name] = protocolDatesLists[i];
  });
  return { plan, logs, protocolDatesByName };
}
clientLoader.hydrate = true as const;

/** getLogs returns date-ascending; the next session picks up right after the last one, wrapping past the end of the plan. */
export function nextDayIndex(logs: SessionLog[], dayCount: number): number {
  const last = logs.at(-1); // getLogs returns date-ascending
  return last ? (last.dayIndex + 1) % dayCount : 0;
}

/** Ramp week is anchored to startedAt; week 1 covers the first 7 days. */
export function currentWeek(startedAt: string | undefined, today: string): number {
  if (!startedAt) return 1;
  const ms = new Date(today).getTime() - new Date(startedAt).getTime();
  return Math.max(1, Math.floor(ms / (7 * 86400_000)) + 1);
}

function PlanTodayScreen({
  plan,
  initialLogs,
  initialProtocolDatesByName,
}: {
  plan: StoredPlan;
  initialLogs: SessionLog[];
  initialProtocolDatesByName: Record<string, string[]>;
}) {
  // Computed once per render — Date use is fine in the app, just not in lib logic.
  const today = new Date().toISOString().slice(0, 10);

  const [startedAt, setStartedAt] = useState(plan.startedAt);
  const [logs, setLogs] = useState(initialLogs);
  const [protocolDatesByName, setProtocolDatesByName] = useState(initialProtocolDatesByName);

  // First visit anchors the ramp week to today.
  useEffect(() => {
    if (plan.startedAt) return;
    void savePlan({ ...plan, startedAt: today }).then(() => setStartedAt(today));
    // Only ever needs to run once, on mount — startedAt is set at most once per plan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const week = currentWeek(startedAt, today);
  const phase = plan.doc.ramp ? currentPhase(plan.doc.ramp.phases, week) : undefined;
  const dayIndex = nextDayIndex(logs, plan.doc.days.length);
  const day = plan.doc.days[dayIndex];

  async function handleMarkProtocolDone(protocolName: string) {
    await logProtocolDone(protocolName, today);
    setProtocolDatesByName((prev) => {
      const existing = prev[protocolName] ?? [];
      if (existing.includes(today)) return prev;
      return { ...prev, [protocolName]: [...existing, today] };
    });
  }

  function handleSessionLogged(log: SessionLog) {
    setLogs((prev) => [...prev, log]);
  }

  return (
    <main className="mx-auto max-w-xl px-4 pb-32 pt-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link to="/" className="text-sm text-gray-500 hover:underline dark:text-gray-400">
          ← Back home
        </Link>
        <Link
          to={`/plan/${plan.id}/edit`}
          className="text-sm text-gray-500 hover:underline dark:text-gray-400"
        >
          Edit plan
        </Link>
      </div>

      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
        {plan.doc.meta.name}
      </h1>
      {plan.doc.ramp && phase && (
        <span
          data-testid="week-chip"
          className="mb-6 inline-block rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          Week {week} — {phase.name} ({phase.pct}%)
        </span>
      )}

      <div className="mt-6">
        {plan.doc.dailyProtocols.map((protocol, i) => {
          const dates = protocolDatesByName[protocol.name] ?? [];
          return (
            <ProtocolCard
              key={i}
              protocol={protocol}
              isDoneToday={dates.includes(today)}
              streak={protocolStreak(dates, today)}
              onMarkDone={() => void handleMarkProtocolDone(protocol.name)}
            />
          );
        })}

        <SessionRunner
          planId={plan.id}
          dayIndex={dayIndex}
          day={day}
          phasePct={phase?.pct ?? 100}
          logs={logs}
          injuryFlags={plan.doc.injuryConfig.flags}
          gate={plan.doc.injuryConfig.gate}
          today={today}
          onSessionLogged={handleSessionLogged}
        />
      </div>
    </main>
  );
}

export default function PlanToday({ loaderData }: Route.ComponentProps) {
  if (!loaderData) {
    return (
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-16 text-center">
        <h1 className="mb-3 text-2xl font-bold text-gray-900 dark:text-gray-100">
          This plan isn't on this device
        </h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Plans are stored locally in your browser and don't sync between devices. If you built
          this plan elsewhere, export it there and import the backup file here to bring it back.
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

  const { plan, logs, protocolDatesByName } = loaderData;
  return (
    <PlanTodayScreen plan={plan} initialLogs={logs} initialProtocolDatesByName={protocolDatesByName} />
  );
}
