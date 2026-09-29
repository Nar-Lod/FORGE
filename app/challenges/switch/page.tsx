"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const ROUNDS = 30;
const ITEMS = [
  {name:"SUN",icon:"☀"},{name:"MOON",icon:"●"},{name:"STAR",icon:"★"},{name:"DIAMOND",icon:"◆"},
  {name:"TRIANGLE",icon:"▲"},{name:"SQUARE",icon:"■"},{name:"FLOWER",icon:"✿"},{name:"HEX",icon:"⬢"}
];
const COLORS = ["RED","BLUE","GREEN","YELLOW","PURPLE","ORANGE"];
type Rule = {mode:"tap"|"avoid"; type:"item"|"color"; value:string};
type Stimulus = {id:number; item:string; icon:string; color:string};
function randomOf<T>(a:T[]){return a[Math.floor(Math.random()*a.length)];}
function makeRound(round:number){
  const mode:Rule["mode"] = round>0 && round%3===0 ? "avoid" : Math.random()<.55 ? "tap" : "avoid";
  const type:Rule["type"] = Math.random()<.5 ? "item" : "color";
  const item=randomOf(ITEMS), color=randomOf(COLORS);
  const rule:Rule={mode,type,value:type==="item"?item.name:color};
  const stream:Stimulus[]=Array.from({length:10},(_,id)=>{const candidate=randomOf(ITEMS);return {id,item:candidate.name,icon:candidate.icon,color:randomOf(COLORS)}});
  for(let i=0;i<stream.length;i++){
    const hit=i===4||i===8||i===(round%10);
    if(hit){stream[i]=type==="color"?{id,item:randomOf(ITEMS).name,icon:randomOf(ITEMS).icon,color:rule.value}:{id,item:rule.value,icon:ITEMS.find(x=>x.name===rule.value)?.icon||item.icon,color:randomOf(COLORS)};}
  }
  return {rule,stream};
}
function matches(s:Stimulus,r:Rule){return r.type==="item"?s.item===r.value:s.color===r.value;}

export default function SwitchChallenge(){
 const[started,setStarted]=useState(false),[finished,setFinished]=useState(false),[round,setRound]=useState(0),[rule,setRule]=useState<Rule|null>(null),[stream,setStream]=useState<Stimulus[]>([]),[index,setIndex]=useState(0),[armed,setArmed]=useState(false),[correct,setCorrect]=useState(0),[mistakes,setMistakes]=useState(0),[misses,setMisses]=useState(0),[streak,setStreak]=useState(0),[bestStreak,setBestStreak]=useState(0),[last,setLast]=useState<"hit"|"miss"|null>(null);
 const current=stream[index];
 const startRound=(n:number)=>{const r=makeRound(n);setRule(r.rule);setStream(r.stream);setIndex(0);setArmed(false);setLast(null);window.setTimeout(()=>setArmed(true),650);};
 const begin=()=>{setStarted(true);setFinished(false);setRound(0);setCorrect(0);setMistakes(0);setMisses(0);setStreak(0);setBestStreak(0);startRound(0);};
 useEffect(()=>{if(!started||finished||!armed||!current||!rule)return;const t=window.setTimeout(()=>{if(matches(current,rule)){setMisses(v=>v+1);setStreak(0);setLast("miss");}advance();},900);return()=>window.clearTimeout(t)},[index,armed,started,finished,current,rule]);
 const advance=()=>{setArmed(false);if(index>=stream.length-1){if(round>=ROUNDS-1){setFinished(true);return;}const n=round+1;setRound(n);startRound(n);}else{const next=index+1;setIndex(next);window.setTimeout(()=>setArmed(true),220+Math.random()*500);}};
 const choose=()=>{if(!armed||finished||!current||!rule)return;const shouldTap=matches(current,rule);const success=rule.mode==="tap"?shouldTap:!shouldTap;if(success){setCorrect(v=>v+1);setStreak(v=>{const n=v+1;setBestStreak(b=>Math.max(b,n));return n});setLast("hit");}else{setMistakes(v=>v+1);setStreak(0);setLast("miss");}advance();};
 const ruleText=rule?(rule.mode==="tap"?(rule.type==="item"?`TAP ONLY: ${rule.value}`:`TAP ONLY: ${rule.value} ITEMS`):(rule.type==="item"?`DO NOT TAP: ${rule.value}`:`DO NOT TAP: ${rule.value} ITEMS`)):"LOADING RULE";
 const score=useMemo(()=>finished?Math.max(0,Math.min(100,Math.round((correct/ROUNDS)*65+(bestStreak/ROUNDS)*35-(mistakes+misses)*1.5))):0,[finished,correct,bestStreak,mistakes,misses]);
 useEffect(()=>{if(!finished)return;let previous:[string,number][]=[["Focus",0],["Control",0],["Patience",0],["Persistence",0],["Consistency",0]];try{previous=JSON.parse(window.localStorage.getItem("forge.metrics")||JSON.stringify(previous))}catch{}window.localStorage.setItem("forge.metrics",JSON.stringify(previous.map(([n,v])=>n==="Control"?[n,Math.max(v,score)]:[n,v])));},[finished,score]);
 return <main className="game-shell"><div className="game-topbar"><Link href="/" className="game-back">← FORGE</Link><div className="game-progress">{started&&!finished?`ROUND ${round+1}/${ROUNDS}`:"CONTROL"}</div></div>
 {!started&&<section className="game-intro"><div className="eyebrow">CONTROL · IMPULSE INHIBITION</div><h1>Don't trust your first impulse.</h1><p>Objects flash onto the field and disappear. Sometimes you must tap a target. Sometimes you must refuse it. Rules change, near-misses appear, and missed actions count too.</p><div className="rule-pills"><span>TAP rules</span><span>DO NOT TAP rules</span><span>30 rounds · changing signals</span></div><button className="btn btn-primary" onClick={begin}>Start Control</button></section>}
 {started&&!finished&&rule&&current&&<section className="game-stage control-stage"><div className={`target-card control-rule ${armed?"armed":"waiting"}`}><span>{armed?"LIVE SIGNAL":"GET READY"}</span><strong>{ruleText}</strong></div><div className={`control-field ${armed?"active":""}`} onClick={choose}>{armed?<div className={`control-stimulus ${current.color.toLowerCase()}`}><span>{current.icon}</span><small>{current.item}</small></div>:<div className="signal-wait">WAIT</div>}</div><div className="live-stats"><span>ROUND <b>{round+1}</b></span><span>CLEAN <b>{correct}</b></span><span>ERRORS <b>{mistakes+misses}</b></span><span>STREAK <b>{streak}</b></span></div><p className="game-hint">{last==="hit"?"Good control. Read the next rule before the next signal.":last==="miss"?"The impulse won this round. Reset, read the rule, and try the next signal.":rule.mode==="avoid"?"The hardest part may be doing nothing. Do not tap the instructed target.":"Tap only when the instructed target appears."}</p></section>}
 {finished&&<section className="result-card"><div className="eyebrow">CONTROL COMPLETE</div><div className="result-score">{score}</div><div className="result-label">CONTROL SCORE</div><div className="result-stats"><div><strong>{correct}</strong><span>clean decisions</span></div><div><strong>{mistakes}</strong><span>wrong taps</span></div><div><strong>{misses}</strong><span>missed targets</span></div><div><strong>{bestStreak}</strong><span>best streak</span></div></div><p>Control is not simply reacting quickly. It is noticing the rule, resisting the automatic response, and acting—or deliberately not acting—when the signal demands it.</p><div className="cta-row"><button className="btn btn-primary" onClick={begin}>Try again</button><Link href="/" className="btn btn-secondary">I'm done</Link></div></section>}
 </main>;
}
