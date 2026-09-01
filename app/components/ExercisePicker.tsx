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
  onCreateCustom,
  onClose,
}: {
  equipment: Equipment[];
  currentExerciseId?: string;
  onSelect: (exerciseId: string) => void;
  /** Called with a name + optional cue when the user creates their own exercise. */
  onCreateCustom: (name: string, cues?: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCues, setCustomCues] = useState("");
  const q = query.trim().toLowerCase();

  function submitCustom() {
    const name = customName.trim();
    if (!name) return;
    onCreateCustom(name.slice(0, 80), customCues.trim().slice(0, 200) || undefined);
  }

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
        className="w-full max-w-lg rounded-xl bg-white p-4 shadow-xl dark:bg-grass-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-grass-900 dark:text-ivory-100">
            {currentExerciseId ? "Swap exercise" : "Add exercise"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-grass-700 hover:text-grass-800 dark:text-ivory-300 dark:hover:text-ivory-100"
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
          className="mb-4 w-full rounded-lg border border-ivory-300 px-3 py-2 text-sm dark:border-grass-700 dark:bg-grass-950 dark:text-ivory-100"
        />

        <div className="mb-4 rounded-lg border border-dashed border-grass-600/50 p-3 dark:border-ivory-300/30">
          {creating ? (
            <div className="space-y-2">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitCustom()}
                placeholder="Exercise name (e.g. Bosu 360 Smash)"
                maxLength={80}
                autoFocus
                data-testid="custom-exercise-name"
                className="w-full rounded-lg border border-ivory-300 px-3 py-2 text-sm dark:border-grass-700 dark:bg-grass-950 dark:text-ivory-100"
              />
              <input
                type="text"
                value={customCues}
                onChange={(e) => setCustomCues(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitCustom()}
                placeholder="Coaching cue (optional)"
                maxLength={200}
                className="w-full rounded-lg border border-ivory-300 px-3 py-2 text-sm dark:border-grass-700 dark:bg-grass-950 dark:text-ivory-100"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={submitCustom}
                  disabled={!customName.trim()}
                  data-testid="custom-exercise-save"
                  className="rounded-full bg-grass-900 px-4 py-1.5 text-sm font-semibold text-ivory-50 hover:bg-grass-700 disabled:opacity-40 dark:bg-optic-400 dark:text-grass-950"
                >
                  Add it
                </button>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="text-sm text-grass-700 hover:underline dark:text-ivory-300"
                >
                  Cancel
                </button>
                <span className="text-xs text-grass-700/70 dark:text-ivory-300/60">
                  Saved into this plan; gets a video search link automatically.
                </span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              data-testid="create-custom-exercise"
              className="text-sm font-medium text-grass-800 hover:underline dark:text-ivory-200"
            >
              ＋ Create your own exercise
            </button>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {currentExerciseId && suggested.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-xs font-semibold uppercase text-grass-700 dark:text-ivory-300">
                Suggested swaps
              </h3>
              <ul className="space-y-1">
                {suggested.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(e.id)}
                      className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-ivory-200 dark:hover:bg-gray-800"
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
              <h3 className="mb-2 text-xs font-semibold uppercase text-grass-700 dark:text-ivory-300">
                {PATTERN_LABELS[group.pattern]}
              </h3>
              <ul className="space-y-1">
                {group.exercises.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(e.id)}
                      className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-ivory-200 dark:hover:bg-gray-800"
                    >
                      {e.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {grouped.length === 0 && suggested.length === 0 && (
            <p className="text-sm text-grass-700 dark:text-ivory-300">No exercises match your search.</p>
          )}
        </div>
      </div>
    </div>
  );
}
