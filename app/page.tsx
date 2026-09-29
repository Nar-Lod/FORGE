"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const skills = [
  ["FOCUS", "Hold attention when distractions compete.", "/challenges/focus", "01", "◎"],
  ["CONTROL", "Break the impulse. Follow the rule.", "/challenges/switch", "02", "◇"],
  ["PATIENCE", "Build the reward by choosing to wait.", "/skills/patience", "03", "◷"],
  ["PERSISTENCE", "Adapt when the challenge gets harder.", "/challenges/persistence", "04", "↻"],
  ["CONSISTENCY", "Remember your pattern. Rebuild it.", "/challenges/consistency", "05", "▦"],
];
const fallbackMetrics = [["Focus", 0], ["Control", 0], ["Patience", 0], ["Persistence", 0], ["Consistency", 0]];

export default function Home(){
  const [metrics,setMetrics]=useState(fallbackMetrics),[sessions,setSessions]=useState(0);
  useEffect(()=>{const saved=window.localStorage.getItem("forge.metrics"),ss=Number(window.localStorage.getItem("forge.sessions")||0);if(saved){try{setMetrics(JSON.parse(saved))}catch{}}setSessions(ss)},[]);
  const overall=metrics.length?Math.round(metrics.reduce((s,[,v])=>s+Number(v),0)/metrics.length):0;
  const strongest=useMemo(()=>[...metrics].sort((a,b)=>Number(b[1])-Number(a[1]))[0],[metrics]);
  return <div className="forge-world">
    <header className="game-nav"><Link href="/" className="game-logo">F<span>O</span>RGE</Link><div className="nav-center"><span className="nav-pill live"><i/> TRAINING ARENA</span><span className="nav-pill">ALPHA 0.1</span></div><a href="#profile" className="profile-orb" aria-label="Open profile">{overall||"+"}</a></header>
    <main className="arena-home">
      <section className="hero-arena">
        <div className="hero-copy">
          <div className="eyebrow">FORGE TRAINING SYSTEM</div>
          <h1>MASTER<br/><em>YOURSELF.</em></h1>
          <p>Five skills. Short challenges. A training system built around attention, control, patience, persistence and consistency.</p>
          <div className="hero-actions"><Link className="play-button" href="/challenges/focus"><span>▶</span> ENTER TRAINING</Link><span className="micro-copy">2–5 MIN · PLAY DELIBERATELY</span></div>
        </div>
        <div className="forge-core"><div className="core-ring ring-one"/><div className="core-ring ring-two"/><div className="core-ring ring-three"/><div className="core-mark">F</div><div className="core-label">FORGE<br/><small>TRAINING CORE</small></div></div>
      </section>

      <section className="mission-strip"><div><span className="mission-label">TODAY'S MISSION</span><strong>Train one skill. Leave better than you arrived.</strong></div><div className="mission-stat"><b>{sessions}</b><span>DELIBERATE<br/>SESSIONS</span></div></section>

      <section className="arena-section"><div className="section-heading"><div><span className="eyebrow">TRAINING ARENA</span><h2>Choose your challenge.</h2></div><span className="section-note">01—05 · SKILLS</span></div>
        <div className="skill-grid">{skills.map(([name,description,href,num,icon])=><Link href={href} className="skill-card" key={name}><div className="skill-top"><span className="skill-num">{num}</span><span className="skill-icon">{icon}</span></div><div className="skill-body"><h3>{name}</h3><p>{description}</p></div><div className="skill-enter">ENTER <span>→</span></div></Link>)}</div>
      </section>

      <section className="signature-zone"><div className="signature-copy"><span className="eyebrow">SIGNATURE CHALLENGE</span><h2>Can you interrupt<br/><em>the impulse?</em></h2><p>Switch puts competing signals in front of you and asks you to slow the automatic response. Read. Control. Act.</p><Link className="outline-play" href="/challenges/switch">PLAY SWITCH <span>↗</span></Link></div><div className="signal-board"><div className="signal-line"/><div className="signal-tile">●</div><div className="signal-tile active">◆</div><div className="signal-tile">▲</div><div className="signal-tile">■</div><div className="signal-rule">FOLLOW THE RULE<br/><b>NOT THE IMPULSE</b></div></div></section>

      <section className="profile-zone" id="profile"><div className="profile-header"><div><span className="eyebrow">YOUR FORGE</span><h2>Training profile</h2></div><span className="profile-score">{overall}<small>/100</small></span></div><div className="profile-bars">{metrics.map(([name,value])=><div className="profile-bar" key={name}><div><span>{name}</span><b>{value}</b></div><div className="bar-track"><i style={{width:`${value}%`}}/></div></div>)}</div><div className="profile-insight"><span>TRAINING SIGNAL</span><strong>{sessions?`Strongest current skill: ${strongest[0]}.`:"Your profile begins with your first deliberate challenge."}</strong><p>{sessions?"Train your weakest area next, then stop if you feel the urge to keep chasing a score.":"Don't chase numbers. Learn the game, complete one challenge, review the result."}</p></div></section>
      <footer className="game-footer">FORGE · TRAIN THE MIND · NOT AN ENDLESS FEED</footer>
    </main>
  </div>
}
