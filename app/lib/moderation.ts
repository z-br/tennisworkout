import type { PlanDoc } from "./plan/schema";

// Common profanities list (~25 words)
const PROFANITIES = [
  "damn",
  "hell",
  "piss",
  "crap",
  "shit",
  "ass",
  "bastard",
  "bitch",
  "bugger",
  "cock",
  "bollocks",
  "arsehole",
  "asshole",
  "wanker",
  "twat",
  "tit",
  "prick",
  "dork",
  "dick",
  "pussy",
  "whore",
  "slut",
  "cunt",
  "fag",
  "faggot",
];

// URL detection regex
const URL_REGEX = /(https?:\/\/|www\.)/i;

/**
 * Checks a PlanDoc for moderation issues.
 * Returns an array of human-readable issue descriptions.
 * Empty array means the plan is clean.
 */
export function moderationIssues(doc: PlanDoc): string[] {
  const issues: string[] = [];

  // Build profanity regexes with word boundaries
  const profanityRegexes = PROFANITIES.map((word) => new RegExp(`\\b${word}\\b`, "i"));

  // Helper to check if text contains a URL
  const hasUrl = (text: string | undefined): boolean => {
    if (!text) return false;
    return URL_REGEX.test(text);
  };

  // Helper to check if text contains profanity
  const hasProfanity = (text: string | undefined): boolean => {
    if (!text) return false;
    return profanityRegexes.some((regex) => regex.test(text));
  };

  // Check meta.name
  if (hasUrl(doc.meta.name)) {
    issues.push("plan name contains a link");
  }
  if (hasProfanity(doc.meta.name)) {
    issues.push("plan name contains inappropriate language");
  }

  // Check meta.description
  if (hasUrl(doc.meta.description)) {
    issues.push("description contains a link");
  }
  if (hasProfanity(doc.meta.description)) {
    issues.push("description contains inappropriate language");
  }

  // Check days
  doc.days.forEach((day, dayIndex) => {
    const dayNumber = dayIndex + 1;

    // Check day label
    if (hasUrl(day.label)) {
      issues.push(`day ${dayNumber} label contains a link`);
    }
    if (hasProfanity(day.label)) {
      issues.push(`day ${dayNumber} label contains inappropriate language`);
    }

    // Check day focus
    if (hasUrl(day.focus)) {
      issues.push(`day ${dayNumber} focus contains a link`);
    }
    if (hasProfanity(day.focus)) {
      issues.push(`day ${dayNumber} focus contains inappropriate language`);
    }

    // Helper to check exercises in an array
    const checkExercises = (exercises: typeof day.main, section: string) => {
      exercises.forEach((exercise, exIndex) => {
        const exNumber = exIndex + 1;

        // Check note
        if (exercise.note) {
          if (hasUrl(exercise.note)) {
            issues.push(`day ${dayNumber} ${section} exercise ${exNumber} note contains a link`);
          }
          if (hasProfanity(exercise.note)) {
            issues.push(`day ${dayNumber} ${section} exercise ${exNumber} note contains inappropriate language`);
          }
        }

        // Check loadNote
        if (exercise.loadNote) {
          if (hasUrl(exercise.loadNote)) {
            issues.push(`day ${dayNumber} ${section} exercise ${exNumber} loadNote contains a link`);
          }
          if (hasProfanity(exercise.loadNote)) {
            issues.push(`day ${dayNumber} ${section} exercise ${exNumber} loadNote contains inappropriate language`);
          }
        }
      });
    };

    // Check warmup exercises
    if (day.warmup && day.warmup.length > 0) {
      checkExercises(day.warmup, "warmup");
    }

    // Check main exercises
    checkExercises(day.main, "main");

    // Check finisher exercises
    if (day.finisher && day.finisher.length > 0) {
      checkExercises(day.finisher, "finisher");
    }
  });

  // Check dailyProtocols
  doc.dailyProtocols.forEach((protocol, protIndex) => {
    const protNumber = protIndex + 1;

    // Check protocol name
    if (hasUrl(protocol.name)) {
      issues.push(`protocol ${protNumber} name contains a link`);
    }
    if (hasProfanity(protocol.name)) {
      issues.push(`protocol ${protNumber} name contains inappropriate language`);
    }

    // Check protocol cue
    if (protocol.cue) {
      if (hasUrl(protocol.cue)) {
        issues.push(`protocol ${protNumber} cue contains a link`);
      }
      if (hasProfanity(protocol.cue)) {
        issues.push(`protocol ${protNumber} cue contains inappropriate language`);
      }
    }

    // Check exercises in protocol
    protocol.items.forEach((exercise, exIndex) => {
      const exNumber = exIndex + 1;

      // Check note
      if (exercise.note) {
        if (hasUrl(exercise.note)) {
          issues.push(`protocol ${protNumber} exercise ${exNumber} note contains a link`);
        }
        if (hasProfanity(exercise.note)) {
          issues.push(`protocol ${protNumber} exercise ${exNumber} note contains inappropriate language`);
        }
      }

      // Check loadNote
      if (exercise.loadNote) {
        if (hasUrl(exercise.loadNote)) {
          issues.push(`protocol ${protNumber} exercise ${exNumber} loadNote contains a link`);
        }
        if (hasProfanity(exercise.loadNote)) {
          issues.push(`protocol ${protNumber} exercise ${exNumber} loadNote contains inappropriate language`);
        }
      }
    });
  });

  // Check custom exercise definitions (free text that travels with the plan)
  (doc.customExercises ?? []).forEach((custom, i) => {
    const n = i + 1;
    if (hasUrl(custom.name)) {
      issues.push(`custom exercise ${n} name contains a link`);
    }
    if (hasProfanity(custom.name)) {
      issues.push(`custom exercise ${n} name contains inappropriate language`);
    }
    if (custom.cues) {
      if (hasUrl(custom.cues)) {
        issues.push(`custom exercise ${n} cues contain a link`);
      }
      if (hasProfanity(custom.cues)) {
        issues.push(`custom exercise ${n} cues contain inappropriate language`);
      }
    }
  });

  return issues;
}
