"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  recordEvent,
  startForgeSession,
  updateSkillModel,
} from "../../../lib/forge-analytics";
import { difficultySnapshot, getAdaptiveProfile } from "../../../lib/forge-adaptive";

const WAIT_SECONDS = [10, 30, 60, 90, 180, 300, 600, 1200, 3000, 3600];
const LAST_KEY = "forge.patience.lastScore";

const reflectionPrompts = [
  { label: "BREATHE", text: "Take a slow breath in… and a slow breath out. Let your shoulders drop." },
  { label: "TODAY", text: "What is one good thing you want to do today? Picture yourself actually doing it." },
  { label: "GRATITUDE", text: "Think of one good thing that happened yesterday. What made that moment meaningful?" },
  { label: "APPRECIATION", text: "What is one thing about being alive that you genuinely appreciate right now?" },
  { label: "RESET", text: "If you could start today over, what would you change about how you used your time?" },
  { label: "YOUR DAY", text: "Imagine your perfect day from waking up to going to sleep. What would you make time for?" },
  { label: "PEOPLE", text: "Think about a funny, beautiful or unforgettable moment with your family or friends." },
  { label: "SOMEONE", text: "Think about the person who means the most to you. What do you appreciate about them?" },
  { label: "DELAYED", text: "What have you been postponing that you know you would feel good about finally starting?" },
  { label: "PURPOSE", text: "What is one goal you keep saying matters to you? What is the smallest step toward it?" },
  { label: "FAITH", text: "If faith is meaningful to you, take a moment to thank God for life, another day and the people you love." },
  { label: "MEDITATE", text: "For the next few breaths, notice your breathing without changing it. Let thoughts come and go." },
];

function formatWait(seconds:number){
 if(seconds>=3600)return "1 hour";
 if(seconds>=60)return `${seconds/60} min`;
 return `${seconds}s`;
}

export default function PatienceChallenge(){
 const[started,setStarted]=useState(false),[finished,setFinished]=useState(false),[round,setRound]=useState(0),[elapsed,setElapsed]=useState(0),[banked,setBanked]=useState(0),[early,setEarly]=useState(0),[previousBreak,setPreviousBreak]=useState(0),[milestone,setMilestone]=useState<number|null>(null),[notificationEnabled,setNotificationEnabled]=useState(false);
 const startedAt=useRef<number|null>(null);
 const [sessionId,setSessionId]=useState("");
 const [restStartedAt,setRestStartedAt]=useState<number|null>(null);
 const lastNotified=useRef(0);
 const waitSeconds=WAIT_SECONDS[round] ?? WAIT_SECONDS[WAIT_SECONDS.length-1];
 const waitMs=waitSeconds*1000;
 const ready=elapsed>=waitMs;
 const isLong=waitSeconds>=300;

 const playChime=()=>{
   try{const Ctx=window.AudioContext||((window as any).webkitAudioContext);if(!Ctx)return;const ctx=new Ctx();const osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=880;gain.gain.value=.07;osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.28);}catch{}
 };
 const requestNotifications=async()=>{
   if(typeof window!=="undefined"&&"Notification" in window){try{const permission=await Notification.requestPermission();setNotificationEnabled(permission==="granted");}catch{}}
 };
 const notifyMilestone=(seconds:number)=>{
   if(seconds<=60||lastNotified.current===seconds)return;
   lastNotified.current=seconds;
   playChime();
   if(notificationEnabled&&"Notification" in window)try{new Notification("FORGE • Patience milestone",{body:`You waited ${formatWait(seconds)}. Your reward is ready.`});}catch{}
   setMilestone(seconds);
 };

 useEffect(()=>{if(!started||finished)return;const tick=()=>{if(startedAt.current!==null)setElapsed(Date.now()-startedAt.current);};tick();const t=window.setInterval(tick,250);return()=>window.clearInterval(t)},[started,finished,round]);
 useEffect(()=>{if(ready&&isLong)notifyMilestone(waitSeconds)},[ready,isLong,waitSeconds]);
 useEffect(()=>{const onVisible=()=>{if(document.visibilityState==="visible"&&startedAt.current!==null)setElapsed(Date.now()-startedAt.current);};document.addEventListener("visibilitychange",onVisible);return()=>document.removeEventListener("visibilitychange",onVisible)},[]);

 const begin=()=>{setStarted(true);setFinished(false);setRound(0);setBanked(0);setEarly(0);setElapsed(0);setMilestone(null);lastNotified.current=0;startedAt.current=Date.now();setPreviousBreak(Number(window.localStorage.getItem(LAST_KEY)||0));};
 const bank=()=>{if(!ready)return;if(round>=WAIT_SECONDS.length-1){setBanked(v=>v+1);setFinished(true);startedAt.current=null;return;}setBanked(v=>v+1);setRound(v=>v+1);setElapsed(0);setMilestone(null);lastNotified.current=0;startedAt.current=Date.now();};
 const earlyChoice=()=>{if(ready)return;setEarly(v=>v+1);setRound(v=>Math.min(v+1,WAIT_SECONDS.length-1));setElapsed(0);setMilestone(null);lastNotified.current=0;startedAt.current=Date.now();};
 const closeTraining=()=>{startedAt.current=null;setFinished(true);setElapsed(0);setMilestone(null);};
 const improvement=Math.floor(elapsed/1000)-previousBreak;
 const nextWait=WAIT_SECONDS[Math.min(round+1,WAIT_SECONDS.length-1)];
 const currentPrompt=useMemo(()=>reflectionPrompts[Math.floor(elapsed/15000)%reflectionPrompts.length],[elapsed]);

 return <main className="game-shell">
  <style>{` .reflection-card{width:min(680px,100%);margin:24px auto 18px;padding:22px 24px;border:1px solid #384a25;border-radius:22px;background:radial-gradient(circle at 10% 0%,#c8ff3810,transparent 38%),linear-gradient(145deg,#121a0d,#0b1011);box-shadow:0 18px 55px #0008,inset 0 1px #ffffff0b;text-align:left;transition:box-shadow .3s,border-color .3s}.reflection-card:hover{border-color:#607d35;box-shadow:0 20px 65px #0009,0 0 35px #c8ff3810}.reflection-kicker{display:flex;align-items:center;gap:8px;color:#8ea965;font:700 9px 'Space Grotesk';letter-spacing:.18em}.reflection-pulse{width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 14px #c8ff38;animation:forgePulse 1.8s ease-in-out infinite}.reflection-label{margin-top:13px;color:var(--accent);font:700 12px 'Space Grotesk';letter-spacing:.16em}.reflection-card p{margin:7px 0 14px;color:#e6ebdf;font:600 clamp(17px,2.5vw,22px)/1.35 'Space Grotesk';letter-spacing:-.02em}.reflection-dots{display:flex;gap:5px}.reflection-dots span{width:5px;height:5px;border-radius:50%;background:#33402b}.reflection-dots span.active{width:18px;border-radius:5px;background:var(--accent);box-shadow:0 0 10px #c8ff3866}@keyframes forgePulse{50%{opacity:.35;transform:scale(.75)}}@media(max-width:600px){.reflection-card{padding:18px;margin-top:18px}.reflection-card p{font-size:17px}.reflection-label{font-size:10px}}`}</style>
  <div className="game-topbar"><Link href="/" className="game-back">← FORGE</Link><div className="game-progress">{started&&!finished?`PATIENCE · ${round+1}/${WAIT_SECONDS.length}`:"PATIENCE"}</div></div>
  {!started&&<section className="game-intro"><div className="eyebrow">PATIENCE · DELAYED REWARD</div><h1>Make waiting your advantage.</h1><p>The reward ladder starts at 10 seconds and grows: 30s, 60s, 90s, 3m, 5m, 10m, 20m, 50m, then 1 hour. At the longer milestones, FORGE celebrates the achievement and encourages you to leave the screen.</p><div className="rule-pills"><span>10s → 1 hour</span><span>Long waits unlock milestones</span><span>Phone-away by design</span></div><button className="btn btn-primary" onClick={()=>{begin();requestNotifications();}}>Start Patience</button></section>}
  {started&&!finished&&<section className="game-stage">
    <div className="target-card"><span>REWARD BUILDING · ROUND {round+1}</span><strong>{ready?"FULL REWARD AVAILABLE":"WAIT"}</strong></div>
    <div className="patience-meter"><div className="patience-fill" style={{width:`${Math.min(100,(elapsed/waitMs)*100)}%`}}/></div>
    <div className="patience-value">{ready?"REWARD READY":"NEXT REWARD IN "+formatWait(Math.max(0,Math.ceil((waitMs-elapsed)/1000)))}</div>
    <div className="reflection-card" aria-live="polite"><div className="reflection-kicker"><span className="reflection-pulse" /> USE THE WAIT</div><div className="reflection-label">{currentPrompt.label}</div><p>{currentPrompt.text}</p><div className="reflection-dots">{reflectionPrompts.map((_,i)=><span key={i} className={i===Math.floor(elapsed/15000)%reflectionPrompts.length?"active":""} />)}</div></div>
    <button className={`btn ${ready?"btn-primary":"btn-secondary"} patience-action`} onClick={ready?bank:earlyChoice}>{ready?`Bank reward · next ${formatWait(nextWait)}`:"Take the early option"}</button>
    <div className="live-stats"><span>WAIT <b>{formatWait(waitSeconds)}</b></span><span>BANKED <b>{banked}</b></span><span>EARLY <b>{early}</b></span></div>
    <p className="game-hint">{ready?"You waited. Choose deliberately.":isLong?"You do not need to watch this screen. Put the phone down and return when the reward is ready.":"Notice the urge to reach for the quick reward. Waiting is the challenge."}</p>
    {isLong&&<button className="btn btn-secondary" onClick={closeTraining}>Leave phone & finish training</button>}
  </section>}
  {milestone!==null&&!finished&&<div className="achievement-overlay" role="dialog" aria-modal="true"><div className="achievement-card"><div className="achievement-icon">✦</div><div className="eyebrow">PATIENCE ACHIEVEMENT</div><h2>{formatWait(milestone)} COMPLETE</h2><p>You just practiced staying away from the screen for {formatWait(milestone)}. Screen-heavy habits can make stepping away difficult; this challenge is about practicing the choice to disengage.</p><div className="achievement-badge">MILESTONE · {formatWait(milestone)}</div><p className="benchmark-note">Global percentiles will appear once FORGE has enough anonymized player results to calculate a real benchmark. We will never invent a “top %” result.</p><div className="cta-row"><button className="btn btn-primary" onClick={()=>setMilestone(null)}>Continue challenge</button><button className="btn btn-secondary" onClick={()=>{setMilestone(null);closeTraining();}}>Close FORGE</button></div></div></div>}
  {finished&&<section className="result-card patience-result"><div className="eyebrow">PATIENCE COMPLETE</div><div className="result-score">{banked}</div><div className="result-label">REWARDS BANKED</div><div className="result-stats"><div><strong>{banked}</strong><span>completed waits</span></div><div><strong>{formatWait(WAIT_SECONDS[Math.min(Math.max(banked-1,0),WAIT_SECONDS.length-1)])}</strong><span>highest wait reached</span></div><div><strong>{previousBreak?`${improvement>=0?"+":""}${improvement}s`:"NEW"}</strong><span>vs last phone break</span></div></div><div className="comparison-card"><strong>{previousBreak?"You are competing with your previous self.":"You just created your baseline."}</strong><p>{previousBreak?`Previous phone-away result: ${previousBreak}s. Keep building the ability to leave the screen.`:"Next time, see whether you can create a longer intentional break."}</p></div><p>The objective is not to spend more time inside FORGE. The objective is to become more capable of choosing when to put the phone down.</p><div className="cta-row"><button className="btn btn-primary" onClick={begin}>Run Patience again</button><Link href="/" className="btn btn-secondary">I'm done</Link></div></section>}
 </main>;
}
