import type { Equipment, Goal, InjuryFlag } from "~/lib/plan/schema";

export type Pattern = "hinge" | "squat" | "push" | "pull" | "rotation" | "carry"
  | "plyo" | "mobility" | "tendon-rehab" | "balance" | "conditioning";

export type Exercise = {
  id: string; name: string; pattern: Pattern; equipment: Equipment[];
  goals: Goal[]; injuryLoad: Partial<Record<InjuryFlag, "high" | "moderate" | "safe" | "rehab">>;
  cues: string; video: string; levels?: string[];
};

const yt = (q: string) => `https://www.youtube.com/results?search_query=${q.replaceAll(" ", "+")}+shorts`;

export const EXERCISES: Exercise[] = [
  // ── Daily Elbow Protocol (5) ──────────────────────────────────────────
  {
    id: "tyler-twist", name: "Tyler Twist (FlexBar)", pattern: "tendon-rehab",
    equipment: ["flexbar"], goals: ["injury-management"],
    injuryLoad: { elbow: "rehab" },
    cues: "Affected arm at bottom palm down; top hand twists, bottom hand slowly untwists. 3x15.",
    video: yt("tyler twist flexbar tennis elbow"),
  },
  {
    id: "reverse-tyler-twist", name: "Reverse Tyler Twist (FlexBar)", pattern: "tendon-rehab",
    equipment: ["flexbar"], goals: ["injury-management"],
    injuryLoad: { elbow: "rehab" },
    cues: "Same as Tyler Twist but affected arm palm up, for golf elbow. 3x15, slow controlled untwist.",
    video: yt("reverse tyler twist flexbar golfers elbow"),
  },
  {
    id: "pronation-supination", name: "Dumbbell Pronation/Supination", pattern: "tendon-rehab",
    equipment: ["dumbbell"], goals: ["injury-management"],
    injuryLoad: { elbow: "rehab" },
    cues: "Hold a light DB by one end, elbow at 90 degrees. Slowly rotate palm up then palm down, full range. Start with a short lever, lengthen before adding weight.",
    video: yt("dumbbell wrist pronation supination exercise"),
  },
  {
    id: "wrist-extensor-stretch", name: "Wrist Extensor Stretch", pattern: "mobility",
    equipment: [], goals: ["injury-management"],
    injuryLoad: { elbow: "rehab" },
    cues: "Arm straight, palm down, gently pull fingers toward you and hold. 3x30 sec.",
    video: yt("wrist extensor stretch tennis elbow"),
  },
  {
    id: "finger-extension-band", name: "Finger Extension (Band)", pattern: "tendon-rehab",
    equipment: ["bands"], goals: ["injury-management"],
    injuryLoad: { elbow: "rehab" },
    cues: "Loop a rubber band around all five fingers, slowly splay open against resistance. 3x20. Balances the gripping load on the forearm flexors.",
    video: yt("finger extension rubber band exercise"),
  },

  // ── Pre-Match Warm-Up (7) ─────────────────────────────────────────────
  {
    id: "ankle-pogos", name: "Achilles Pogos + Easy Skips", pattern: "plyo",
    equipment: [], goals: ["footwork", "general-fitness"],
    injuryLoad: { elbow: "safe", knee: "safe", foot: "safe" },
    cues: "Raise the heart rate and prime the calves and feet with light pogo hops and easy skips. 45 sec.",
    video: yt("achilles pogos ankle bounce warm up"),
  },
  {
    id: "leg-swings-front-back", name: "Leg Swings (Front-to-Back + Lateral)", pattern: "mobility",
    equipment: [], goals: ["footwork", "general-fitness"],
    injuryLoad: { knee: "safe" },
    cues: "Front-to-back swings x10 each leg, then lateral x10 each leg to open the hips before play.",
    video: yt("leg swings dynamic warm up"),
  },
  {
    id: "walking-lunge-reach-rotate", name: "Walking Lunge + Reach/Rotate", pattern: "rotation",
    equipment: [], goals: ["general-fitness", "footwork"],
    injuryLoad: { knee: "safe" },
    cues: "4-5 lunges each side, twist toward the front leg to open the hips and thoracic spine.",
    video: yt("walking lunge reach rotate warm up"),
  },
  {
    id: "arm-circles-wrist-rolls", name: "Arm Circles -> Cross-Body Swings -> Wrist Rolls", pattern: "mobility",
    equipment: [], goals: ["general-fitness"],
    injuryLoad: { shoulder: "safe", elbow: "safe" },
    cues: "Arm circles into cross-body swings into wrist rolls. Gently wakes the shoulder and forearm. 30 sec.",
    video: yt("arm circles wrist rolls warm up"),
  },
  {
    id: "forearm-elbow-prep-light", name: "Forearm/Elbow Prep (Light)", pattern: "mobility",
    equipment: ["flexbar"], goals: ["injury-management"],
    injuryLoad: { elbow: "safe" },
    cues: "Wrist flexion/extension and circles, a few light yellow-band FlexBar twists for blood flow (not the slow daily eccentrics), a couple grip squeeze-and-spreads. 20-30 sec.",
    video: yt("flexbar light wrist warm up"),
  },
  {
    id: "lateral-shuffle-split-accel", name: "Lateral Shuffles + Split Steps + Accelerations", pattern: "conditioning",
    equipment: [], goals: ["footwork", "power"],
    injuryLoad: { knee: "safe", foot: "safe" },
    cues: "Lateral shuffles into 2 split steps into 2 short accelerations. Move in the planes you'll play in. 45 sec.",
    video: yt("lateral shuffle split step acceleration drill"),
  },
  {
    id: "shadow-swings", name: "Shadow Swings", pattern: "rotation",
    equipment: [], goals: ["general-fitness", "power"],
    injuryLoad: { shoulder: "safe", elbow: "safe" },
    cues: "5 forehands, 5 backhands, 5 serve motions, building slow to full speed. Grooves the pattern and primes the serve shoulder.",
    video: yt("tennis shadow swing forehand backhand serve"),
  },

  // ── Day 1 Warm-Up ─────────────────────────────────────────────────────
  {
    id: "lateral-shuffle-drill", name: "Lateral Shuffles", pattern: "conditioning",
    equipment: [], goals: ["footwork"],
    injuryLoad: { knee: "safe", foot: "safe" },
    cues: "Two targets ~10 ft apart, stay low, push off the outside foot, don't cross feet. 2 min.",
    video: yt("lateral shuffle drill tennis"),
  },
  {
    id: "childs-pose-rock", name: "Child's Pose Rocks", pattern: "mobility",
    equipment: [], goals: ["general-fitness"],
    injuryLoad: {},
    cues: "Rock back into child's pose and forward to open the thoracic spine and hip flexors. 10 reps.",
    video: yt("childs pose rock back mobility"),
  },
  {
    id: "hip-90-90-popup", name: "90/90 Pop-Ups", pattern: "mobility",
    equipment: [], goals: ["general-fitness", "footwork"],
    injuryLoad: { knee: "safe" },
    cues: "Sit in 90/90, lift the front knee and switch sides. Targets hip internal rotation. 10 reps.",
    video: yt("90 90 hip popups switch mobility"),
  },
  {
    id: "hip-90-90-ir-hold", name: "90/90 IR Bias Hold", pattern: "mobility",
    equipment: [], goals: ["general-fitness"],
    injuryLoad: { knee: "safe" },
    cues: "Lean the torso toward the front shin, let the rear hip sink, and hold. 45 sec each side.",
    video: yt("90 90 hip internal rotation stretch"),
  },
  {
    id: "lateral-leg-swings", name: "Lateral Leg Swings", pattern: "mobility",
    equipment: [], goals: ["footwork", "general-fitness"],
    injuryLoad: { knee: "safe" },
    cues: "Lateral leg swings, 10 each leg, to open the hips before lateral work.",
    video: yt("lateral leg swings warm up"),
  },
  {
    id: "lateral-band-walk", name: "Lateral Band Walks", pattern: "mobility",
    equipment: ["bands"], goals: ["footwork", "general-fitness"],
    injuryLoad: { knee: "safe" },
    cues: "2x15 each direction. Glute activation that primes lateral push-off.",
    video: yt("lateral band walk glute exercise"),
  },
  {
    id: "split-step-practice", name: "Split Step Practice", pattern: "plyo",
    equipment: [], goals: ["footwork"],
    injuryLoad: { knee: "safe", foot: "safe" },
    cues: "Jump and land in an athletic stance, absorbing through the hips. 20 reps.",
    video: yt("tennis split step drill"),
  },

  // ── Day 1 Main + Finisher ────────────────────────────────────────────
  {
    id: "kb-swing", name: "Kettlebell Swing", pattern: "hinge",
    equipment: ["kettlebell"], goals: ["power", "general-fitness"],
    injuryLoad: { elbow: "moderate" },
    cues: "Hip hinge power. Drive hips hard, brace at the top, relaxed grip — just enough tension to control the bell.",
    video: yt("kettlebell swing proper form"),
  },
  {
    id: "bulgarian-split-squat", name: "Bulgarian Split Squat", pattern: "squat",
    equipment: ["bench"], goals: ["power", "general-fitness"],
    injuryLoad: { knee: "moderate", elbow: "safe" },
    cues: "Rear foot on TRX or bench. Start bodyweight — add dumbbells or a KB once you own the balance and depth. Builds single-leg strength for lunge mechanics.",
    video: yt("bulgarian split squat proper form"),
  },
  {
    id: "lateral-bound", name: "Lateral Bounds (Skater Jumps)", pattern: "plyo",
    equipment: [], goals: ["power", "footwork"],
    injuryLoad: { knee: "moderate", foot: "moderate", elbow: "safe" },
    cues: "Push off one foot sideways, land on the opposite foot only. Pause 1 sec to absorb and balance, then push back. Full rest between reps — quality, not fatigue.",
    video: yt("skater jumps lateral bound form"),
  },
  {
    id: "trx-squat-jump", name: "TRX Squat + Explosive Jump", pattern: "squat",
    equipment: ["trx"], goals: ["power"],
    injuryLoad: { knee: "moderate" },
    cues: "Handles at sides, body at ~45 degrees. 3 slow reps (3 sec down, pause at bottom), then explode into a jump on the 4th. Land softly, absorb through the hips, reset.",
    video: yt("trx squat jump exercise"),
  },
  {
    id: "calf-raise-single-leg", name: "Single-Leg Calf Raise (Plantar Loading)", pattern: "tendon-rehab",
    equipment: ["dumbbell"], goals: ["injury-management", "general-fitness"],
    injuryLoad: { foot: "rehab" },
    cues: "Single-leg heel raise on a step holding weight, rolled towel under the toes so the big toe is bent up. Slow tempo: 3 sec up, 2 sec hold, 3 sec down. Loads the plantar fascia through the windlass mechanism.",
    video: yt("heel raise towel under toes plantar fasciitis"),
  },
  {
    id: "agility-ladder", name: "Agility Ladder", pattern: "conditioning",
    equipment: [], goals: ["footwork"],
    injuryLoad: { knee: "safe", foot: "safe" },
    cues: "Lateral icky shuffle, in-in-out-out, or two feet each box forward. Rest 30 sec between rounds.",
    video: yt("agility ladder drills tennis footwork"),
  },

  // ── Day 2 Warm-Up ────────────────────────────────────────────────────
  {
    id: "band-pull-apart", name: "Band Pull-Aparts", pattern: "pull",
    equipment: ["bands"], goals: ["general-fitness"],
    injuryLoad: { shoulder: "safe" },
    cues: "Hold band at shoulder width, pull apart squeezing the shoulder blades together. 2x15.",
    video: yt("band pull apart exercise form"),
  },
  {
    id: "shoulder-cars", name: "Shoulder CARs", pattern: "mobility",
    equipment: [], goals: ["general-fitness"],
    injuryLoad: { shoulder: "safe" },
    cues: "Controlled articular rotations — slow, full-range circles at end range to lubricate the shoulder joint. 5 each arm.",
    video: yt("shoulder CARs controlled articular rotations"),
  },
  {
    id: "arm-swings", name: "Arm Swings", pattern: "mobility",
    equipment: [], goals: ["general-fitness"],
    injuryLoad: { shoulder: "safe" },
    cues: "10 forward swings, 10 cross-body swings each arm to open the chest and shoulders.",
    video: yt("arm swings shoulder warm up"),
  },
  {
    id: "wrist-circles", name: "Wrist Circles", pattern: "mobility",
    equipment: [], goals: ["general-fitness"],
    injuryLoad: { elbow: "safe" },
    cues: "Wrist circles both directions, 30 sec, to prep the joint for loaded work.",
    video: yt("wrist circles warm up"),
  },
  {
    id: "band-external-rotation", name: "Band External Rotation", pattern: "pull",
    equipment: ["bands"], goals: ["injury-management", "general-fitness"],
    injuryLoad: { shoulder: "safe" },
    cues: "Elbow pinned to your side, rotate the forearm outward against band tension. 1-2x12 each arm. Rotator cuff primer.",
    video: yt("band external rotation rotator cuff exercise"),
  },

  // ── Day 2 Main ───────────────────────────────────────────────────────
  {
    id: "pullup", name: "Pull-Up Progression (Band-Assisted)", pattern: "pull",
    equipment: ["pullup-bar", "bands"], goals: ["power", "general-fitness"],
    injuryLoad: { elbow: "moderate" },
    cues: "Vertical pull building toward an unassisted pull-up. Use a neutral or pronated grip and stay inside the symptom gate — pull-ups load the elbow tendons, so back off volume if they flare.",
    video: yt("band assisted pull up progression"),
    levels: ["Dead hang + scap pulls", "Thick-band assisted", "Light-band assisted", "Eccentric-only", "Full pull-up"],
  },
  {
    id: "db-row", name: "Single-Arm Dumbbell Row", pattern: "pull",
    equipment: ["dumbbell"], goals: ["power", "general-fitness"],
    injuryLoad: { elbow: "moderate" },
    cues: "Knee on bench or TRX assist. Moderate-heavy load. Pulling strength transfers to topspin groundstrokes.",
    video: yt("single arm dumbbell row form"),
  },
  {
    id: "db-shoulder-press", name: "Dumbbell Shoulder Press", pattern: "push",
    equipment: ["dumbbell"], goals: ["power", "general-fitness"],
    injuryLoad: { shoulder: "moderate" },
    cues: "Seated or standing, moderate weight. Overhead stability for the serve and overhead smash.",
    video: yt("dumbbell shoulder press proper form"),
  },
  {
    id: "med-ball-rotational-throw", name: "Medicine Ball Rotational Wall Throw", pattern: "rotation",
    equipment: ["medicine-ball"], goals: ["power"],
    injuryLoad: { shoulder: "moderate" },
    cues: "Stand sideways 3-4 ft from a solid wall. Load the hip and shoulder, throw through rotation, catch and repeat. Drive from the ground up — legs, hips, core, arm.",
    video: yt("medicine ball rotational wall throw tennis"),
  },
  {
    id: "hammer-curl", name: "Hammer Curl (Moderate)", pattern: "pull",
    equipment: ["dumbbell"], goals: ["general-fitness"],
    injuryLoad: { elbow: "moderate" },
    cues: "Neutral grip (palms facing in), slow 3-sec lower, full extension at the bottom. Targets the brachialis. Keep load moderate, not heavy — heavy loaded elbow flexion can provoke healing tendons.",
    video: yt("hammer curl proper form"),
  },
  {
    id: "balance-board-single-leg", name: "AxisBoard Single-Leg Balance", pattern: "balance",
    equipment: ["balance-board"], goals: ["injury-management", "general-fitness"],
    injuryLoad: { foot: "safe", knee: "safe" },
    cues: "Barefoot or socks, soft knee — find a quiet foot and minimize wobble. Progress eyes open to eyes closed to a single-leg RDL reach.",
    video: yt("single leg balance board exercise"),
  },

  // ── Day 3 Warm-Up ────────────────────────────────────────────────────
  {
    id: "fast-feet-drill", name: "Fast Feet in Place", pattern: "conditioning",
    equipment: [], goals: ["footwork"],
    injuryLoad: { knee: "safe", foot: "safe" },
    cues: "Alternate feet as fast as possible, staying on the balls of your feet. 2 min.",
    video: yt("fast feet drill in place"),
  },
  {
    id: "worlds-greatest-stretch", name: "World's Greatest Stretch", pattern: "mobility",
    equipment: [], goals: ["general-fitness"],
    injuryLoad: {},
    cues: "Lunge, rotate open toward the front leg, then reach. 5 each side. Full-body mobility primer.",
    video: yt("worlds greatest stretch"),
  },
  {
    id: "arm-circles-torso-rotation", name: "Arm Circles + Torso Rotations", pattern: "mobility",
    equipment: [], goals: ["general-fitness"],
    injuryLoad: { shoulder: "safe" },
    cues: "Arm circles combined with torso rotations to open the shoulders and spine. 60 sec.",
    video: yt("arm circles torso rotation warm up"),
  },

  // ── Day 3 Main + Finisher ────────────────────────────────────────────
  {
    id: "kb-clean-press", name: "KB Clean + Press", pattern: "hinge",
    equipment: ["kettlebell"], goals: ["power"],
    injuryLoad: { elbow: "moderate", shoulder: "moderate" },
    cues: "Link the hip drive from the clean directly into the overhead press. Power chain integration.",
    video: yt("kettlebell clean and press form"),
  },
  {
    id: "broad-jump", name: "Broad Jump", pattern: "plyo",
    equipment: [], goals: ["power", "footwork"],
    injuryLoad: { knee: "moderate", foot: "moderate", elbow: "safe" },
    cues: "Jump forward as far as possible. Full hip extension at takeoff, land soft on both feet, absorb through the hips. Reset completely between reps — train quality, not fatigue.",
    video: yt("broad jump standing long jump form"),
  },
  {
    id: "med-ball-slam", name: "Medicine Ball Overhead Slam", pattern: "plyo",
    equipment: ["medicine-ball"], goals: ["power"],
    injuryLoad: { shoulder: "moderate" },
    cues: "Reach tall, drive the ball straight down with full body. Builds power and releases shoulder tension.",
    video: yt("medicine ball overhead slam form"),
  },
  {
    id: "pushup", name: "Push-Up (Progression)", pattern: "push",
    equipment: [], goals: ["power", "general-fitness"],
    injuryLoad: { shoulder: "safe", elbow: "safe" },
    cues: "Move up a level when 3x8 feels solid with good form. Rigid plank throughout, full range of motion.",
    video: yt("push up proper form progression"),
    levels: ["Incline", "Knee", "Full", "Feet-elevated", "Explosive", "TRX Atomic"],
  },
  {
    id: "shuffle-split-step-drill", name: "Lateral Shuffle + Split Step Sequence", pattern: "conditioning",
    equipment: [], goals: ["footwork"],
    injuryLoad: { knee: "safe", foot: "safe" },
    cues: "Two targets 10-15 ft apart. Shuffle laterally, hit split step at each end, shuffle back. 20 sec on, 10 sec rest. Pure tennis movement.",
    video: yt("tennis lateral shuffle split step drill"),
  },
  {
    id: "power-circuit-finisher", name: "Power Circuit Finisher", pattern: "conditioning",
    equipment: ["kettlebell"], goals: ["power", "general-fitness"],
    injuryLoad: { elbow: "moderate", knee: "moderate", foot: "moderate" },
    cues: "3 rounds: 10 KB swings, 5 broad jumps, 10 split steps. No rest within rounds, 30 sec between rounds.",
    video: yt("kettlebell swing broad jump conditioning circuit"),
  },

  // ── Day 4 Warm-Up ────────────────────────────────────────────────────
  {
    id: "foam-rolling", name: "Foam Roll / Lacrosse Ball", pattern: "mobility",
    equipment: [], goals: ["general-fitness"],
    injuryLoad: {},
    cues: "Foam roll or lacrosse ball on calves, IT band, and thoracic spine. 2 min total.",
    video: yt("foam rolling calves it band thoracic spine"),
  },
  {
    id: "cat-cow-stretch", name: "Cat-Cow", pattern: "mobility",
    equipment: [], goals: ["general-fitness"],
    injuryLoad: {},
    cues: "Cat-cow flow through the spine, 10 reps, to open the back before core work.",
    video: yt("cat cow stretch"),
  },
  {
    id: "thread-the-needle", name: "Thread the Needle", pattern: "rotation",
    equipment: [], goals: ["general-fitness"],
    injuryLoad: { shoulder: "safe" },
    cues: "Thread one arm under the body and rotate through the upper back, 10 each side.",
    video: yt("thread the needle stretch"),
  },

  // ── Day 4 Main ───────────────────────────────────────────────────────
  {
    id: "trx-plank", name: "TRX Plank Variations", pattern: "balance",
    equipment: ["trx"], goals: ["general-fitness"],
    injuryLoad: {},
    cues: "Hands in TRX handles (or feet). Progress standard to hip drop to pike. Unstable surface recruits far more core.",
    video: yt("trx plank variations"),
  },
  {
    id: "suitcase-carry", name: "Suitcase Carry", pattern: "carry",
    equipment: ["dumbbell"], goals: ["general-fitness"],
    injuryLoad: { elbow: "moderate" },
    cues: "Hold one heavy DB or KB at your side, walk tall and braced, resisting any lean toward the weight. Relaxed grip, moderate load, stay under the symptom gate.",
    video: yt("suitcase carry exercise form"),
  },
  {
    id: "band-chop", name: "Band Chop (High to Low)", pattern: "rotation",
    equipment: ["bands"], goals: ["general-fitness", "power"],
    injuryLoad: {},
    cues: "Anchor band high. Rotate and pull diagonally across the body, low and opposite. Mimics the forehand finish. Core rotation under load.",
    video: yt("band chop high to low core exercise"),
  },
  {
    id: "pallof-press", name: "Pallof Press (Kneeling)", pattern: "rotation",
    equipment: ["bands"], goals: ["general-fitness"],
    injuryLoad: {},
    cues: "Kneeling increases demand on hip stability. Press out, hold 2 sec, return slowly.",
    video: yt("kneeling pallof press form"),
  },
  {
    id: "kb-windmill", name: "KB Windmill", pattern: "rotation",
    equipment: ["kettlebell"], goals: ["general-fitness"],
    injuryLoad: { shoulder: "moderate" },
    cues: "Light KB pressed overhead. Hip hinge to the side. Demands shoulder stability, hip mobility, and lateral core control simultaneously.",
    video: yt("kettlebell windmill proper form"),
  },
  {
    id: "hip-90-90-stretch", name: "90/90 Stretch", pattern: "mobility",
    equipment: [], goals: ["general-fitness"],
    injuryLoad: {},
    cues: "Sit in the 90/90 position and hold, 60 sec each side, to open hip rotation.",
    video: yt("90 90 hip stretch"),
  },
  {
    id: "pigeon-pose-stretch", name: "Pigeon Pose", pattern: "mobility",
    equipment: [], goals: ["general-fitness"],
    injuryLoad: {},
    cues: "Pigeon pose hold, 60 sec each side, a deep hip and glute stretch.",
    video: yt("pigeon pose hip stretch"),
  },
  {
    id: "adductor-rock-back", name: "Adductor Rock-Back", pattern: "mobility",
    equipment: [], goals: ["general-fitness"],
    injuryLoad: {},
    cues: "Wide stance, rock back side to side over each hip to stretch the adductors. 10 reps.",
    video: yt("adductor rock back stretch"),
  },

  // ── Bodyweight/band pattern alternates (no-equipment coverage) ────────
  {
    id: "good-morning-bodyweight", name: "Bodyweight Good Morning", pattern: "hinge",
    equipment: [], goals: ["general-fitness"],
    injuryLoad: { elbow: "safe" },
    cues: "Soft knees, push the hips back, flat back, stand tall by squeezing the glutes. No-equipment hinge option for the KB swing pattern.",
    video: yt("bodyweight good morning hip hinge exercise"),
  },
  {
    id: "split-squat", name: "Bodyweight Split Squat", pattern: "squat",
    equipment: [], goals: ["general-fitness"],
    injuryLoad: { knee: "safe", elbow: "safe" },
    cues: "Rear foot flat or lightly elevated on a step. Drills the same single-leg pattern as the Bulgarian split squat, no equipment needed.",
    video: yt("bodyweight split squat form"),
  },
  {
    id: "prone-ytw-raise", name: "Prone Y-T-W Raise", pattern: "pull",
    equipment: [], goals: ["general-fitness"],
    injuryLoad: { shoulder: "safe" },
    cues: "Lying face down, lift the arms into Y, T, and W positions to strengthen the upper back and rear delts. No-equipment pull option.",
    video: yt("prone Y T W raises exercise"),
  },
];

export function getExercise(id: string) {
  return EXERCISES.find((e) => e.id === id);
}

export function substitutions(exerciseId: string, owned: Equipment[]): Exercise[] {
  const base = getExercise(exerciseId);
  if (!base) return [];
  return EXERCISES.filter((e) =>
    e.id !== exerciseId &&
    e.pattern === base.pattern &&
    e.equipment.every((eq) => eq === "none" || owned.includes(eq)),
  );
}
