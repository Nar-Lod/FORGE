"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { recordEvent, startForgeSession, updateSkillModel } from "../../../lib/forge-analytics";
import { difficultySnapshot } from "../../../lib/forge-adaptive";
import { recordForgeSessionCompletion } from "../../../lib/forge-experience";

const ROUNDS = 24;
const ITEMS = [
  {name:"SUN",icon:"☀"},{name:"MOON",icon:"●"},{name:"STAR",icon:"★"},{name:"DIAMOND",icon:"◆"},
  {name:"TRIANGLE",icon:"▲"},{name:"SQUARE",icon:"■"},{name:"FLOWER",icon:"✿"},{name:"HEX",icon:"⬢"}
];
const COLORS = ["RED","BLUE","GREEN","YELLOW","PURPLE","ORANGE"];
type Rule = {mode:"tap"|"avoid"; type:"item"|"color"|"pair"; value:string; secondary?:string};
type Stimulus = {id:number; item:string; icon:string; color:string};
function randomOf<T>(a:T[]){return a[Math.floor(Math.random()*a.length)];}
function makeRound(round:number){
  const stage=Math.floor(round/6);
  const pair=stage>=2;
  const mode:Rule["mode"] = stage===1||stage===3 ? "avoid" : "tap";
  const type:Rule["type"] = pair ? "pair" : (Math.random()<.5 ? "item" : "color");
  const item=randomOf(ITEMS), color=randomOf(COLORS);
  const rule:Rule={mode,type,value:type==="item"?item.name:color,secondary:pair?item.name:undefined};
  const stream:Stimulus[]=Array.from({length:12},(_,id)=>{const candidate=randomOf(ITEMS);return {id,item:candidate.name,icon:candidate.icon,color:randomOf(COLORS)}});
  const positions=[3,7,10];
  positions.forEach((i)=>{
    const hit=(i+round)%3!==0;
    if(type==="pair"){
      stream[i]=hit
        ? {id:i,item:rule.secondary!,icon:ITEMS.find(x=>x.name===rule.secondary)?.icon||item.icon,color:rule.value}
        : {id:i,item:rule.secondary!,icon:ITEMS.find(x=>x.name===rule.secondary)?.icon||item.icon,color:randomOf(COLORS.filter(x=>x!==rule.value))};
    } else if(type==="color"){
      stream[i]={id:i,item:randomOf(ITEMS).name,icon:randomOf(ITEMS).icon,color:hit?rule.value:randomOf(COLORS.filter(x=>x!==rule.value))};
    } else {
      stream[i]={id:i,item:hit?rule.value:randomOf(ITEMS.filter(x=>x.name!==rule.value)).name,icon:hit?(ITEMS.find(x=>x.name===rule.value)?.icon||item.icon):randomOf(ITEMS).icon,color:randomOf(COLORS)};
    }
  });
  return {rule,stream};
}
function matches(s:Stimulus,r:Rule){
  if(r.type==="pair") return s.item===r.secondary && s.color===r.value;
  return r.type==="item"?s.item===r.value:s.color===r.value;
}

export default function SwitchChallenge(){
 const completionRecorded=useRef(false);\n const[started,setStarted]=useState(false),[finished,setFinished]=useState(false),[quit,setQuit]=useState(false),[round,setRound]=useState(0),[rule,setRule]=useState<Rule|null>(null),[stream,setStream]=useState<Stimulus[]>([]),[index,setIndex]=useState(0),[armed,setArmed]=useState(false),[correct,setCorrect]=useState(0),[mistakes,setMistakes]=useState(0),[misses,setMisses]=useState(0),[streak,setStreak]=useState(0),[bestStreak,setBestStreak]=useState(0),[last,setLast]=useState<"hit"|"miss"|null>(null),[sessionId,setSessionId]=useState("");
 const current=stream[index];
 const speedBoosted=correct>=13;
 const signalWindowMs=speedBoosted?720:900;
 const startRound=(n:number)=>{const r=makeRound(n);setRule(r.rule);setStream(r.stream);setIndex(0);setArmed(false);setLast(null);window.setTimeout(()=>setArmed(true),650);};
 const begin=()=>{
 setStarted(true);setFinished(false);completionRecorded.current=false;setRound(0);setCorrect(0);setMistakes(0);setMisses(0);setStreak(0);setBestStreak(0);
 const nextSession=startForgeSession("control","control",{rounds:ROUNDS,design:"rule-switch-interference-v1"});
 setSessionId(nextSession);
 startRound(0);
};
 useEffect(()=>{if(!started||finished||!armed||!current||!rule)return;const t=window.setTimeout(()=>{if(matches(current,rule)){setMisses(v=>v+1);setStreak(0);setLast("miss");}advance();},signalWindowMs);return()=>window.clearTimeout(t)},[index,armed,started,finished,current,rule,signalWindowMs]);
 const advance=()=>{setArmed(false);if(index>=stream.length-1){if(round>=ROUNDS-1){setFinished(true);return;}const n=round+1;setRound(n);startRound(n);}else{const next=index+1;setIndex(next);window.setTimeout(()=>setArmed(true),220+Math.random()*500);}};
 const choose=()=>{if(!armed||finished||!current||!rule)return;const shouldTap=matches(current,rule);const success=rule.mode==="tap"?shouldTap:!shouldTap;
   if(sessionId){
     recordEvent({
       sessionId,
       skill:"control",
       game:"control",
       event:"trial_completed",
       difficulty:difficultySnapshot(1),
       payload:{success,mode:rule.mode,type:rule.type,correctTarget:shouldTap}
     });
     if(!success) recordEvent({
       sessionId,
       skill:"control",
       game:"control",
       event:"mistake",
       difficulty:difficultySnapshot(1)
     });
   }if(success){setCorrect(v=>v+1);setStreak(v=>{const n=v+1;setBestStreak(b=>Math.max(b,n));return n});setLast("hit");}else{setMistakes(v=>v+1);setStreak(0);setLast("miss");}advance();};
 const ruleText=rule?(rule.mode==="tap"
 ?(rule.type==="pair"?`TAP ONLY: ${rule.value} + ${rule.secondary}`:(rule.type==="item"?`TAP ONLY: ${rule.value}`:`TAP ONLY: ${rule.value} ITEMS`))
 :(rule.type==="pair"?`DO NOT TAP: ${rule.value} + ${rule.secondary}`:(rule.type==="item"?`DO NOT TAP: ${rule.value}`:`DO NOT TAP: ${rule.value} ITEMS`))):"LOADING RULE";
 const score=useMemo(()=>finished?Math.max(0,Math.min(100,Math.round((correct/ROUNDS)*65+(bestStreak/ROUNDS)*35-(mistakes+misses)*1.5))):0,[finished,correct,bestStreak,mistakes,misses]);
 useEffect(()=>{
   if(!finished||!sessionId)return;
   const performance=Math.max(0,Math.min(1,correct/Math.max(1,correct+mistakes+misses)));
   updateSkillModel("control",performance,1,performance>=0.85);
   recordEvent({
     sessionId,
     skill:"control",
     game:"control",
     event:"session_completed",
     difficulty:difficultySnapshot(1),
     payload:{score,performance,correct,mistakes,misses,bestStreak,endedEarly:quit,cleanSpeedBoostTriggered:speedBoosted}
   });
 },[finished,sessionId,score,correct,mistakes,misses,bestStreak,quit,speedBoosted]);
 return <main className="game-shell"><div className="game-topbar"><Link href="/" className="game-back">← FORGE</Link><div className="game-progress">{started&&!finished?`ROUND ${round+1}/${ROUNDS}`:"CONTROL"}</div></div>
 {!started&&<section className="game-intro"><div className="eyebrow">CONTROL · IMPULSE INHIBITION</div><h1>Don't trust your first impulse.</h1><p>The rule changes as you progress. Sometimes one feature decides; later, color and shape must agree. Near-misses are deliberately designed to trigger the wrong first response.</p><div className="rule-pills"><span>4 rule stages</span><span>Single + paired rules</span><span>Near-miss signals</span><span>24 rounds</span></div><button className="btn btn-primary" onClick={begin}>Start Control</button></section>}
 {started&&!finished&&rule&&current&&<section className="game-stage control-stage"><div className={`target-card control-rule ${armed?"armed":"waiting"}`}><span>{armed?"LIVE SIGNAL":"GET READY"}</span><strong>{ruleText}</strong>{speedBoosted&&<small>PRECISION SPEED · 1.25×</small>}</div><div className={`control-field ${armed?"active":""}`} onClick={choose}>{armed?<div className={`control-stimulus ${current.color.toLowerCase()}`}><span>{current.icon}</span><small>{current.item}</small></div>:<div className="signal-wait">WAIT</div>}</div><div className="live-stats"><span>ROUND <b>{round+1}</b></span><span>CLEAN <b>{correct}</b></span><span>ERRORS <b>{mistakes+misses}</b></span><span>STREAK <b>{streak}</b></span></div><p className="game-hint">{last==="hit"?"Good control. Read the next rule before the next signal.":last==="miss"?"The impulse won this round. Reset, read the rule, and try the next signal.":rule.mode==="avoid"?"The hardest part may be doing nothing. Do not tap the instructed target.":"Tap only when the instructed target appears."}</p><div className="cta-row"><button className="btn btn-secondary" onClick={()=>{setFinished(true);setQuit(true);}}>End session & see result</button></div></section>}
 {finished&&<section className="result-card"><div className="eyebrow">{quit?"SESSION ENDED":"CONTROL COMPLETE"}</div><div className="result-score">{score}</div><div className="result-label">CONTROL SCORE</div><div className="result-stats"><div><strong>{correct}</strong><span>clean decisions</span></div><div><strong>{mistakes}</strong><span>wrong taps</span></div><div><strong>{misses}</strong><span>missed targets</span></div><div><strong>{bestStreak}</strong><span>best streak</span></div></div><p>{quit?"You stopped this run deliberately. Your result is preserved so the next session has something concrete to beat.":"Control is not simply reacting quickly. It is noticing the rule, resisting the automatic response, and acting—or deliberately not acting—when the signal demands it."}</p><div className="cta-row"><button className="btn btn-primary" onClick={begin}>Try again</button><Link href="/" className="btn btn-secondary">I'm done</Link></div></section>}
 </main>;
}
