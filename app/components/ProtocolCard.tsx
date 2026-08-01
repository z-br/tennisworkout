import { useState } from "react";
import { getExercise } from "~/lib/exercises/library";
import type { Protocol } from "~/lib/plan/schema";

export function ProtocolCard({
  protocol,
  isDoneToday,
  streak,
  onMarkDone,
}: {
  protocol: Protocol;
  isDoneToday: boolean;
  streak: number;
  onMarkDone: () => void;
}) {
  // Item checks are visual-only scratch state — nothing is persisted per
  // item, only the single daily "done" flag below.
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  return (
    <section className="mb-6 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">{protocol.name}</h2>
        {streak >= 1 && (
          <span className="text-sm text-gray-600 dark:text-gray-400">🔥 {streak}-day streak</span>
        )}
      </div>
      {protocol.cue && <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">{protocol.cue}</p>}

      <ul className="mb-3 space-y-2">
        {protocol.items.map((item, i) => {
          const meta = getExercise(item.exerciseId);
          const name = meta?.name ?? item.exerciseId;
          return (
            <li key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={!!checked[i]}
                onChange={(e) => setChecked((prev) => ({ ...prev, [i]: e.target.checked }))}
                aria-label={name}
                className="h-4 w-4"
              />
              <span className={checked[i] ? "text-gray-400 line-through dark:text-gray-600" : ""}>
                {name}
              </span>
              {meta?.video && (
                <a
                  href={meta.video}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${name} video`}
                  className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ↗
                </a>
              )}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onMarkDone}
        disabled={isDoneToday}
        data-testid="protocol-done-btn"
        className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
      >
        {isDoneToday ? "Done ✓" : "Done today"}
      </button>
    </section>
  );
}
