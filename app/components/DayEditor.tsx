import { getExercise } from "~/lib/exercises/library";
import type { PlanDay, PlanExercise } from "~/lib/plan/schema";

export type Section = "warmup" | "main" | "finisher";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "warmup", label: "Warm-up" },
  { key: "main", label: "Main" },
  { key: "finisher", label: "Finisher" },
];

export function ExerciseRow({
  exercise,
  onChange,
  onRemove,
  onSwap,
  removeDisabled,
  swapTestId,
}: {
  exercise: PlanExercise;
  onChange: (patch: Partial<PlanExercise>) => void;
  onRemove: () => void;
  onSwap: () => void;
  removeDisabled: boolean;
  swapTestId?: string;
}) {
  const meta = getExercise(exercise.exerciseId);
  const name = meta?.name ?? exercise.exerciseId;

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
      <span className="min-w-[10rem] flex-1 font-medium text-gray-900 dark:text-gray-100">
        {name}
      </span>
      <input
        type="number"
        min={1}
        value={exercise.sets ?? ""}
        onChange={(e) =>
          onChange({ sets: e.target.value === "" ? undefined : Number(e.target.value) })
        }
        placeholder="sets"
        aria-label={`${name} sets`}
        className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      />
      <input
        type="text"
        value={exercise.reps ?? ""}
        onChange={(e) => onChange({ reps: e.target.value || undefined })}
        placeholder="reps"
        aria-label={`${name} reps`}
        className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      />
      <input
        type="text"
        value={exercise.note ?? ""}
        onChange={(e) => onChange({ note: e.target.value || undefined })}
        placeholder="note"
        aria-label={`${name} note`}
        className="min-w-[8rem] flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      />
      {meta?.video && (
        <a
          href={meta.video}
          target="_blank"
          rel="noreferrer"
          aria-label={`${name} video`}
          className="px-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ↗
        </a>
      )}
      <button
        type="button"
        onClick={onSwap}
        data-testid={swapTestId}
        className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-500"
      >
        Swap
      </button>
      <button
        type="button"
        onClick={onRemove}
        disabled={removeDisabled}
        className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-red-600 hover:border-red-400 disabled:opacity-40 dark:border-gray-700 dark:text-red-400"
      >
        Remove
      </button>
    </li>
  );
}

export function DayEditor({
  day,
  dayIndex,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onLabelChange,
  onFocusChange,
  onExerciseChange,
  onRemoveExercise,
  onSwapExercise,
  onAddExercise,
}: {
  day: PlanDay;
  dayIndex: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onLabelChange: (label: string) => void;
  onFocusChange: (focus: string) => void;
  onExerciseChange: (section: Section, exIndex: number, patch: Partial<PlanExercise>) => void;
  onRemoveExercise: (section: Section, exIndex: number) => void;
  onSwapExercise: (section: Section, exIndex: number, exerciseId: string) => void;
  onAddExercise: (section: Section) => void;
}) {
  let rowCounter = 0;

  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={day.label}
            onChange={(e) => onLabelChange(e.target.value)}
            aria-label="Day label"
            className="mb-1 w-full rounded-lg border border-gray-300 px-2 py-1 font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <input
            type="text"
            value={day.focus}
            onChange={(e) => onFocusChange(e.target.value)}
            aria-label="Day focus"
            className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            aria-label="Move day up"
            className="rounded-lg border border-gray-300 px-2 py-1 text-sm disabled:opacity-30 dark:border-gray-700"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            aria-label="Move day down"
            className="rounded-lg border border-gray-300 px-2 py-1 text-sm disabled:opacity-30 dark:border-gray-700"
          >
            ▼
          </button>
        </div>
      </div>

      {SECTIONS.map(({ key, label }) => {
        const list = day[key] ?? [];
        return (
          <div key={key} className="mb-4 last:mb-0">
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
              {label}
            </h4>
            <ul className="space-y-2">
              {list.map((exercise, exIndex) => {
                const testId = `day-${dayIndex}-swap-${rowCounter}`;
                rowCounter += 1;
                return (
                  <ExerciseRow
                    key={exIndex}
                    exercise={exercise}
                    swapTestId={testId}
                    onChange={(patch) => onExerciseChange(key, exIndex, patch)}
                    onRemove={() => onRemoveExercise(key, exIndex)}
                    onSwap={() => onSwapExercise(key, exIndex, exercise.exerciseId)}
                    removeDisabled={key === "main" && list.length <= 1}
                  />
                );
              })}
            </ul>
            <button
              type="button"
              onClick={() => onAddExercise(key)}
              className="mt-2 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500"
            >
              + Add exercise
            </button>
          </div>
        );
      })}
    </div>
  );
}
