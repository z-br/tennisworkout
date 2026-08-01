import { useState } from "react";
import { useNavigate } from "react-router";
import { DaysStep, EquipmentStep, GoalsStep, InjuriesStep } from "~/components/WizardSteps";
import type { Equipment, Goal, InjuryFlag } from "~/lib/plan/schema";
import { savePlan } from "~/lib/store/local";
import { generatePlan } from "~/lib/wizard/generate";

export function meta() {
  return [{ title: "Build your plan — Tennis Workout Builder" }];
}

const STEP_TITLES = ["Goals", "Days per week", "Equipment", "Injuries"] as const;

export default function Build() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [daysPerWeek, setDaysPerWeek] = useState<2 | 3 | 4 | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [injuries, setInjuries] = useState<InjuryFlag[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleGoal(goal: Goal) {
    setGoals((prev) => (prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]));
  }

  function toggleEquipment(item: Equipment) {
    setEquipment((prev) => {
      if (item === "none") {
        return prev.includes("none") ? [] : ["none"];
      }
      const withoutNone = prev.filter((e) => e !== "none");
      return withoutNone.includes(item)
        ? withoutNone.filter((e) => e !== item)
        : [...withoutNone, item];
    });
  }

  function toggleInjury(flag: InjuryFlag) {
    setInjuries((prev) => (prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]));
  }

  const isLastStep = step === STEP_TITLES.length - 1;
  const canAdvance = step === 0 ? goals.length > 0 : step === 1 ? daysPerWeek !== null : true;

  async function finish() {
    if (daysPerWeek === null) return;
    setError(null);
    setSubmitting(true);
    try {
      const finalEquipment: Equipment[] = equipment.length === 0 ? ["none"] : equipment;
      const doc = generatePlan({ goals, daysPerWeek, equipment: finalEquipment, injuries });
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await savePlan({ id, doc, createdAt: now, updatedAt: now });
      navigate(`/plan/${id}/edit`);
    } catch {
      setError("Something went wrong creating your plan. Please try again.");
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (!canAdvance) return;
    if (isLastStep) {
      void finish();
      return;
    }
    setStep((s) => s + 1);
  }

  function handleBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-12">
      <p className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
        Step {step + 1} of {STEP_TITLES.length}
      </p>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
        {STEP_TITLES[step]}
      </h1>

      {step === 0 && <GoalsStep selected={goals} onToggle={toggleGoal} />}
      {step === 1 && <DaysStep selected={daysPerWeek} onSelect={setDaysPerWeek} />}
      {step === 2 && <EquipmentStep selected={equipment} onToggle={toggleEquipment} />}
      {step === 3 && (
        <InjuriesStep
          selected={injuries}
          noneSelected={injuries.length === 0}
          onToggle={toggleInjury}
          onNone={() => setInjuries([])}
        />
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 0}
          className="rounded-full border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:border-gray-400 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-500"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!canAdvance || submitting}
          className="rounded-full bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-700 disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
        >
          {isLastStep ? (submitting ? "Creating…" : "Create my plan") : "Next"}
        </button>
      </div>
    </main>
  );
}
