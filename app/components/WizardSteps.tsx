import { EQUIPMENT, GOALS, INJURY_FLAGS } from "~/lib/plan/schema";
import type { Equipment, Goal, InjuryFlag } from "~/lib/plan/schema";

const GOAL_LABELS: Record<Goal, string> = {
  power: "Explosive power",
  footwork: "Footwork & agility",
  "injury-management": "Injury management",
  "general-fitness": "General fitness",
};

const EQUIPMENT_LABELS: Record<Equipment, string> = {
  kettlebell: "Kettlebells",
  dumbbell: "Dumbbells",
  trx: "TRX",
  bands: "Resistance bands",
  "pullup-bar": "Pull-up bar",
  "medicine-ball": "Medicine ball",
  "balance-board": "Balance board",
  flexbar: "FlexBar",
  bench: "Bench",
  none: "No equipment",
};

const INJURY_LABELS: Record<InjuryFlag, string> = {
  elbow: "Tennis/golf elbow",
  shoulder: "Shoulder",
  knee: "Knee",
  foot: "Foot / plantar",
};

function OptionCard({
  selected,
  label,
  onClick,
  testId,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-xl border p-4 text-left font-medium transition ${
        selected
          ? "border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900"
          : "border-gray-200 text-gray-700 hover:border-gray-400 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-600"
      }`}
    >
      {label}
    </button>
  );
}

export function GoalsStep({
  selected,
  onToggle,
}: {
  selected: readonly Goal[];
  onToggle: (goal: Goal) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {GOALS.map((goal) => (
        <OptionCard
          key={goal}
          testId={`goal-${goal}`}
          label={GOAL_LABELS[goal]}
          selected={selected.includes(goal)}
          onClick={() => onToggle(goal)}
        />
      ))}
    </div>
  );
}

export function DaysStep({
  selected,
  onSelect,
}: {
  selected: 2 | 3 | 4 | null;
  onSelect: (days: 2 | 3 | 4) => void;
}) {
  const options = [2, 3, 4] as const;
  return (
    <div className="grid grid-cols-3 gap-3">
      {options.map((n) => (
        <OptionCard
          key={n}
          testId={`days-${n}`}
          label={`${n} days/week`}
          selected={selected === n}
          onClick={() => onSelect(n)}
        />
      ))}
    </div>
  );
}

export function EquipmentStep({
  selected,
  onToggle,
}: {
  selected: readonly Equipment[];
  onToggle: (item: Equipment) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {EQUIPMENT.map((item) => (
        <OptionCard
          key={item}
          testId={`equip-${item}`}
          label={EQUIPMENT_LABELS[item]}
          selected={selected.includes(item)}
          onClick={() => onToggle(item)}
        />
      ))}
    </div>
  );
}

export function InjuriesStep({
  selected,
  noneSelected,
  onToggle,
  onNone,
}: {
  selected: readonly InjuryFlag[];
  noneSelected: boolean;
  onToggle: (flag: InjuryFlag) => void;
  onNone: () => void;
}) {
  return (
    <div>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Flagging an injury tailors exercise selection to avoid aggravating it and adds a daily
        rehab protocol to your plan.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {INJURY_FLAGS.map((flag) => (
          <OptionCard
            key={flag}
            testId={`injury-${flag}`}
            label={INJURY_LABELS[flag]}
            selected={selected.includes(flag)}
            onClick={() => onToggle(flag)}
          />
        ))}
        <OptionCard testId="injury-none" label="No injuries" selected={noneSelected} onClick={onNone} />
      </div>
    </div>
  );
}
