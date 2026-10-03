import { describe, expect, it } from "vitest";
import { getAdaptiveProfile, updateAdaptiveState } from "../../lib/forge-adaptive";

describe("FORGE adaptive difficulty contract", () => {
  it("requires the configured mastery streak before increasing difficulty", () => {
    const config = getAdaptiveProfile("focus");
    let state = { level: 1, upStreak: 0, downStreak: 0, history: [] as number[] };

    const first = updateAdaptiveState(state, 1, config);
    expect(first.decision.direction).toBe("hold");
    expect(first.state.level).toBe(1);

    state = first.state;
    const second = updateAdaptiveState(state, 1, config);
    expect(second.decision.direction).toBe("hold");

    state = second.state;
    const third = updateAdaptiveState(state, 1, config);
    expect(third.decision.direction).toBe("up");
    expect(third.state.level).toBe(2);
  });

  it("does not move below the minimum level", () => {
    const config = getAdaptiveProfile("focus");
    const result = updateAdaptiveState(
      { level: config.minLevel, upStreak: 0, downStreak: 1, history: [0, 0] },
      0,
      config,
    );

    expect(result.state.level).toBe(config.minLevel);
  });

  it("clamps out-of-range performance before making a decision", () => {
    const config = getAdaptiveProfile("focus");
    const result = updateAdaptiveState(
      { level: 1, upStreak: 0, downStreak: 0, history: [] },
      50,
      config,
    );

    expect(result.state.history.at(-1)).toBe(1);
  });
});
