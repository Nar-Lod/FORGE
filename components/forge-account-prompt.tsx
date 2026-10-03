"use client";

import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCredits } from "../lib/forge-credits";

const FIRST_PROMPT_KEY = "forge.account.prompt.v1";
const CREDIT_PROMPT_KEY = "forge.account.credit-prompt.v1";

export default function ForgeAccountPrompt() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const [visible, setVisible] = useState(false);
  const [reason, setReason] = useState<"first" | "credits">("first");

  useEffect(() => {
    if (!isLoaded || isSignedIn || typeof window === "undefined") return;
    if (!pathname.startsWith("/challenges/")) return;

    const firstPromptShown = window.localStorage.getItem(FIRST_PROMPT_KEY) === "shown";
    const balance = getCredits();

    if (!firstPromptShown) {
      setReason("first");
      setVisible(true);
      return;
    }

    if (balance <= 0 && window.localStorage.getItem(CREDIT_PROMPT_KEY) !== "dismissed") {
      setReason("credits");
      setVisible(true);
    }
  }, [isLoaded, isSignedIn, pathname]);

  useEffect(() => {
    const onCreditsChanged = (event: Event) => {
      if (isSignedIn) return;
      const balance = Number((event as CustomEvent<{balance?: number}>).detail?.balance ?? getCredits());
      if (balance <= 0) {
        setReason("credits");
        setVisible(true);
      }
    };
    window.addEventListener("forge:credits-changed", onCreditsChanged);
    return () => window.removeEventListener("forge:credits-changed", onCreditsChanged);
  }, [isSignedIn]);

  if (!visible || !isLoaded || isSignedIn) return null;

  const dismiss = () => {
    if (reason === "first") {
      window.localStorage.setItem(FIRST_PROMPT_KEY, "shown");
    } else {
      window.localStorage.setItem(CREDIT_PROMPT_KEY, "dismissed");
    }
    setVisible(false);
  };

  return (
    <div className="forge-account-backdrop" role="dialog" aria-modal="true" aria-labelledby="forge-account-title">
      <div className="forge-account-modal">
        <div className="forge-account-kicker">{reason === "credits" ? "STARTER CREDITS USED" : "WELCOME TO FORGE"}</div>
        <h2 id="forge-account-title">
          {reason === "credits" ? "Keep your training moving." : "Your profile is ready."}
        </h2>
        <p>
          {reason === "credits"
            ? "Create a free account to receive 10 more credits. Your current FORGE profile and training history stay with you."
            : "You can play immediately with a private local profile. Create a free account whenever you want to keep your identity, appear on leaderboards later, and unlock account features."}
        </p>
        <div className="forge-account-actions">
          <SignUpButton mode="modal">
            <button className="btn btn-primary" onClick={() => {
              if (reason === "first") window.localStorage.setItem(FIRST_PROMPT_KEY, "shown");
            }}>
              CREATE ACCOUNT
            </button>
          </SignUpButton>
          <button className="btn btn-secondary" onClick={dismiss}>LATER</button>
        </div>
        <SignInButton mode="modal">
          <button className="forge-account-signin">Already have an account? Sign in</button>
        </SignInButton>
        <div className="forge-account-note">Your current anonymous progress is preserved and synced after account creation.</div>
      </div>
    </div>
  );
}
