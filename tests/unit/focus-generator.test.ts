import { describe, expect, it } from "vitest";
import { FOCUS_LIBRARIES } from "../../lib/focus-library";
import {
  focusDifficultyForLevel,
  generateFocusChallenge,
} from "../../lib/focus-generator";

describe("FORGE Focus challenge generator", () => {
  it("creates exactly one target in a fully populated grid", () => {
    const challenge = generateFocusChallenge({
      mode: "shapes",
      library: FOCUS_LIBRARIES.shapes,
      gridSize: 36,
      level: 3,
      difficulty: focusDifficultyForLevel(3),
    });

    expect(challenge.cells).toHaveLength(36);
    expect(challenge.cells.filter((cell) => cell.isTarget)).toHaveLength(1);
    expect(challenge.cells[challenge.targetCell]?.item.id).toBe(challenge.target.id);
  });

  it("does not place the target item in another cell", () => {
    const challenge = generateFocusChallenge({
      mode: "shapes",
      library: FOCUS_LIBRARIES.shapes,
      gridSize: 36,
      level: 5,
      difficulty: focusDifficultyForLevel(5),
    });

    const targetCopies = challenge.cells.filter((cell) => cell.item.id === challenge.target.id);
    expect(targetCopies).toHaveLength(1);
    expect(targetCopies[0].isTarget).toBe(true);
  });

  it("keeps timing secondary to perceptual complexity", () => {
    const low = focusDifficultyForLevel(1);
    const high = focusDifficultyForLevel(5);

    expect(high.targetSimilarity).toBeGreaterThan(low.targetSimilarity);
    expect(high.visualComplexity).toBeGreaterThan(low.visualComplexity);
    expect(high.temporalPressure - low.temporalPressure).toBeLessThan(
      high.visualComplexity - low.visualComplexity,
    );
  });
});
