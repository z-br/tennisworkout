import { z } from "zod";

export const SCHEMA_VERSION = 1;

export const GOALS = ["power", "footwork", "injury-management", "general-fitness"] as const;
export const EQUIPMENT = ["kettlebell", "dumbbell", "trx", "bands", "pullup-bar",
  "medicine-ball", "balance-board", "flexbar", "bench", "none"] as const;
export const INJURY_FLAGS = ["elbow", "shoulder", "knee", "foot"] as const;

const planExercise = z.object({
  exerciseId: z.string().min(1),
  sets: z.number().int().positive().optional(),
  reps: z.string().max(40).optional(),
  tempo: z.string().max(40).optional(),
  loadNote: z.string().max(200).optional(),
  note: z.string().max(200).optional(),
  targetSets: z.number().int().positive().optional(),
  targetReps: z.string().max(40).optional(),
});

const planDay = z.object({
  label: z.string().min(1).max(40),
  focus: z.string().max(120),
  warmup: z.array(planExercise),
  main: z.array(planExercise).min(1),
  finisher: z.array(planExercise).optional(),
});

const planSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  meta: z.object({
    name: z.string().min(1).max(80),
    description: z.string().max(500),
    goals: z.array(z.enum(GOALS)).min(1),
    equipment: z.array(z.enum(EQUIPMENT)),
    daysPerWeek: z.number().int().min(1).max(7),
    remixOf: z.string().optional(),
  }),
  days: z.array(planDay).min(1).max(7),
  dailyProtocols: z.array(z.object({
    name: z.string().min(1).max(80),
    items: z.array(planExercise).min(1),
    cue: z.string().max(200).optional(),
  })),
  ramp: z.object({
    phases: z.array(z.object({
      name: z.string().max(40),
      weeks: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
      pct: z.number().min(10).max(150),
      note: z.string().max(200).optional(),
    })).min(1),
  }).optional(),
  injuryConfig: z.object({
    flags: z.array(z.enum(INJURY_FLAGS)),
    gate: z.object({ proceedMax: z.number().min(0).max(10), dropPct: z.number().min(0).max(100) }),
  }),
  // User-defined exercises referenced by days/protocols via their `custom-…`
  // id. Optional + additive: plans without it stay schemaVersion 1 valid.
  customExercises: z
    .array(
      z.object({
        id: z.string().regex(/^custom-[a-z0-9-]+$/),
        name: z.string().min(1).max(80),
        cues: z.string().max(200).optional(),
      }),
    )
    .max(50)
    .optional(),
});

export type PlanDoc = z.infer<typeof planSchema>;
export type PlanMeta = PlanDoc["meta"];
export type PlanDay = z.infer<typeof planDay>;
export type PlanExercise = z.infer<typeof planExercise>;
export type Protocol = PlanDoc["dailyProtocols"][number];
export type RampPhase = NonNullable<PlanDoc["ramp"]>["phases"][number];
export type InjuryConfig = PlanDoc["injuryConfig"];
export type CustomExercise = NonNullable<PlanDoc["customExercises"]>[number];
export type Goal = (typeof GOALS)[number];
export type Equipment = (typeof EQUIPMENT)[number];
export type InjuryFlag = (typeof INJURY_FLAGS)[number];

export function validatePlan(json: unknown): PlanDoc {
  return planSchema.parse(json);
}

// v1 is the only version; the switch is the extension point for future migrations.
export function migratePlan(json: unknown): PlanDoc {
  const version = (json as { schemaVersion?: number })?.schemaVersion;
  switch (version) {
    case SCHEMA_VERSION:
      return validatePlan(json);
    default:
      throw new Error(`Unsupported plan schemaVersion: ${String(version)}`);
  }
}
