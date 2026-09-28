"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

const skillData: Record<string, { title: string; description: string; status: string; href: string }> = {
  patience: { title: "Patience", description: "Practice delaying the easy reward and staying deliberate while the outcome is not immediate.", status: "Playable training module", href: "/challenges/patience" },
  persistence: { title: "Persistence", description: "Practice recovering after failure, changing strategy and continuing without turning the session into endless repetition.", status: "Playable training module", href: "/challenges/persistence" },
  consistency: { title: "Consistency", description: "Practice producing reliable performance across repeated attempts — and returning deliberately rather than compulsively.", status: "Playable training module", href: "/challenges/consistency" },
};

export default function SkillPage() {
  const params = useParams<{ skill: string }>();
  const key = String(params.skill).toLowerCase();
  const skill = skillData[key];

  if (!skill) {
    return <main className="game-shell"><div className="game-topbar"><Link href="/" className="game-back">← FORGE</Link><div className="game-progress">SKILL LAB</div></div><section className="skill-hero"><div className="eyebrow">NOT FOUND</div><h1>Skill unavailable.</h1><Link href="/" className="btn btn-secondary">Back to training system</Link></section></main>;
  }

  return (
    <main className="game-shell skill-page">
      <div className="game-topbar"><Link href="/" className="game-back">← FORGE</Link><div className="game-progress">SKILL LAB</div></div>
      <section className="skill-hero">
        <div className="eyebrow">{skill.status}</div>
        <h1>{skill.title}</h1>
        <p>{skill.description}</p>
        <div className="skill-preview card">
          <span className="card-label">Training loop</span>
          <strong>Play → Measure → Recover → Improve</strong>
          <p>This is now a playable mechanic. Each module trains a different behavior instead of repeating the same game.</p>
        </div>
        <Link href={skill.href} className="btn btn-primary">Open {skill.title}</Link>
        <Link href="/" className="btn btn-secondary">Back to training system</Link>
      </section>
    </main>
  );
}
