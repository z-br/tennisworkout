# Tennis Workout — Project Context

Personal tennis training project for GZ. This repo holds an 8-week, 4-day/week home workout plan built around tennis-specific power/agility, plus printable one-pager and warm-up card artifacts derived from it.

## Files

| File | Role |
|------|------|
| `Tennis_Workout_Plan.md` | **Source of truth.** Full plan: daily elbow protocol, pre-match warm-up, 4 workout days with warm-ups/main work/finishers, progression logs, 8-week ramp-up schedule, key principles. |
| `Tennis_Workout_OnePager.html` | Condensed visual summary of the whole plan (one screen, 4 day-columns + daily elbow banner). Self-contained HTML. |
| `Tennis_Workout_OnePager.png` | PNG render of the one-pager (generated — see below). |
| `PreMatch_Warmup_Card.html` / `.svg` / `.png` | Small printable card for the ~5-min on-court pre-match warm-up. |

**Workflow rule:** edit `Tennis_Workout_Plan.md` first, then propagate changes to the one-pager HTML and warm-up card, then re-render the PNG/SVG artifacts. Keep them consistent.

## Rendering the PNG artifacts

`Tennis_Workout_OnePager.png` was generated with Playwright + Chromium from the HTML:
- viewport width 1400 (narrower cuts off the 4th day column), `device_scale_factor: 2`
- clip height to the bottom of the last body element + ~24px padding (a naive full-page screenshot leaves a large blank area below the card)

## Plan design context (why it is the way it is)

- **User's constraints:** chronic tennis elbow (lateral epicondylitis) AND golf elbow (medial); plantar fascia / metatarsal history; recently a bruised rib (noted 6/9 — KB swings were skipped for it).
- **Daily Elbow Protocol** is deliberately separate from the workout days and runs *every* day at full dose (~7 min, Tyler Twist et al., eccentric loading). It does not ramp. Frequency is the active ingredient.
- **Symptom gate** governs all progression: pain ≤3/10 during and no worse next morning → progress; worse → hold or drop load 20%; sharp/radiating pain → stop that movement.
- **8-week ramp:** listed reps/sets in each day are the Week 1–2 starting dose (~70–75%); the ramp table at the bottom of the plan governs when to add. Deload ~20% every 4th week.
- **Equipment:** kettlebells (32 kg mentioned as KB-swing working weight), TRX, dumbbells, resistance bands, FlexBar (yellow for warm-up), pull-up bar, decline board, AxisBoard, medicine ball, agility ladder.
- Elbow-protective details are intentional: relaxed grip cues, moderate (not heavy) hammer curls, forearm prep before KB days, neutral/pronated pull-up grip, gradual swing-pace build-up on court.
- Foot-protective details: single-leg calf raises with towel under toes (windlass loading) 2×/week, AxisBoard balance 2×/week.
- **Pull-up goal:** working toward first unassisted pull-up via 5-level progression + "grease the groove" (2–3 extra light sessions/week).
- Exercise names link to YouTube *search* URLs (pattern: `https://www.youtube.com/results?search_query=...+shorts`) rather than specific videos, so demos don't rot.

## Progression logs

Each day has a 📊 Progression Log table (Target / Latest / Date) meant to be updated after sessions. Only Day 1 has entries so far (dated 6/9). When updating, bump loads per the ramp rules once Latest beats Target.

## Git / repo notes

- Remote: `https://github.com/z-br/tennisworkout.git` (GitHub account **z-br**), branch `main`.
- The repo was initialized locally in the user's `Tennis workout` folder and pushed from their Mac (a cloud-session push wasn't possible — no credentials there).
- Gotcha already hit once: a commit went up authored as the user's old alt account **graffe** because of stale global `git config user.email`; it was fixed via `git commit --amend --reset-author` + force-push. Keep commits authored with the z-br identity.
- `.DS_Store` is gitignored.

## Open threads / possible next steps

- Fill in progression logs for Days 2–4; update Day 1 (rib should be healed by now — entries are from June).
- Advance the ramp phase if the symptom gate has stayed green (as of Aug 2026 the plan's Week 1–2 doses are what's written in each day).
- Possible artifacts: a printable log sheet, or updating the one-pager if the plan changes.
