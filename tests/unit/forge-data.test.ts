import { describe, expect, it } from "vitest";
import {
  FORGE_USERNAME_MAX_LENGTH,
  FORGE_USERNAME_MIN_LENGTH,
  validateForgeUsername,
} from "../../lib/forge-data";

describe("FORGE username contract", () => {
  it("accepts the supported distinct username characters", () => {
    expect(validateForgeUsername("Ax")).toMatchObject({ valid: true, value: "Ax" });
    expect(validateForgeUsername("Player_01")).toMatchObject({ valid: true, value: "Player_01" });
    expect(validateForgeUsername("player-01")).toMatchObject({ valid: true, value: "player-01" });
  });

  it("requires at least two characters", () => {
    expect(validateForgeUsername("A").valid).toBe(false);
    expect(FORGE_USERNAME_MIN_LENGTH).toBe(2);
  });

  it("rejects unsupported characters", () => {
    expect(validateForgeUsername("player name").valid).toBe(false);
    expect(validateForgeUsername("player!").valid).toBe(false);
  });

  it("enforces the maximum length without accepting an oversized value", () => {
    const result = validateForgeUsername("x".repeat(FORGE_USERNAME_MAX_LENGTH + 1));
    expect(result.valid).toBe(false);
    expect(result.value.length).toBe(FORGE_USERNAME_MAX_LENGTH);
  });

  it("trims surrounding whitespace before validation", () => {
    expect(validateForgeUsername("  Forge_01  ")).toMatchObject({ valid: true, value: "Forge_01" });
  });
});
