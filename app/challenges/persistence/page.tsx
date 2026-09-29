"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const LEVELS = [5, 6, 7, 8, 9, 10, 11, 12];
const SHAPES = ["●", "■", "▲", "◆", "⬟", "⬢", "★", "✚", "✦", "⬣", "✿", "☀"];
const COLORS = ["red", "blue", "green", "yellow", "purple", "orange"];
type Item = { shape: string; color: string };
function makeSequence(length: number): Item[] { return Array.from({length},()=>({shape:SHAPES[Math.floor(Math.random()*SHAPES.length)],color:COLORS[Math.floor(Math.random()*COLORS.length)]})); }
function same(a:Item,b:Item){return a.shape===b.shape&&a.color===b.color;}

export default function PersistenceChallenge(){
 const[started,setStarted]=useState(false),[showing,setShowing]=useState(false),[finished,setFinished]=useState(false),[level,setLevel]=useState(0),[sequence,setSequence]=useState<Item[]>([]),[answer,setAnswer]=useState<Item[]>([]),[score,setScore]=useState(0),[best,setBest]=useState(0),[wrong,setWrong]=useState(0);
 const length=LEVELS[level], manual=level<4;
 const newLevel=()=>{const seq=makeSequence(length);setSequence(seq);setAnswer([]);setShowing(true);};
 const begin=()=>{setStarted(true);setFinished(false);setLevel(0);setScore(0);setWrong(0);window.setTimeout(newLevel,100);};
 useEffect(()=>{if(!started||!showing||manual)return;const ms=3500+length*500;const t=window.setTimeout(()=>setShowing(false),ms);return()=>window.clearTimeout(t);},[started,showing,manual,length]);
 const arrange=()=>setShowing(false);
 const choose=(item:Item)=>{if(showing||finished||answer.length>=length)return;const next=[...answer,item];setAnswer(next);if(next.length===length){const ok=next.every((v,i)=>same(v,sequence[i]));if(ok){const ns=score+length*10;setScore(ns);if(level===LEVELS.length-1){setBest(Math.max(best,ns));setFinished(true);}else{setLevel(v=>v+1);window.setTimeout(newLevel,650);}}else{setWrong(v=>v+1);if(level===0)setFinished(true);else{setLevel(v=>v-1);window.setTimeout(newLevel,650);}}}};
 const options=useMemo(()=>{const decoys=makeSequence(Math.max(6,Math.min(10,length)));return [...sequence,...decoys].sort(()=>Math.random()-.5).slice(0,Math.min(10,sequence.length+decoys.length));},[sequence,length]);
 useEffect(()=>{const old=Number(window.localStorage.getItem("forge.persistence.best")||0);setBest(old);},[]);
 useEffect(()=>{if(finished)window.localStorage.setItem("forge.persistence.best",String(Math.max(best,score)));},[finished,best,score]);
 return <main className="game-shell"><div className="game-topbar"><Link href="/" className="game-back">← FORGE</Link><div className="game-progress">{started&&!finished?`LEVEL ${level+1}/8`:"PERSISTENCE"}</div></div>
 {!started&&<section className="game-intro"><div className="eyebrow">PERSISTENCE · SEQUENCE MEMORY</div><h1>Remember. Arrange. Adapt.</h1><p>Levels 1–4 let you study the sequence as long as you need, then press Arrange when you are ready. From level 5 onward, the sequence disappears automatically after a longer, progressive viewing window.</p><div className="rule-pills"><span>5 → 12 items</span><span>Arrange when ready</span><span>Timed from level 5</span></div><button className="btn btn-primary" onClick={begin}>Start Persistence</button></section>}
 {started&&!finished&&<section className="game-stage"><div className="target-card"><span>{showing?"MEMORIZE":"REBUILD"}</span><strong>{showing?`${length} ITEMS`: `${answer.length}/${length}`}</strong></div><div className="focus-grid sequence-grid">{showing?sequence.map((x,i)=><div key={i} className={`focus-cell sequence-cell ${x.color}`}><span>{x.shape}</span></div>):answer.map((x,i)=><div key={i} className={`focus-cell sequence-cell ${x.color}`}><span>{x.shape}</span></div>)}</div>{showing&&manual&&<button className="btn btn-primary" onClick={arrange}>Arrange</button>}{!showing&&<div className="option-grid">{options.map((x,i)=><button key={i} className={`switch-tile sequence-option ${x.color}`} onClick={()=>choose(x)}><span>{x.shape}</span></button>)}</div>}<div className="live-stats"><span>LEVEL <b>{level+1}</b></span><span>SCORE <b>{score}</b></span><span>MISSES <b>{wrong}</b></span></div><p className="game-hint">{showing?(manual?"Study the exact order. When you are ready, press Arrange.":"Study the exact order. It will disappear automatically."):"Rebuild the exact sequence. A mistake is information—slow down, adapt, and try again."}</p></section>}
 {finished&&<section className="result-card"><div className="eyebrow">PERSISTENCE COMPLETE</div><div className="result-score">{score}</div><div className="result-label">MEMORY PERSISTENCE SCORE</div><div className="result-stats"><div><strong>{level+1}</strong><span>highest level</span></div><div><strong>{wrong}</strong><span>misses</span></div><div><strong>{best}</strong><span>best score</span></div></div><p>{level>=4?"You adapted as the sequence became longer and the viewing window became time-limited.":"You built a foundation before the timed levels began."}</p><div className="cta-row"><button className="btn btn-primary" onClick={begin}>Try again</button><Link href="/" className="btn btn-secondary">I'm done</Link></div></section>}
 </main>;
}
