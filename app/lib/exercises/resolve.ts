import { getExercise } from "./library";
import type { PlanDoc } from "~/lib/plan/schema";

export type ResolvedExercise = {
  name: string;
  cues?: string;
  video?: string;
  /** True when the exercise is a plan-local custom entry (no library metadata,
   *  so no injury flags, patterns, or ladder levels apply). */
  custom: boolean;
};

const yt = (q: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

/** Resolve an exercise id against the library first, then the plan's own
 *  custom entries. Custom entries get a derived YouTube-search video link so
 *  they behave like library entries in every view. */
export function resolveExercise(doc: PlanDoc, exerciseId: string): ResolvedExercise | undefined {
  const lib = getExercise(exerciseId);
  if (lib) return { name: lib.name, cues: lib.cues, video: lib.video, custom: false };
  const custom = doc.customExercises?.find((c) => c.id === exerciseId);
  if (custom) {
    return { name: custom.name, cues: custom.cues, video: yt(custom.name), custom: true };
  }
  return undefined;
}

export function exerciseDisplayName(doc: PlanDoc, exerciseId: string): string {
  return resolveExercise(doc, exerciseId)?.name ?? exerciseId;
}

export function newCustomExerciseId(): string {
  return `custom-${crypto.randomUUID().slice(0, 8)}`;
}
