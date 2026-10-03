"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getForgeLevel, getForgeRewardBalance, type ForgeAchievement } from "../lib/forge-experience";
import ForgeAvatar from "./forge-avatar";
import { forgeHaptic, forgeTone } from "../lib/forge-feedback";

const worlds = [
  { href: "/", label: "HOME", icon: "⌂" },
  { href: "/challenges/focus", label: "FOCUS", icon: "◎" },
  { href: "/challenges/control", label: "CONTROL", icon: "◇" },
  { href: "/challenges/patience", label: "PATIENCE", icon: "◷" },
  { href: "/challenges/persistence", label: "MEMORY", icon: "↻" },
  { href: "/challenges/consistency", label: "CONSISTENCY", icon: "▦" },
];

const routeSkill: Record<string, string> = {
  "/challenges/focus": "FOCUS",
  "/challenges/control": "CONTROL",
  "/challenges/patience": "PATIENCE",
  "/challenges/persistence": "MEMORY",
  "/challenges/consistency": "CONSISTENCY",
};

export default function ForgeExperienceLayer() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [reward, setReward] = useState<{ credits: number; reason: string } | null>(null);
  const [achievement, setAchievement] = useState<ForgeAchievement | null>(null);
  const [credits, setCredits] = useState(0);
  const [level, setLevel] = useState(1);

  useEffect(() => {
    setLoading(true);
    const timer = window.setTimeout(() => setLoading(false), 360);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    setCredits(getForgeRewardBalance());
    setLevel(getForgeLevel());

    const onReward = (event: Event) => {
      const detail = (event as CustomEvent<{ credits: number; reason: string; balance: number }>).detail;
      setCredits(detail.balance);
      setReward(detail);
      forgeTone("success");
      forgeHaptic([14, 28, 14]);
      window.setTimeout(() => setReward(null), 2400);
    };
    const onAchievement = (event: Event) => {
      const detail = (event as CustomEvent<ForgeAchievement>).detail;
      setAchievement(detail);
      forgeTone("achievement");
      forgeHaptic([18, 32, 55]);
      window.setTimeout(() => setAchievement(null), 3600);
    };
    window.addEventListener("forge:reward", onReward);
    window.addEventListener("forge:achievement", onAchievement);
    return () => {
      window.removeEventListener("forge:reward", onReward);
      window.removeEventListener("forge:achievement", onAchievement);
    };
  }, []);

  const current = routeSkill[pathname] ?? "TRAINING ARENA";

  return (
    <>
      <div className={`forge-transition ${loading ? "is-visible" : ""}`} aria-hidden="true">
        <div className="forge-transition-core"><span>F</span></div>
        <small>FORGE · ${current}</small>
      </div>

      <aside className="forge-world-nav" aria-label="Training navigation">
        <Link href="/" className="forge-world-brand">F</Link>
        <nav>
          {worlds.map((world) => (
            <Link key={world.href} href={world.href} className={pathname === world.href ? "active" : ""} aria-label={world.label}>
              <span>{world.icon}</span><b>{world.label}</b>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="forge-hud" aria-label="FORGE status">
        <div className="forge-hud-skill"><span>ACTIVE</span><b>{current}</b></div>
        <div className="forge-hud-stat"><span>LV</span><b>{level}</b></div>
        <div className="forge-hud-stat"><span>◈</span><b>{credits}</b></div>
        <ForgeAvatar size="sm" level={level} />
      </div>

      {reward && (
        <div className="forge-reward-toast" role="status" aria-live="polite">
          <span>+{reward.credits}</span><b>FORGE CREDITS</b><small>{reward.reason.toUpperCase()}</small>
        </div>
      )}

      {achievement && (
        <div className="forge-achievement-overlay" role="status" aria-live="polite">
          <div className="forge-achievement-card">
            <span className="forge-achievement-icon">{achievement.icon}</span>
            <small>ACHIEVEMENT UNLOCKED</small>
            <h2>{achievement.title}</h2>
            <p>{achievement.description}</p>
          </div>
        </div>
      )}

      <div className="forge-mobile-dock" aria-label="Mobile training navigation">
        {worlds.map((world) => (
          <Link key={world.href} href={world.href} className={pathname === world.href ? "active" : ""}>
            <span>{world.icon}</span><small>{world.label}</small>
          </Link>
        ))}
      </div>
    </>
  );
}
