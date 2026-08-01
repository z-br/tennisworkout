import { SCHEMA_VERSION, type PlanDoc } from "../plan/schema.ts";

// Transcribed from Tennis_Workout_Plan.md (repo root, left untouched).
// Main-work sets/reps below are the Week 1-2 STARTING dose; targetSets/
// targetReps are the Week 7-8 (Peak phase) target from the same lines.
export const FOUNDING_PLAN: PlanDoc = {
  schemaVersion: SCHEMA_VERSION,
  meta: {
    name: "Elbow-Safe Tennis Power Plan",
    description:
      "A 4-day tennis strength plan for hip power, rotational power, explosive agility, and core stability, " +
      "paired with a mandatory daily elbow eccentric protocol (every day, including rest days). Loads start " +
      "reduced and ramp back up over 8 weeks, and a daily symptom gate governs every progression along the way.",
    goals: ["power", "injury-management"],
    equipment: ["kettlebell", "dumbbell", "trx", "bands", "pullup-bar", "medicine-ball", "balance-board", "flexbar", "bench"],
    daysPerWeek: 4,
  },
  days: [
    // ── Day 1: Lower Body Power + Lateral Quickness ───────────────────
    {
      label: "Day 1",
      focus: "Lower Body Power + Lateral Quickness",
      warmup: [
        { exerciseId: "pronation-supination", reps: "1 easy set", note: "Forearm prep (KB day) — primes forearms before heavy gripping." },
        { exerciseId: "wrist-extensor-stretch", reps: "1 easy set", note: "Forearm prep (KB day) — primes forearms before heavy gripping." },
        { exerciseId: "lateral-shuffle-drill", reps: "2 min" },
        { exerciseId: "childs-pose-rock", reps: "10" },
        { exerciseId: "hip-90-90-popup", reps: "10" },
        { exerciseId: "hip-90-90-ir-hold", reps: "45 sec each side" },
        { exerciseId: "lateral-leg-swings", reps: "10 each leg" },
        { exerciseId: "lateral-band-walk", reps: "2x15 each direction" },
        { exerciseId: "split-step-practice", reps: "20" },
      ],
      main: [
        {
          exerciseId: "kb-swing", sets: 3, reps: "12", targetSets: 4, targetReps: "15",
          note: "Hip hinge power. Drive hips hard, brace at the top. Relaxed grip — just enough tension to control the bell.",
        },
        {
          exerciseId: "bulgarian-split-squat", sets: 2, reps: "8 each leg", targetSets: 3, targetReps: "8 each leg, heavier",
          note: "Rear foot on TRX or bench. Start bodyweight; add DB/KB once you own the balance and depth.",
        },
        {
          exerciseId: "lateral-bound", sets: 2, reps: "4 each direction", targetSets: 3, targetReps: "6 each direction",
          note: "Pause 1 sec to absorb and balance, then push back. Full rest between reps — quality, not fatigue.",
        },
        {
          exerciseId: "trx-squat-jump", sets: 3, reps: "3 slow + 1 jump", targetSets: 4, targetReps: "3 slow + 1 jump",
          note: "3 sec down, pause at bottom, drive up; explode into a jump on the 4th rep. Land softly, reset.",
        },
        {
          exerciseId: "calf-raise-single-leg", sets: 3, reps: "10 each foot",
          loadNote: "~30 lb, rolled towel under toes. Slow 3-2-3 tempo. Foot symptom gate applies.",
        },
      ],
      finisher: [
        {
          exerciseId: "agility-ladder", sets: 3, targetSets: 5,
          note: "Your choice: icky shuffle, in-in-out-out, two feet each box. Rest 30 sec between rounds.",
        },
      ],
    },

    // ── Day 2: Upper Body Strength + Rotational Power ─────────────────
    {
      label: "Day 2",
      focus: "Upper Body Strength + Rotational Power",
      warmup: [
        { exerciseId: "childs-pose-rock", reps: "10" },
        { exerciseId: "hip-90-90-popup", reps: "10" },
        { exerciseId: "hip-90-90-ir-hold", reps: "45 sec each side" },
        { exerciseId: "band-pull-apart", reps: "2x15" },
        { exerciseId: "shoulder-cars", reps: "5 each arm" },
        { exerciseId: "arm-swings", reps: "10 fwd + 10 cross" },
        { exerciseId: "wrist-circles", reps: "30 sec" },
        { exerciseId: "band-external-rotation", reps: "1-2x12 each arm" },
      ],
      main: [
        {
          exerciseId: "pullup", sets: 2, reps: "5", targetSets: 3, targetReps: "6-8",
          note: "Neutral/pronated grip, stay inside the symptom gate. Add extra easy sets across the week (grease the groove).",
        },
        {
          exerciseId: "db-row", sets: 2, reps: "10 each arm", targetSets: 3, targetReps: "10 each arm",
          note: "Knee on bench or TRX assist. Moderate-heavy. Pulling strength transfers to topspin groundstrokes.",
        },
        {
          exerciseId: "db-shoulder-press", sets: 2, reps: "10", targetSets: 3, targetReps: "10",
          note: "Seated or standing, moderate weight. Overhead stability for the serve and overhead smash.",
        },
        {
          exerciseId: "med-ball-rotational-throw", sets: 3, reps: "6 each side", targetSets: 4, targetReps: "8 each side",
          note: "Your power exercise. Drive from the ground up — legs, hips, core, arm.",
        },
        {
          exerciseId: "hammer-curl", sets: 2, reps: "8", targetSets: 3, targetReps: "8",
          loadNote: "Keep load moderate, not heavy — heavy loaded elbow flexion can provoke healing tendons.",
        },
        {
          exerciseId: "balance-board-single-leg", sets: 2, reps: "20-30 sec each foot", targetReps: "45 sec each foot",
          note: "Quiet foot, soft knee. Progress eyes open -> eyes closed -> single-leg RDL reach.",
        },
      ],
    },

    // ── Day 3: Full Body Explosive + Agility ──────────────────────────
    {
      label: "Day 3",
      focus: "Full Body Explosive + Agility",
      warmup: [
        { exerciseId: "pronation-supination", reps: "1 easy set", note: "Forearm prep (KB day) — primes forearms before heavy gripping." },
        { exerciseId: "wrist-extensor-stretch", reps: "1 easy set", note: "Forearm prep (KB day) — primes forearms before heavy gripping." },
        { exerciseId: "fast-feet-drill", reps: "2 min" },
        { exerciseId: "childs-pose-rock", reps: "10" },
        { exerciseId: "hip-90-90-popup", reps: "10" },
        { exerciseId: "hip-90-90-ir-hold", reps: "45 sec each side" },
        { exerciseId: "worlds-greatest-stretch", reps: "5 each side" },
        { exerciseId: "arm-circles-torso-rotation", reps: "60 sec" },
      ],
      main: [
        {
          exerciseId: "kb-clean-press", sets: 2, reps: "5 each side", targetSets: 3, targetReps: "5 each side",
          note: "Link the hip drive from the clean directly into the overhead press.",
        },
        {
          exerciseId: "broad-jump", sets: 2, reps: "4", targetSets: 4, targetReps: "5",
          note: "Full hip extension at takeoff, land soft, reset completely between reps — quality, not fatigue.",
        },
        {
          exerciseId: "med-ball-slam", sets: 2, reps: "6", targetSets: 3, targetReps: "8",
          note: "Reach tall, drive the ball straight down with full body.",
        },
        {
          exerciseId: "pushup", sets: 2, reps: "8", targetSets: 3, targetReps: "8",
          note: "Move up a level when 3x8 feels solid with good form.",
        },
        {
          exerciseId: "shuffle-split-step-drill", sets: 3, reps: "20 sec on, 10 sec rest",
          note: "Weeks 1-2 conditioning piece — once the finisher comes in (Week 3+), drop this; same stimulus.",
        },
        {
          exerciseId: "calf-raise-single-leg", sets: 3, reps: "10 each foot",
          loadNote: "~30 lb, rolled towel under toes. Same as Day 1 — watch the foot symptom gate.",
        },
      ],
      finisher: [
        {
          exerciseId: "power-circuit-finisher", sets: 1, targetSets: 3, reps: "10 swings+5 jumps+10 splits",
          note: "Introduced Week 3 (skip Weeks 1-2, run Lateral Shuffle + Split Step instead). No rest within rounds, 30 sec between rounds.",
        },
      ],
    },

    // ── Day 4: Core, Stability + Hip Mobility ─────────────────────────
    {
      label: "Day 4",
      focus: "Core, Stability + Hip Mobility",
      warmup: [
        { exerciseId: "foam-rolling", reps: "2 min" },
        { exerciseId: "cat-cow-stretch", reps: "10" },
        { exerciseId: "thread-the-needle", reps: "10 each side" },
      ],
      main: [
        {
          exerciseId: "trx-plank", sets: 2, reps: "30 sec", targetSets: 3, targetReps: "30 sec",
          note: "Progress: standard -> hip drop -> pike. Unstable surface recruits far more core.",
        },
        {
          exerciseId: "suitcase-carry", sets: 3, reps: "30-40 sec each side",
          loadNote: "Relaxed grip, moderate load — it's a gripping exercise, stay under the symptom gate.",
        },
        {
          exerciseId: "band-chop", sets: 3, reps: "12 each side",
          note: "Anchor band high, rotate and pull diagonally across body. Mimics the forehand finish.",
        },
        {
          exerciseId: "pallof-press", sets: 3, reps: "12 each side",
          note: "Kneeling increases demand on hip stability. Press, hold 2 sec, return slowly.",
        },
        {
          exerciseId: "kb-windmill", sets: 3, reps: "5 each side",
          note: "Light KB pressed overhead. Demands shoulder stability, hip mobility, and lateral core control.",
        },
        {
          exerciseId: "balance-board-single-leg", sets: 2, reps: "20-30 sec each foot", targetReps: "45 sec each foot",
          note: "Quiet foot, soft knee. Progress eyes open -> eyes closed -> single-leg RDL reach.",
        },
        { exerciseId: "hip-90-90-stretch", sets: 2, reps: "60 sec each side", note: "Hip Mobility Circuit — 2 rounds." },
        { exerciseId: "pigeon-pose-stretch", sets: 2, reps: "60 sec each side", note: "Hip Mobility Circuit — 2 rounds." },
        { exerciseId: "adductor-rock-back", sets: 2, reps: "10", note: "Hip Mobility Circuit — 2 rounds." },
      ],
    },
  ],
  dailyProtocols: [
    {
      name: "Daily Elbow Protocol",
      cue: "Every day incl. rest days — tie to a fixed cue like evening TV. ~7 min.",
      items: [
        { exerciseId: "tyler-twist", sets: 3, reps: "15" },
        { exerciseId: "reverse-tyler-twist", sets: 3, reps: "15" },
        { exerciseId: "pronation-supination", sets: 2, reps: "15 each direction" },
        { exerciseId: "wrist-extensor-stretch", sets: 3, reps: "30 sec" },
        { exerciseId: "finger-extension-band", sets: 3, reps: "20" },
      ],
    },
    {
      name: "Pre-Match Warm-Up",
      cue: "~5 min on court before class or match — build swing pace gradually.",
      items: [
        { exerciseId: "ankle-pogos", reps: "45 sec" },
        { exerciseId: "leg-swings-front-back", reps: "45 sec" },
        { exerciseId: "walking-lunge-reach-rotate", reps: "45 sec" },
        { exerciseId: "arm-circles-wrist-rolls", reps: "30 sec" },
        { exerciseId: "forearm-elbow-prep-light", reps: "20-30 sec" },
        { exerciseId: "lateral-shuffle-split-accel", reps: "45 sec" },
        { exerciseId: "shadow-swings", reps: "60 sec" },
      ],
    },
  ],
  ramp: {
    phases: [
      { name: "Base", weeks: [1, 2], pct: 70, note: "Run starting doses; lock in the daily elbow habit; Day 3 finisher off." },
      { name: "Build", weeks: [3, 4], pct: 80, note: "Add 1 set to main lifts and 1 rep to plyos; introduce Day 3 finisher at 1 round." },
      { name: "Develop", weeks: [5, 6], pct: 90, note: "Reach target sets/reps on most lifts; Day 3 finisher to 2 rounds." },
      { name: "Peak", weeks: [7, 8], pct: 100, note: "Full target loads; Day 3 finisher to 3 rounds." },
    ],
  },
  injuryConfig: {
    flags: ["elbow", "foot"],
    gate: { proceedMax: 3, dropPct: 20 },
  },
};
