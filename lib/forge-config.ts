export const FORGE_CONFIG = {
  focus: {
    rounds: 20,
    gridSize: 36,
    startingLevel: 1,
    minLevel: 1,
    maxLevel: 5,
    // Reaction time stays fixed for now. Adaptive difficulty first changes
    // visual complexity; timing can become adaptive after the core games stabilize.
    levels: [
      { level: 1, reactionMs: 3000, distractorDensity: 0.30, familyComplexity: 1 },
      { level: 2, reactionMs: 3000, distractorDensity: 0.38, familyComplexity: 2 },
      { level: 3, reactionMs: 3000, distractorDensity: 0.46, familyComplexity: 3 },
      { level: 4, reactionMs: 3000, distractorDensity: 0.54, familyComplexity: 4 },
      { level: 5, reactionMs: 3000, distractorDensity: 0.62, familyComplexity: 5 },
    ],
    goodAccuracy: 0.85,
    poorAccuracy: 0.65,
    consecutiveGoodRounds: 3,
    consecutivePoorRounds: 2,
    waitDurationMs: 650,
    startDelayMs: 350,
    resultSpeedReferenceMs: 3000,
  },
} as const;
