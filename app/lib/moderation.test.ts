import { describe, it, expect } from "vitest";
import type { PlanDoc } from "./plan/schema";
import { moderationIssues } from "./moderation";

const cleanPlan: PlanDoc = {
  schemaVersion: 1,
  meta: {
    name: "My Elbow-Safe Plan",
    description: "A solid plan for injury-free tennis",
    goals: ["power"],
    equipment: ["kettlebell"],
    daysPerWeek: 2,
  },
  days: [
    {
      label: "Day 1",
      focus: "Power development",
      warmup: [{ exerciseId: "arm-circles", note: "relaxed grip" }],
      main: [{ exerciseId: "kb-swing", sets: 3, reps: "12", note: "smooth motion" }],
    },
  ],
  dailyProtocols: [
    {
      name: "Elbow Protocol",
      items: [{ exerciseId: "tyler-twist" }],
      cue: "evenings before bed",
    },
  ],
  injuryConfig: {
    flags: [],
    gate: { proceedMax: 3, dropPct: 20 },
  },
};

describe("moderationIssues", () => {
  it("should return empty array for a clean plan", () => {
    const issues = moderationIssues(cleanPlan);
    expect(issues).toEqual([]);
  });

  it("should detect URL in description", () => {
    const planWithUrl = {
      ...cleanPlan,
      meta: {
        ...cleanPlan.meta,
        description: "Visit https://spam.example.com for more info",
      },
    };
    const issues = moderationIssues(planWithUrl);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((issue) => issue.toLowerCase().includes("description"))).toBe(true);
  });

  it("should detect URL with www prefix", () => {
    const planWithUrl = {
      ...cleanPlan,
      meta: {
        ...cleanPlan.meta,
        description: "Check out www.spam.example.com for details",
      },
    };
    const issues = moderationIssues(planWithUrl);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((issue) => issue.toLowerCase().includes("description"))).toBe(true);
  });

  it("should detect profanity in exercise note", () => {
    const planWithProfanity = {
      ...cleanPlan,
      days: [
        {
          label: "Day 1",
          focus: "Power",
          warmup: [],
          main: [
            {
              exerciseId: "kb-swing",
              sets: 3,
              reps: "12",
              note: "do this damn swing carefully",
            },
          ],
        },
      ],
      dailyProtocols: cleanPlan.dailyProtocols,
      injuryConfig: cleanPlan.injuryConfig,
    };
    const issues = moderationIssues(planWithProfanity);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((issue) => issue.toLowerCase().includes("inappropriate"))).toBe(true);
  });

  it("should NOT match substring-only words like 'class' in 'classification'", () => {
    const planWithCleanWords = {
      ...cleanPlan,
      meta: {
        ...cleanPlan.meta,
        name: "Classification Assessment Plan",
      },
      days: [
        {
          label: "Day 1",
          focus: "Power",
          warmup: [],
          main: [
            {
              exerciseId: "kb-swing",
              sets: 3,
              reps: "12",
              note: "assess the movement pattern",
            },
          ],
        },
      ],
      dailyProtocols: cleanPlan.dailyProtocols,
      injuryConfig: cleanPlan.injuryConfig,
    };
    const issues = moderationIssues(planWithCleanWords);
    expect(issues).toEqual([]);
  });

  it("should detect profanity in plan name", () => {
    const planWithProfanity = {
      ...cleanPlan,
      meta: {
        ...cleanPlan.meta,
        name: "This damn plan",
      },
    };
    const issues = moderationIssues(planWithProfanity);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("should detect profanity in day label", () => {
    const planWithProfanity = {
      ...cleanPlan,
      days: [
        {
          label: "Day 1 - shit focus",
          focus: "Power",
          warmup: [],
          main: [{ exerciseId: "kb-swing", sets: 3, reps: "12" }],
        },
      ],
      dailyProtocols: cleanPlan.dailyProtocols,
      injuryConfig: cleanPlan.injuryConfig,
    };
    const issues = moderationIssues(planWithProfanity);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((issue) => issue.toLowerCase().includes("day"))).toBe(true);
  });

  it("should detect profanity in protocol name", () => {
    const planWithProfanity = {
      ...cleanPlan,
      dailyProtocols: [
        {
          name: "Damn Elbow Protocol",
          items: [{ exerciseId: "tyler-twist" }],
          cue: "evenings",
        },
      ],
    };
    const issues = moderationIssues(planWithProfanity);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("should detect profanity in protocol cue", () => {
    const planWithProfanity = {
      ...cleanPlan,
      dailyProtocols: [
        {
          name: "Elbow Protocol",
          items: [{ exerciseId: "tyler-twist" }],
          cue: "hell of an evening routine",
        },
      ],
    };
    const issues = moderationIssues(planWithProfanity);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("should detect profanity in loadNote", () => {
    const planWithProfanity = {
      ...cleanPlan,
      days: [
        {
          label: "Day 1",
          focus: "Power",
          warmup: [],
          main: [
            {
              exerciseId: "kb-swing",
              sets: 3,
              reps: "12",
              loadNote: "use this damn heavy weight",
            },
          ],
        },
      ],
      dailyProtocols: cleanPlan.dailyProtocols,
      injuryConfig: cleanPlan.injuryConfig,
    };
    const issues = moderationIssues(planWithProfanity);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("should detect profanity in day focus", () => {
    const planWithProfanity = {
      ...cleanPlan,
      days: [
        {
          label: "Day 1",
          focus: "This is ass work",
          warmup: [],
          main: [{ exerciseId: "kb-swing", sets: 3, reps: "12" }],
        },
      ],
      dailyProtocols: cleanPlan.dailyProtocols,
      injuryConfig: cleanPlan.injuryConfig,
    };
    const issues = moderationIssues(planWithProfanity);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("should detect URL in exercise note", () => {
    const planWithUrl = {
      ...cleanPlan,
      days: [
        {
          label: "Day 1",
          focus: "Power",
          warmup: [],
          main: [
            {
              exerciseId: "kb-swing",
              sets: 3,
              reps: "12",
              note: "See https://example.com for form",
            },
          ],
        },
      ],
      dailyProtocols: cleanPlan.dailyProtocols,
      injuryConfig: cleanPlan.injuryConfig,
    };
    const issues = moderationIssues(planWithUrl);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("should detect multiple issues in one plan", () => {
    const planWithIssues = {
      ...cleanPlan,
      meta: {
        ...cleanPlan.meta,
        description: "Visit https://spam.com for details",
      },
      days: [
        {
          label: "Day 1",
          focus: "Power",
          warmup: [],
          main: [
            {
              exerciseId: "kb-swing",
              sets: 3,
              reps: "12",
              note: "do this damn swing",
            },
          ],
        },
      ],
      dailyProtocols: cleanPlan.dailyProtocols,
      injuryConfig: cleanPlan.injuryConfig,
    };
    const issues = moderationIssues(planWithIssues);
    expect(issues.length).toBeGreaterThanOrEqual(2);
  });
});
