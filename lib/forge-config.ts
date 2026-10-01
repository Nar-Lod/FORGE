export const FORGE_CONFIG = {
  focus: {
    rounds: 20,
    gridSize: 36,
    startingLevel: 1,
    minLevel: 1,
    maxLevel: 5,
    // Visual complexity changes first. Timing remains at the 3s baseline until
    // the perceptual generator and telemetry are stable enough to justify pressure.
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
    difficulty: {
      targetSimilarity: [0.18, 0.82],
      distractorSimilarity: [0.16, 0.82],
      distractorDiversity: [0.22, 0.80],
      spatialUncertainty: [0.20, 0.90],
      spatialCompetition: [0.18, 0.86],
      visualComplexity: [0.12, 0.84],
      temporalPressure: [0.08, 0.32],
    },
  },
} as const;
