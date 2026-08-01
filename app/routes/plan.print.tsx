import { Link } from "react-router";
import type { Route } from "./+types/plan.print";
import { getExercise } from "~/lib/exercises/library";
import { getPlan, type StoredPlan } from "~/lib/store/local";
import type { Equipment, PlanExercise, Protocol, RampPhase } from "~/lib/plan/schema";

export function meta() {
  return [{ title: "Print — Tennis Workout Builder" }];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const plan = await getPlan(params.id);
  return plan ?? null;
}
clientLoader.hydrate = true as const;

// ─── Pure helpers (exported for unit tests) ────────────────────────────────

const EQUIPMENT_SHORT_LABELS: Record<Equipment, string> = {
  kettlebell: "KB",
  dumbbell: "DB",
  trx: "TRX",
  bands: "Bands",
  "pullup-bar": "Bar",
  "medicine-ball": "Med Ball",
  "balance-board": "Balance Board",
  flexbar: "FlexBar",
  bench: "Bench",
  none: "",
};

const ACCENT_CLASSES = ["d1", "d2", "d3", "d4"] as const;

/** Cycles the four accent colors for day index >= 4. */
export function accentClass(dayIndex: number): string {
  return ACCENT_CLASSES[dayIndex % ACCENT_CLASSES.length];
}

export function exerciseName(exerciseId: string): string {
  return getExercise(exerciseId)?.name ?? exerciseId;
}

/** Renders dose label: sets×reps (or targets) if both; sets only if only sets; reps only if only reps; undefined if neither. */
export function doseLabel(ex: PlanExercise): string | undefined {
  if (ex.sets !== undefined && ex.reps) return `${ex.sets}×${ex.reps}`;
  if (ex.targetSets !== undefined && ex.targetReps) return `${ex.targetSets}×${ex.targetReps}`;
  if (ex.sets !== undefined) return `${ex.sets} sets`;
  if (ex.targetSets !== undefined) return `${ex.targetSets} sets`;
  if (ex.reps) return `${ex.reps}`;
  if (ex.targetReps) return `${ex.targetReps}`;
  return undefined;
}

export function isWarmupProtocolName(name: string): boolean {
  return /warm.?up/i.test(name);
}

/** Sheet 1's daily strip: first protocol entry that isn't a warm-up. */
export function dailyStripProtocol(protocols: Protocol[]): Protocol | undefined {
  return protocols.find((p) => !isWarmupProtocolName(p.name));
}

/** Sheet 2 renders only when a protocol is explicitly named like a warm-up. */
export function warmupCardProtocol(protocols: Protocol[]): Protocol | undefined {
  return protocols.find((p) => isWarmupProtocolName(p.name));
}

export function equipmentList(equipment: readonly Equipment[]): string {
  return equipment
    .map((e) => EQUIPMENT_SHORT_LABELS[e])
    .filter(Boolean)
    .join(" · ");
}

export function rampSummary(phases: readonly RampPhase[]): string {
  return phases.map((p) => `${p.name} ${p.pct}% (wk ${p.weeks[0]}–${p.weeks[1]})`).join(" · ");
}

function finisherLine(items: PlanExercise[]): string {
  return items
    .map((ex) => {
      const dose = doseLabel(ex);
      return dose ? `${exerciseName(ex.exerciseId)} ${dose}` : exerciseName(ex.exerciseId);
    })
    .join(", ");
}

// ─── Styles (ported from Tennis_Workout_OnePager.html + PreMatch_Warmup_Card.html,
// generalized and scoped under .print-root so nothing leaks into the app) ──
const PRINT_STYLES = `
.print-root {
  --ink:#1a2230; --muted:#5d6b80; --line:#dde3ec; --paper:#fff;
  --d1:#d64545; --d2:#2f7dc4; --d3:#e08a1e; --d4:#2f9e6f; --daily:#7a4fd0;
  --green:#2f9e6f; --green-d:#247a55; --chip:#eaf6f0;
  font-family: -apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  color: var(--ink);
}
.print-root *{box-sizing:border-box;}
.print-root .sheets{background:#eef1f5;padding:18px;}
.print-root .sheet{background:var(--paper);width:1040px;max-width:100%;margin:0 auto 18px;padding:20px 22px;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,.08);}

.print-root header{display:flex;align-items:baseline;justify-content:space-between;border-bottom:3px solid var(--ink);padding-bottom:8px;margin-bottom:12px;}
.print-root header h1{font-size:22px;letter-spacing:.3px;margin:0;}
.print-root header .meta{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;}

.print-root .daily{display:flex;align-items:center;gap:14px;background:linear-gradient(0deg,#f5f0ff,#faf7ff);border:1.5px solid var(--daily);border-radius:7px;padding:9px 14px;margin-bottom:14px;}
.print-root .daily .tag{flex:0 0 auto;background:var(--daily);color:#fff;font-weight:700;font-size:11px;letter-spacing:.5px;text-transform:uppercase;padding:5px 9px;border-radius:5px;line-height:1.2;text-align:center;}
.print-root .daily .tag small{display:block;font-weight:500;font-size:9px;opacity:.85;text-transform:none;}
.print-root .daily ul{list-style:none;display:flex;flex-wrap:wrap;gap:4px 20px;flex:1;margin:0;padding:0;}
.print-root .daily li{font-size:12px;white-space:nowrap;}
.print-root .daily li b{color:var(--daily);}
.print-root .daily .gate{flex:0 0 220px;font-size:10.5px;color:var(--muted);border-left:1px solid var(--line);padding-left:12px;}

.print-root .grid{display:grid;gap:12px;}
.print-root .day{border:1px solid var(--line);border-radius:7px;overflow:hidden;display:flex;flex-direction:column;}
.print-root .day h2{font-size:12.5px;color:#fff;padding:7px 10px;line-height:1.25;margin:0;}
.print-root .day .focus{font-size:9.5px;font-weight:500;opacity:.92;display:block;text-transform:none;letter-spacing:0;}
.print-root .day.d1 h2{background:var(--d1);}
.print-root .day.d2 h2{background:var(--d2);}
.print-root .day.d3 h2{background:var(--d3);}
.print-root .day.d4 h2{background:var(--d4);}
.print-root .day .warm{font-size:9.5px;color:var(--muted);padding:6px 10px;border-bottom:1px dashed var(--line);font-style:italic;}
.print-root .day ol{list-style:none;counter-reset:ex;padding:6px 10px 8px;margin:0;flex:1;}
.print-root .day li{counter-increment:ex;font-size:11px;line-height:1.5;padding:2.5px 0 2.5px 18px;position:relative;border-bottom:1px solid #f1f4f8;}
.print-root .day li:last-child{border-bottom:none;}
.print-root .day li::before{content:counter(ex);position:absolute;left:0;top:3px;font-size:8.5px;font-weight:700;color:#fff;background:var(--muted);width:13px;height:13px;border-radius:50%;text-align:center;line-height:13px;}
.print-root .day.d1 li::before{background:var(--d1);}
.print-root .day.d2 li::before{background:var(--d2);}
.print-root .day.d3 li::before{background:var(--d3);}
.print-root .day.d4 li::before{background:var(--d4);}
.print-root .day .dose{display:block;font-size:10px;color:var(--muted);font-weight:600;}
.print-root .day .fin{font-size:10px;background:#f6f8fb;border-top:1px solid var(--line);padding:6px 10px;color:var(--ink);}
.print-root .day .fin b{text-transform:uppercase;font-size:8.5px;letter-spacing:.5px;color:var(--muted);}

.print-root footer{display:flex;justify-content:space-between;align-items:center;margin-top:13px;border-top:1px solid var(--line);padding-top:8px;font-size:10px;color:var(--muted);gap:16px;}
.print-root footer b{color:var(--ink);}

.print-root .warmup-sheet{width:420px;max-width:100%;padding:0;overflow:hidden;}
.print-root .warmup-sheet header{background:linear-gradient(135deg,var(--green),var(--green-d));color:#fff;padding:16px 18px;border-bottom:none;margin-bottom:0;display:block;}
.print-root .warmup-sheet header h1{font-size:19px;letter-spacing:.2px;display:flex;align-items:center;gap:7px;}
.print-root .warmup-sheet header .sub{font-size:12px;opacity:.9;margin-top:3px;letter-spacing:.5px;text-transform:uppercase;}
.print-root .warmup-steps{list-style:none;counter-reset:step;padding:8px 14px 4px;margin:0;}
.print-root .warmup-steps li{counter-increment:step;display:flex;align-items:flex-start;gap:11px;padding:10px 2px;border-bottom:1px solid var(--line);}
.print-root .warmup-steps li:last-child{border-bottom:none;}
.print-root .warmup-steps li::before{content:counter(step);flex:0 0 24px;height:24px;background:var(--green);color:#fff;border-radius:50%;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;margin-top:1px;}
.print-root .warmup-steps .txt{flex:1;font-size:13.5px;line-height:1.35;}
.print-root .warmup-steps .txt b{font-weight:700;}
.print-root .warmup-steps .txt .d{display:block;font-size:11.5px;color:var(--muted);margin-top:1px;}
.print-root .warmup-steps .time{flex:0 0 auto;font-size:11px;font-weight:700;color:var(--green-d);background:var(--chip);padding:3px 8px;border-radius:20px;margin-top:1px;white-space:nowrap;}
.print-root .key{margin:6px 14px 16px;background:#f4faf6;border:1px solid var(--line);border-left:4px solid var(--green);border-radius:8px;padding:11px 13px;font-size:12.5px;line-height:1.4;}
.print-root .key b{color:var(--green-d);}

@media print {
  .print-root .sheets{background:#fff;padding:0;}
  .print-root .sheet{width:auto;box-shadow:none;border-radius:0;padding:0.35in;margin:0;break-after:page;}
  .print-root .sheet:last-child{break-after:auto;}
  @page{size:landscape;margin:0.5in;}
}
`;

function PlanPrintScreen({ plan }: { plan: StoredPlan }) {
  const { doc } = plan;
  const dailyProtocol = dailyStripProtocol(doc.dailyProtocols);
  const warmupProtocol = warmupCardProtocol(doc.dailyProtocols);
  const gridColumns = Math.min(doc.meta.daysPerWeek, 4);
  const metaParts = [
    `${doc.meta.daysPerWeek} days/week`,
    "~45 min",
    equipmentList(doc.meta.equipment),
  ].filter(Boolean);

  return (
    <main className="print-root">
      <style>{PRINT_STYLES}</style>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-4 pt-4 print:hidden">
        <Link
          to={`/plan/${plan.id}/edit`}
          className="text-sm text-gray-500 hover:underline dark:text-gray-400"
        >
          ← Back to edit
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Tip: use landscape orientation for the one-pager.
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
          >
            Print
          </button>
        </div>
      </div>

      <div className="sheets">
        {/* Sheet 1: one-pager */}
        <div className="sheet">
          <header>
            <h1>{doc.meta.name}</h1>
            <div className="meta">{metaParts.join(" · ")}</div>
          </header>

          {dailyProtocol && (
            <div className="daily">
              <div className="tag">
                ★ Daily
                <small>{dailyProtocol.name}</small>
              </div>
              <ul>
                {dailyProtocol.items.map((item, i) => {
                  const dose = doseLabel(item);
                  return (
                    <li key={i}>
                      <b>{i + 1}.</b> {exerciseName(item.exerciseId)}
                      {dose ? ` — ${dose}` : ""}
                    </li>
                  );
                })}
              </ul>
              <div className="gate">
                <b>Symptom gate:</b> pain ≤{doc.injuryConfig.gate.proceedMax}/10 & no worse next
                morning → progress. Worse → hold or drop {doc.injuryConfig.gate.dropPct}%.
              </div>
            </div>
          )}

          <div className="grid" style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}>
            {doc.days.map((day, dayIndex) => {
              const accent = accentClass(dayIndex);
              const warmupNames = day.warmup.map((ex) => exerciseName(ex.exerciseId)).join(", ");
              return (
                <div className={`day ${accent}`} key={dayIndex}>
                  <h2>
                    {day.label}
                    <span className="focus">{day.focus}</span>
                  </h2>
                  {day.warmup.length > 0 && <div className="warm">Warm-up: {warmupNames}</div>}
                  <ol>
                    {day.main.map((ex, exIndex) => {
                      const dose = doseLabel(ex);
                      return (
                        <li key={exIndex}>
                          {exerciseName(ex.exerciseId)}
                          {dose && <span className="dose">{dose}</span>}
                        </li>
                      );
                    })}
                  </ol>
                  {day.finisher && day.finisher.length > 0 && (
                    <div className="fin">
                      <b>Finisher</b> · {finisherLine(day.finisher)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <footer>
            <div className="ramp">
              {doc.ramp ? (
                <>
                  <b>Ramp:</b> {rampSummary(doc.ramp.phases)}
                </>
              ) : (
                "Tennis Workout Builder"
              )}
            </div>
          </footer>
        </div>

        {/* Sheet 2: pre-match warm-up card (only when a warm-up protocol exists) */}
        {warmupProtocol && (
          <div className="sheet warmup-sheet">
            <header>
              <h1>🎾 {warmupProtocol.name}</h1>
              <div className="sub">Pre-match warm-up</div>
            </header>
            <ol className="warmup-steps">
              {warmupProtocol.items.map((item, i) => {
                const dose = doseLabel(item);
                return (
                  <li key={i}>
                    <span className="txt">
                      <b>{exerciseName(item.exerciseId)}</b>
                      {item.note && <span className="d">{item.note}</span>}
                    </span>
                    {dose && <span className="time">{dose}</span>}
                  </li>
                );
              })}
            </ol>
            {warmupProtocol.cue && (
              <div className="key">
                <b>Note:</b> {warmupProtocol.cue}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function PlanPrint({ loaderData }: Route.ComponentProps) {
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

  return <PlanPrintScreen plan={loaderData} />;
}
