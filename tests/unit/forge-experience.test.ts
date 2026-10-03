import { beforeEach, describe, expect, it } from "vitest";
import {
  FORGE_ACHIEVEMENTS,
  getForgeLevel,
  getForgeRewardBalance,
  getUnlockedAchievements,
  recordForgeSessionCompletion,
  unlockForgeAchievement,
} from "../../lib/forge-experience";

describe("FORGE progression experience", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts with a stable level and empty reward ledger", () => {
    expect(getForgeLevel()).toBe(1);
    expect(getForgeRewardBalance()).toBe(0);
    expect(getUnlockedAchievements()).toEqual([]);
  });

  it("unlocks an achievement once and persists it", () => {
    expect(unlockForgeAchievement("first_session")).toEqual(FORGE_ACHIEVEMENTS.first_session);
    expect(unlockForgeAchievement("first_session")).toBeNull();
    expect(getUnlockedAchievements()).toEqual(["first_session"]);
  });

  it("converts a completed session into credits and achievement state", () => {
    recordForgeSessionCompletion("control", 100);
    expect(getForgeRewardBalance()).toBe(15);
    expect(getUnlockedAchievements()).toContain("first_session");
    expect(getUnlockedAchievements()).toContain("clean_control");
  });
});
