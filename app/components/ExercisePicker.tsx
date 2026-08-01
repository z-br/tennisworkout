import { useState } from "react";
import { EXERCISES, substitutions } from "~/lib/exercises/library";
import type { Pattern } from "~/lib/exercises/library";
import type { Equipment } from "~/lib/plan/schema";

const PATTERN_ORDER: Pattern[] = [
  "hinge", "squat", "push", "pull", "rotation", "carry",
  "plyo", "mobility", "tendon-rehab", "balance", "conditioning",
];

const PATTERN_LABELS: Record<Pattern, string> = {
  hinge: "Hinge",
  squat: "Squat",
  push: "Push",
  pull: "Pull",
  rotation: "Rotation",
  carry: "Carry",
  plyo: "Plyo",
  mobility: "Mobility",
  "tendon-rehab": "Tendon rehab",
  balance: "Balance",
  conditioning: "Conditioning",
};

export function ExercisePicker({
  equipment,
  currentExerciseId,
  onSelect,
  onClose,
}: {
  equipment: Equipment[];
  currentExerciseId?: string;
  onSelect: (exerciseId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const suggested = currentExerciseId
    ? substitutions(currentExerciseId, equipment).filter((e) => e.name.toLowerCase().includes(q))
    : [];

  const filtered = EXERCISES.filter((e) => e.name.toLowerCase().includes(q));
  const grouped = PATTERN_ORDER.map((pattern) => ({
    pattern,
    exercises: filtered.filter((e) => e.pattern === pattern),
  })).filter((g) => g.exercises.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-16"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white p-4 shadow-xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {currentExerciseId ? "Swap exercise" : "Add exercise"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises…"
          autoFocus
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
        />

        <div className="max-h-[60vh] overflow-y-auto">
          {currentExerciseId && suggested.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                Suggested swaps
              </h3>
              <ul className="space-y-1">
                {suggested.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(e.id)}
                      className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      {e.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {grouped.map((group) => (
            <div key={group.pattern} className="mb-4">
              <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                {PATTERN_LABELS[group.pattern]}
              </h3>
              <ul className="space-y-1">
                {group.exercises.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(e.id)}
                      className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      {e.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {grouped.length === 0 && suggested.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No exercises match your search.</p>
          )}
        </div>
      </div>
    </div>
  );
}
