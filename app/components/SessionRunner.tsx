import { useState } from "react";
import { Link } from "react-router";
import { RestTimer } from "~/components/RestTimer";
import { getExercise } from "~/lib/exercises/library";
import { gateDecision, scaledDose } from "~/lib/plan/ramp";
import type { InjuryConfig, InjuryFlag, PlanDay, PlanExercise } from "~/lib/plan/schema";
import { logSession, type SessionLog } from "~/lib/store/local";

type EntryKey = string; // `${section}-${index}`

function hasInjuryOverlap(ex: PlanExercise, injuryFlags: InjuryFlag[]): boolean {
  const meta = getExercise(ex.exerciseId);
  if (!meta) return false;
  return Object.keys(meta.injuryLoad).some((flag) => injuryFlags.includes(flag as InjuryFlag));
}

function lastActualFor(logs: SessionLog[], exerciseId: string): string | undefined {
  for (let i = logs.length - 1; i >= 0; i--) {
    const entry = logs[i].entries.find((e) => e.exerciseId === exerciseId && e.actual);
    if (entry) return entry.actual;
  }
  return undefined;
}

function doseLabel(ex: PlanExercise, phasePct: number): string {
  const dose = scaledDose(ex, phasePct);
  return [dose.sets, dose.reps].filter((v) => v !== undefined && v !== "").join(" × ");
}

function GateBanner({ result }: { result: "hold-or-drop" | "stop" }) {
  const tone =
    result === "stop"
      ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
      : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300";
  const message =
    result === "stop"
      ? "Symptom gate: stop this movement for today."
      : "Symptom gate: hold this load or drop ~20% next time.";
  return <p className={`mt-2 rounded-lg border px-3 py-2 text-sm ${tone}`}>{message}</p>;
}

function ExerciseCard({
  ex,
  phasePct,
  lastActual,
  showPainSlider,
  gate,
  actual,
  pain,
  onActualChange,
  onPainChange,
}: {
  ex: PlanExercise;
  phasePct: number;
  lastActual?: string;
  showPainSlider: boolean;
  gate: InjuryConfig["gate"];
  actual: string;
  pain?: number;
  onActualChange: (value: string) => void;
  onPainChange: (value: number) => void;
}) {
  const meta = getExercise(ex.exerciseId);
  const name = meta?.name ?? ex.exerciseId;
  const dose = doseLabel(ex, phasePct);
  const gateResult = pain !== undefined ? gateDecision(pain, false, gate) : "proceed";

  return (
    <div className="mb-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <div className="mb-1 flex items-start justify-between gap-2">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">{name}</h3>
        {meta?.video && (
          <a
            href={meta.video}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ↗ video
          </a>
        )}
      </div>
      {dose && <p className="mb-1 text-sm text-gray-600 dark:text-gray-400">{dose}</p>}
      {meta?.cues && <p className="mb-2 text-sm text-gray-500 dark:text-gray-500">{meta.cues}</p>}
      {meta?.levels && meta.levels.length > 0 && (
        <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">
          Levels: {meta.levels.map((level, i) => `L${i + 1} ${level}`).join(" → ")} — Move up when 3×8
          feels solid.
        </p>
      )}
      {lastActual && (
        <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">Last: {lastActual}</p>
      )}
      <input
        type="text"
        value={actual}
        onChange={(e) => onActualChange(e.target.value)}
        placeholder="What did you do?"
        aria-label={`${name} actual`}
        className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      />
      {showPainSlider && (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <label htmlFor={`pain-${ex.exerciseId}`}>Pain during</label>
            <span>{pain ?? 0}</span>
          </div>
          <input
            id={`pain-${ex.exerciseId}`}
            type="range"
            min={0}
            max={10}
            value={pain ?? 0}
            onChange={(e) => onPainChange(Number(e.target.value))}
            aria-label={`${name} pain during`}
            className="w-full"
          />
        </div>
      )}
      {showPainSlider && pain !== undefined && gateResult !== "proceed" && (
        <GateBanner result={gateResult} />
      )}
    </div>
  );
}

function SummaryView({
  planId,
  log,
  gate,
}: {
  planId: string;
  log: SessionLog;
  gate: InjuryConfig["gate"];
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
      <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Session logged</h2>
      <ul className="mb-6 space-y-2">
        {log.entries.map((entry, i) => {
          const meta = getExercise(entry.exerciseId);
          const gateResult = entry.pain !== undefined ? gateDecision(entry.pain, false, gate) : "proceed";
          return (
            <li key={i} className="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-800">
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {meta?.name ?? entry.exerciseId}
              </p>
              <p className="text-gray-600 dark:text-gray-400">{entry.actual || "—"}</p>
              {gateResult !== "proceed" && <GateBanner result={gateResult} />}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-3">
        <Link
          to={`/plan/${planId}/today`}
          reloadDocument
          data-testid="back-to-plan-link"
          className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-500"
        >
          Back to plan
        </Link>
        <Link
          to="/"
          className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
        >
          Home
        </Link>
      </div>
    </div>
  );
}

export function SessionRunner({
  planId,
  dayIndex,
  day,
  phasePct,
  logs,
  injuryFlags,
  gate,
  today,
  onSessionLogged,
}: {
  planId: string;
  dayIndex: number;
  day: PlanDay;
  phasePct: number;
  logs: SessionLog[];
  injuryFlags: InjuryFlag[];
  gate: InjuryConfig["gate"];
  today: string;
  onSessionLogged: (log: SessionLog) => void;
}) {
  const [actuals, setActuals] = useState<Record<EntryKey, string>>({});
  const [pains, setPains] = useState<Record<EntryKey, number>>({});
  const [summaryLog, setSummaryLog] = useState<SessionLog | null>(null);

  function setActual(key: EntryKey, value: string) {
    setActuals((prev) => ({ ...prev, [key]: value }));
  }

  function setPain(key: EntryKey, value: number) {
    setPains((prev) => ({ ...prev, [key]: value }));
  }

  async function handleFinish() {
    const entries: SessionLog["entries"] = [
      ...day.main.map((ex, i) => {
        const key: EntryKey = `main-${i}`;
        const pain = pains[key];
        return {
          exerciseId: ex.exerciseId,
          actual: actuals[key] ?? "",
          ...(pain !== undefined ? { pain } : {}),
        };
      }),
      ...(day.finisher ?? []).map((ex, i) => ({
        exerciseId: ex.exerciseId,
        actual: actuals[`finisher-${i}`] ?? "",
      })),
    ];

    const log: SessionLog = {
      id: crypto.randomUUID(),
      planId,
      dayIndex,
      date: today,
      entries,
      loggedAt: new Date().toISOString(),
    };

    await logSession(log);
    onSessionLogged(log);
    setSummaryLog(log);
  }

  if (summaryLog) {
    return <SummaryView planId={planId} log={summaryLog} gate={gate} />;
  }

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Day {dayIndex + 1} — {day.label}
      </h2>

      {day.warmup.length > 0 && (
        <details className="mb-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <summary className="cursor-pointer font-medium text-gray-900 dark:text-gray-100">
            Warm-up
          </summary>
          <ul className="mt-3 space-y-2">
            {day.warmup.map((ex, i) => {
              const meta = getExercise(ex.exerciseId);
              const name = meta?.name ?? ex.exerciseId;
              return (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" aria-label={name} className="h-4 w-4" />
                  <span>{name}</span>
                </li>
              );
            })}
          </ul>
        </details>
      )}

      <div className="mb-4">
        <RestTimer />
      </div>

      {day.main.map((ex, i) => {
        const key: EntryKey = `main-${i}`;
        return (
          <ExerciseCard
            key={key}
            ex={ex}
            phasePct={phasePct}
            lastActual={lastActualFor(logs, ex.exerciseId)}
            showPainSlider={hasInjuryOverlap(ex, injuryFlags)}
            gate={gate}
            actual={actuals[key] ?? ""}
            pain={pains[key]}
            onActualChange={(value) => setActual(key, value)}
            onPainChange={(value) => setPain(key, value)}
          />
        );
      })}

      {day.finisher && day.finisher.length > 0 && (
        <>
          <h2 className="mb-3 mt-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Finisher
          </h2>
          {day.finisher.map((ex, i) => {
            const key: EntryKey = `finisher-${i}`;
            return (
              <ExerciseCard
                key={key}
                ex={ex}
                phasePct={phasePct}
                showPainSlider={false}
                gate={gate}
                actual={actuals[key] ?? ""}
                onActualChange={(value) => setActual(key, value)}
                onPainChange={() => {}}
              />
            );
          })}
        </>
      )}

      <button
        type="button"
        onClick={() => void handleFinish()}
        data-testid="finish-session-btn"
        className="mt-6 w-full rounded-full bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
      >
        Finish session
      </button>
    </div>
  );
}
