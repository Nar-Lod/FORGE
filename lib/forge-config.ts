export const FORGE_CONFIG = {
  focus: {
    rounds: 20,
    gridSize: 36,
    startingLevel: 1,
    minLevel: 1,
    maxLevel: 7,

    // Development tuning: keep Focus deliberately slow while we validate
    // the full FORGE system. We will optimize these timings later.
    levels: [
      { level: 1, reactionMs: 1500, distractorDensity: 0.34, familyComplexity: 1 },
      { level: 2, reactionMs: 1430, distractorDensity: 0.38, familyComplexity: 1 },
      { level: 3, reactionMs: 1370, distractorDensity: 0.42, familyComplexity: 1 },
      { level: 4, reactionMs: 1300, distractorDensity: 0.46, familyComplexity: 2 },
      { level: 5, reactionMs: 1230, distractorDensity: 0.50, familyComplexity: 2 },
      { level: 6, reactionMs: 1160, distractorDensity: 0.54, familyComplexity: 2 },
      { level: 7, reactionMs: 1100, distractorDensity: 0.58, familyComplexity: 3 },
    ],

    // Difficulty changes only after repeated evidence.
    goodAccuracy: 0.85,
    poorAccuracy: 0.65,
    consecutiveGoodRounds: 3,
    consecutivePoorRounds: 2,

    waitDurationMs: 650,
    startDelayMs: 350,
    resultSpeedReferenceMs: 1500,
  },
} as const;
