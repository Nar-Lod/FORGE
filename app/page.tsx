"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAnalyticsEvents, getPlayerModel, type ForgeSkill } from "../lib/forge-analytics";
import { getForgePlayerRecord, updateForgePlayerProfile } from "../lib/forge-data";
import { useAuth } from "@clerk/nextjs";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

const skills = [
  ["FOCUS", "Hold attention when distractions compete.", "/challenges/focus", "01", "◎"],
  ["CONTROL", "Break the impulse. Follow the rule.", "/challenges/control", "02", "◇"],
  ["PATIENCE", "Build the reward by choosing to wait.", "/challenges/patience", "03", "◷"],
  ["PERSISTENCE", "Adapt when the challenge gets harder.", "/challenges/persistence", "04", "↻"],
  ["CONSISTENCY", "Remember your pattern. Rebuild it.", "/challenges/consistency", "05", "▦"],
];
const skillLabels: Record<ForgeSkill, string> = {
  focus: "Focus",
  control: "Control",
  patience: "Patience",
  persistence: "Persistence",
  consistency: "Consistency",
};
const fallbackMetrics: [string, number][] = Object.values(skillLabels).map((label) => [label, 0]);

export default function Home(){
  const { isSignedIn } = useAuth();
  const [metrics,setMetrics]=useState<[string,number][]>(fallbackMetrics),[sessions,setSessions]=useState(0);
  const [displayName,setDisplayName]=useState("");
  const [editingName,setEditingName]=useState(false);
  const [draftName,setDraftName]=useState("");
  useEffect(()=>{
    const model=getPlayerModel();
    const next=(Object.entries(skillLabels) as [ForgeSkill,string][])
      .map(([skill,label])=>[label,Math.round(model.skills[skill].rating*100)] as [string,number]);
    setMetrics(next);
    const completed=getAnalyticsEvents().filter((event)=>event.event==="session_completed").length;
    setSessions(completed);
    const record=getForgePlayerRecord();
    setDisplayName(record.profile.displayName || "Forge Player");
    setDraftName(record.profile.displayName || "Forge Player");
  },[]);
  const overall=metrics.length?Math.round(metrics.reduce((s,[,v])=>s+Number(v),0)/metrics.length):0;
  const strongest=useMemo(()=>[...metrics].sort((a,b)=>Number(b[1])-Number(a[1]))[0],[metrics]);
  return <div className="forge-world">
    <header className="game-nav"><Link href="/" className="game-logo">F<span>O</span>RGE</Link><div className="nav-center"><span className="nav-pill live"><i/> TRAINING ARENA</span><span className="nav-pill">ALPHA 0.1</span></div><div className="nav-profile">{isSignedIn ? <UserButton /> : <a href="#profile" className="profile-orb" aria-label="Open profile">{displayName ? displayName.slice(0,1).toUpperCase() : overall||"+"}</a>}</div></header>
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

      <section className="profile-zone" id="profile"><div className="profile-header"><div><span className="eyebrow">YOUR FORGE</span><h2>Training profile</h2></div><span className="profile-score">{overall}<small>/100</small></span></div>
        <div className="profile-identity">
          <div>
            <span className="profile-field-label">PLAYER NAME</span>
            {editingName ? (
              <div className="profile-name-edit"><input value={draftName} maxLength={20} onChange={(event)=>setDraftName(event.target.value)} aria-label="Player name" /><button className="btn btn-primary" onClick={()=>{const clean=draftName.trim().replace(/[^a-zA-Z0-9 _-]/g,"").slice(0,20)||displayName; updateForgePlayerProfile({displayName:clean}); setDisplayName(clean); setDraftName(clean); setEditingName(false);}}>SAVE</button><button className="btn btn-secondary" onClick={()=>{setDraftName(displayName);setEditingName(false);}}>CANCEL</button></div>
            ) : (
              <div className="profile-name-row"><strong>{displayName || "Forge Player"}</strong><button className="profile-edit" onClick={()=>setEditingName(true)}>EDIT</button></div>
            )}
          </div>
          {!isSignedIn ? (
            <div className="profile-account">
              <span>ANONYMOUS PROFILE</span>
              <small>Create an account later to carry this profile into leaderboards and account features.</small>
              <SignUpButton mode="modal"><button className="profile-account-action">CREATE ACCOUNT</button></SignUpButton>
              <SignInButton mode="modal"><button className="profile-account-signin">SIGN IN</button></SignInButton>
            </div>
          ) : <div className="profile-account connected"><span>ACCOUNT CONNECTED</span><small>Your local training history is being synchronized to your FORGE account.</small></div>}
        </div><div className="profile-bars">{metrics.map(([name,value])=><div className="profile-bar" key={name}><div><span>{name}</span><b>{value}</b></div><div className="bar-track"><i style={{width:`${value}%`}}/></div></div>)}</div><div className="profile-insight"><span>TRAINING SIGNAL</span><strong>{sessions?`Strongest current skill: ${strongest[0]}.`:"Your profile begins with your first deliberate challenge."}</strong><p>{sessions?"Train your weakest area next, then stop if you feel the urge to keep chasing a score.":"Don't chase numbers. Learn the game, complete one challenge, review the result."}</p></div></section>
      <footer className="game-footer">FORGE · TRAIN THE MIND · NOT AN ENDLESS FEED</footer>
    </main>
  </div>
}
