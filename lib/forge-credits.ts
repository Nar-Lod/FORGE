export const FORGE_CREDITS_KEY = "forge.credits.balance";
export const REVEAL_COST = 1;
export const DEVELOPMENT_STARTING_CREDITS = 5;
export const ACCOUNT_SIGNUP_BONUS_CREDITS = 10;
export const FORGE_SIGNUP_BONUS_KEY = "forge.account.signup-bonus.v1";

/**
 * Credits are currently a local wallet so the game economy can be tested
 * without a payment provider. Later this same interface can be backed by
 * authenticated server state and an app-store purchase ledger.
 */
export function getCredits(): number {
  if (typeof window === "undefined") return 0;
  const stored = window.localStorage.getItem(FORGE_CREDITS_KEY);
  if (stored === null) {
    window.localStorage.setItem(FORGE_CREDITS_KEY, String(DEVELOPMENT_STARTING_CREDITS));
    return DEVELOPMENT_STARTING_CREDITS;
  }
  return Math.max(0, Number(stored) || 0);
}

export function spendCredits(amount = REVEAL_COST): boolean {
  const current = getCredits();
  if (current < amount) return false;
  window.localStorage.setItem(FORGE_CREDITS_KEY, String(current - amount));
  window.dispatchEvent(new CustomEvent("forge:credits-changed", { detail: { balance: current - amount } }));
  return true;
}

export function addCredits(amount: number): number {
  const next = getCredits() + Math.max(0, amount);
  window.localStorage.setItem(FORGE_CREDITS_KEY, String(next));
  window.dispatchEvent(new CustomEvent("forge:credits-changed", { detail: { balance: next } }));
  return next;
}


export function grantSignupBonus(): number {
  if (typeof window === "undefined") return 0;
  if (window.localStorage.getItem(FORGE_SIGNUP_BONUS_KEY) === "granted") {
    return getCredits();
  }
  const next = addCredits(ACCOUNT_SIGNUP_BONUS_CREDITS);
  window.localStorage.setItem(FORGE_SIGNUP_BONUS_KEY, "granted");
  return next;
}
