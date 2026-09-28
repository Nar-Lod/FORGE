"use client";

import Link from "next/link";

const skills = [
  ["Focus", "Hold attention when distractions compete."],
  ["Control", "Follow the intended rule instead of the impulse."],
  ["Patience", "Delay the easy reward and wait for the better one."],
  ["Persistence", "Keep adapting after difficulty or failure."],
  ["Consistency", "Perform reliably across repeated attempts."],
];

const metrics = [["Focus", 81], ["Control", 69], ["Patience", 61], ["Persistence", 84], ["Consistency", 73]];

export default function Home() {
  return (
    <div className="forge-shell">
      <header className="topbar"><div className="brand">F<span>O</span>RGE</div><div className="status">ALPHA 0.1 · BUILDING IN PUBLIC</div></header>
      <main className="main">
        <section className="hero">
          <div>
            <div className="eyebrow">Train the switch</div>
            <h1>Your mind is a skill. Train it.</h1>
            <p className="lead">Short, competitive challenges designed to train focus, control, patience, persistence and consistency — without turning your training into another endless scroll.</p>
            <div className="cta-row"><Link className="btn btn-primary" href="/challenges/focus">Start a challenge</Link><a className="btn btn-secondary" href="#profile">See your profile</a></div>
          </div>
          <div className="card score-card"><div><div className="card-label">Forge score</div><div className="score">76</div><div className="percentile">Top 18% worldwide*</div><div className="progress"><div style={{ width: "76%" }} /></div></div><div><div className="card-label">Next opportunity</div><p style={{ marginBottom: 0 }}>Train Patience · 61 → 68</p></div></div>
        </section>
        <section className="section"><div className="section-title"><div><h2>Five skills. One training system.</h2><p>Play for a few minutes. Leave better than you arrived.</p></div></div><div className="challenge-grid">{skills.map(([name, description], i) => <article className="card challenge" key={name}><div className="icon">0{i + 1}</div><div><strong>{name}</strong><p>{description}</p></div></article>)}</div></section>
        <section className="section"><div className="card switch"><div><div className="eyebrow">The signature challenge</div><h2>Feeling the urge to scroll?</h2><p>Try a 60-second Switch challenge. Interrupt the impulse, solve a focused task, measure the result, then get back to what you actually wanted to do.</p></div><Link className="btn btn-primary" href="/challenges/focus">Try Focus · 60s</Link></div></section>
        <section className="section" id="profile"><div className="section-title"><div><h2>Your development profile</h2><p>Performance metrics, not diagnoses.</p></div></div><div className="metric-row">{metrics.map(([name, value]) => <div className="card metric" key={name}><div className="metric-name">{name}</div><div className="metric-value">{value}</div><div className="progress"><div style={{ width: `${value}%` }} /></div></div>)}</div></section>
        <p className="footer-note">*Alpha benchmark is illustrative. Production percentiles will use an explicitly defined, privacy-conscious benchmark population.</p>
      </main>
    </div>
  );
}
