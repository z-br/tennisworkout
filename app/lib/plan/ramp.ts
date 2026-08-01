import { RampPhase, PlanExercise, InjuryConfig } from "./schema";

/**
 * Find the phase containing the given week.
 * - Returns the phase where weeks[0] <= week <= weeks[1]
 * - If week is past all phases, returns the last phase
 * - If week is in a gap, returns the nearest earlier phase
 * - If week is before the first phase, returns the first phase
 */
export function currentPhase(phases: RampPhase[], week: number): RampPhase {
  // Find the phase that contains this week
  for (const phase of phases) {
    if (week >= phase.weeks[0] && week <= phase.weeks[1]) {
      return phase;
    }
  }

  // If week is before the first phase, return first phase
  if (week < phases[0].weeks[0]) {
    return phases[0];
  }

  // If week is past all phases or in a gap, find the nearest earlier phase
  let nearestPhase = phases[0];
  for (const phase of phases) {
    if (week >= phase.weeks[0]) {
      nearestPhase = phase;
    }
  }
  return nearestPhase;
}

/**
 * Scale exercise dose based on ramp percentage.
 * - At pct >= 100: use targetReps ?? reps for reps; sets = targetSets
 * - Below 100: use reps ?? targetReps for reps
 * - Sets interpolation: sets + round((targetSets - sets) * (pct - 70) / 30), clamped to [sets, targetSets]
 * - If no targetSets, keep sets as-is
 * - Sets defaults to targetSets if absent (for interpolation)
 */
export function scaledDose(
  ex: PlanExercise,
  pct: number
): { sets?: number; reps?: string } {
  const result: { sets?: number; reps?: string } = {};

  // Handle reps: at pct>=100 use targetReps ?? reps; else use reps ?? targetReps
  if (pct >= 100) {
    result.reps = ex.targetReps ?? ex.reps;
  } else {
    result.reps = ex.reps ?? ex.targetReps;
  }

  // Handle sets
  if (ex.targetSets !== undefined) {
    const startSets = ex.sets ?? ex.targetSets;

    if (pct >= 100) {
      result.sets = ex.targetSets;
    } else {
      // Interpolation formula: startSets + round((targetSets - startSets) * (pct - 70) / 30)
      // Clamped to [startSets, targetSets]
      const interpolated =
        startSets +
        Math.round((ex.targetSets - startSets) * (pct - 70) / 30);
      result.sets = Math.max(startSets, Math.min(ex.targetSets, interpolated));
    }
  } else if (ex.sets !== undefined) {
    result.sets = ex.sets;
  }

  return result;
}

/**
 * Determine gate decision based on pain and injury config.
 * Precedence:
 * - pain >= 8 → "stop"
 * - pain > proceedMax || worseNextMorning → "hold-or-drop"
 * - else → "proceed"
 */
export function gateDecision(
  painDuring: number,
  worseNextMorning: boolean,
  gate: InjuryConfig["gate"]
): "proceed" | "hold-or-drop" | "stop" {
  // Highest priority: severe pain
  if (painDuring >= 8) {
    return "stop";
  }

  // Second priority: moderate pain or worse next morning
  if (painDuring > gate.proceedMax || worseNextMorning) {
    return "hold-or-drop";
  }

  // Default: proceed
  return "proceed";
}
