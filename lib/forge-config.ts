export const FORGE_CONFIG = {
  focus: {
    rounds: 20,
    gridSize: 36,
    startingLevel: 1,
    minLevel: 1,
    maxLevel: 1,
    // Static development timing. Speed progression will be added after
    // every core game mechanic is complete.
    levels: [
      { level: 1, reactionMs: 3000, distractorDensity: 0.34, familyComplexity: 1 },
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
