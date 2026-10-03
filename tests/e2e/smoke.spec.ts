import { expect, test } from "@playwright/test";

const routes = [
  ["/", "FORGE", "Choose your challenge."],
  ["/challenges/focus", "FOCUS", "Find it before it vanishes."],
  ["/challenges/control", "CONTROL", "Follow the rule."],
  ["/challenges/patience", "PATIENCE", "Do nothing on purpose."],
  ["/challenges/persistence", "PERSISTENCE", "Remember the sequence."],
  ["/challenges/consistency", "CONSISTENCY", "Remember the objects, not the slots."],
  ["/privacy", "DATA & PRIVACY", "Your FORGE data"],
] as const;

test.describe("FORGE route smoke", () => {
  for (const [path, marker, heading] of routes) {
    test(`${marker} route loads without a fatal UI error`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));

      await page.goto(path);
      await expect(page.locator("body")).toContainText(heading);
      expect(errors).toEqual([]);
    });
  }
});

test("home exposes every core training route", async ({ page }) => {
  await page.goto("/");
  for (const label of ["FOCUS", "CONTROL", "PATIENCE", "PERSISTENCE", "CONSISTENCY"]) {
    await expect(page.getByRole("link", { name: new RegExp(label, "i") }).first()).toBeVisible();
  }
});

test("Focus can enter its playable state", async ({ page }) => {
  await page.goto("/challenges/focus");
  await page.getByRole("button", { name: /Begin Focus/i }).click();
  await expect(page.locator(".game-stage")).toBeVisible();
  await expect(page.locator(".live-stats")).toContainText("LEVEL");
});

test("profile username editor enforces the minimum length", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "EDIT" }).click();
  const input = page.getByRole("textbox", { name: "Player name" });
  await input.fill("A");
  await page.getByRole("button", { name: "SAVE" }).click();
  await expect(page.locator(".profile-name-error")).toContainText("at least 2 characters");
});

test("privacy page exposes export and deletion controls", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("button", { name: /Export my data/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Delete account data/i })).toBeVisible();
});
