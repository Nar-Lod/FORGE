"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const LEVELS = [5, 6, 7, 8, 9, 10, 11, 12];
const SHAPES = ["●", "■", "▲", "◆", "⬟", "⬢", "★", "✚", "✦", "⬣", "✿", "☀"];
const COLORS = ["red", "blue", "green", "yellow", "purple", "orange"];
type Item = { id: string; shape: string; color: string };
function makeSequence(length: number): Item[] {
  const combos: Item[] = [];
  for (const color of COLORS) for (const shape of SHAPES) combos.push({ id: `${color}-${shape}`, shape, color });
  return combos.sort(() => Math.random() - 0.5).slice(0, length);
}
function same(a:Item,b:Item){return a.id===b.id;}

export default function PersistenceChallenge(){
 const[started,setStarted]=useState(false),[showing,setShowing]=useState(false),[finished,setFinished]=useState(false),[level,setLevel]=useState(0),[sequence,setSequence]=useState<Item[]>([]),[answer,setAnswer]=useState<Item[]>([]),[score,setScore]=useState(0),[best,setBest]=useState(0),[wrong,setWrong]=useState(0),[submitted,setSubmitted]=useState(false);
 const length=LEVELS[level], manual=level<4;
 const newLevel=()=>{const seq=makeSequence(length);setSequence(seq);setAnswer([]);setSubmitted(false);setShowing(true);};
 const begin=()=>{setStarted(true);setFinished(false);setLevel(0);setScore(0);setWrong(0);window.setTimeout(newLevel,100);};
 useEffect(()=>{if(!started||!showing||manual)return;const ms=5500+length*650;const t=window.setTimeout(()=>setShowing(false),ms);return()=>window.clearTimeout(t);},[started,showing,manual,length]);
 const arrange=()=>setShowing(false);
 const choose=(item:Item)=>{if(showing||finished||submitted||answer.length>=length)return;if(answer.some(x=>same(x,item)))return;setAnswer(v=>[...v,item]);};
 const submit=()=>{
   if(answer.length!==length)return;
   setSubmitted(true);
   const ok=answer.every((v,i)=>same(v,sequence[i]));
   if(ok){const ns=score+length*10;setScore(ns);if(level===LEVELS.length-1){setBest(Math.max(best,ns));setFinished(true);}else{setLevel(v=>v+1);window.setTimeout(newLevel,900);}}
   else {setWrong(v=>v+1);}
 };
 const correctCount=answer.reduce((n,v,i)=>n+(same(v,sequence[i])?1:0),0);
 const options=useMemo(()=>{
   const decoys=makeSequence(Math.min(8,Math.max(3,length-2))).filter(x=>!sequence.some(s=>same(s,x)));
   return [...sequence,...decoys].sort(()=>Math.random()-.5);
 },[sequence,length]);
 useEffect(()=>{setBest(Number(window.localStorage.getItem("forge.persistence.best")||0));},[]);
 useEffect(()=>{if(finished)window.localStorage.setItem("forge.persistence.best",String(Math.max(best,score)));},[finished,best,score]);
 return <main className="game-shell"><div className="game-topbar"><Link href="/" className="game-back">← FORGE</Link><div className="game-progress">{started&&!finished?`LEVEL ${level+1}/8`:"PERSISTENCE"}</div></div>
 {!started&&<section className="game-intro"><div className="eyebrow">PERSISTENCE · SEQUENCE MEMORY</div><h1>Remember. Arrange. Adapt.</h1><p>Levels 1–4 let you study the complete sequence as long as you need. You decide when you are ready. From level 5 onward, the complete sequence is shown with a longer timed viewing window, then disappears automatically.</p><div className="rule-pills"><span>5 → 12 unique items</span><span>Arrange when ready</span><span>Timed from level 5</span></div><button className="btn btn-primary" onClick={begin}>Start Persistence</button></section>}
 {started&&!finished&&<section className="game-stage"><div className="target-card"><span>{showing?"MEMORIZE":"REBUILD"}</span><strong>{showing?`${length} ITEMS`: `${answer.length}/${length}`}</strong></div><div className="focus-grid sequence-grid">{showing?sequence.map((x,i)=><div key={x.id} className={`focus-cell sequence-cell ${x.color}`}><span>{x.shape}</span></div>):answer.map((x,i)=><div key={x.id} className={`focus-cell sequence-cell ${x.color}`}><span>{x.shape}</span></div>)}</div>{showing&&manual&&<button className="btn btn-primary" onClick={arrange}>Arrange</button>}{!showing&&<><div className="option-grid">{options.map(x=><button key={x.id} disabled={submitted} className={`switch-tile sequence-option ${x.color}`} onClick={()=>choose(x)}><span>{x.shape}</span></button>)}</div><button className="btn btn-primary" disabled={answer.length!==length||submitted} onClick={submit}>{submitted?"Submitted":"Submit arrangement"}</button>{submitted&&correctCount<length&&<p className="game-hint">Not quite. You placed {correctCount}/{length} correctly. You can correct your order below, then submit again.</p>}{submitted&&correctCount<length&&<div className="correction-row">{answer.map((x,i)=><button key={`${x.id}-${i}`} className="correction-slot" onClick={()=>{const replacement=options.find(o=>!answer.some(a=>a.id===o.id));if(replacement)setAnswer(v=>v.map((a,j)=>j===i?replacement:a));setSubmitted(false);}}><span>{x.shape}</span><small>slot {i+1} · replace</small></button>)}</div>}</>}</div><div className="live-stats"><span>LEVEL <b>{level+1}</b></span><span>SCORE <b>{score}</b></span><span>MISSES <b>{wrong}</b></span></div><p className="game-hint">{showing?(manual?"Study all items and their exact order. Press Arrange only when you are ready.":"Study the complete sequence. It will disappear automatically."):"Build the exact sequence, then submit it. A wrong attempt stays on this level so you can correct and learn."}</p></section>}
 {finished&&<section className="result-card"><div className="eyebrow">PERSISTENCE COMPLETE</div><div className="result-score">{score}</div><div className="result-label">MEMORY PERSISTENCE SCORE</div><div className="result-stats"><div><strong>8</strong><span>levels cleared</span></div><div><strong>{wrong}</strong><span>misses</span></div><div><strong>{best}</strong><span>best score</span></div></div><p>You progressed from deliberate study into timed memory pressure while adapting to longer sequences.</p><div className="cta-row"><button className="btn btn-primary" onClick={begin}>Try again</button><Link href="/" className="btn btn-secondary">I'm done</Link></div></section>}
 </main>;
}
