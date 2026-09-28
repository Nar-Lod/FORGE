"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

const skillData: Record<string, { title: string; description: string; status: string; href?: string }> = {
  patience: { title: "Patience", description: "Practice delaying the easy reward and staying deliberate while the outcome is not immediate.", status: "Next training module" },
  persistence: { title: "Persistence", description: "Practice recovering after failure, changing strategy and continuing without turning the session into endless repetition.", status: "Next training module" },
  consistency: { title: "Consistency", description: "Practice producing reliable performance across repeated attempts — and returning deliberately rather than compulsively.", status: "Next training module" },
};

export default function SkillPage() {
  const params = useParams<{ skill: string }>();
  const key = String(params.skill).toLowerCase();
  const skill = skillData[key] ?? { title: "Skill", description: "A new FORGE training module is being built.", status: "Coming next" };

  return (
    <main className="game-shell skill-page">
      <div className="game-topbar"><Link href="/" className="game-back">← FORGE</Link><div className="game-progress">SKILL LAB</div></div>
      <section className="skill-hero">
        <div className="eyebrow">{skill.status}</div>
        <h1>{skill.title}</h1>
        <p>{skill.description}</p>
        <div className="skill-preview card">
          <span className="card-label">Design principle</span>
          <strong>Play → Measure → Recover → Improve</strong>
          <p>This module will be a real playable challenge, not a lesson page. We are building each skill as a distinct mechanic.</p>
        </div>
        <Link href="/" className="btn btn-secondary">Back to training system</Link>
      </section>
    </main>
  );
}
