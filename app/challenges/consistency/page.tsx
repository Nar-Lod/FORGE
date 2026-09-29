"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const ITEMS = ["●", "■", "▲", "◆", "★", "✚", "✦", "⬟", "⬢", "✿", "☀", "❖"];
const LEVELS = [2, 3, 4, 5, 6, 7, 8];

function shuffle<T>(items: T[]) { return [...items].sort(() => Math.random() - 0.5); }
function shuffledDifferent<T>(items: T[]) {
  if (items.length < 2) return items;
  let result = shuffle(items);
  let attempts = 0;
  while (result.every((item, i) => item === items[i]) && attempts < 12) { result = shuffle(items); attempts++; }
  return result;
}
function makeSet(count = 10) { return shuffle(ITEMS).slice(0, count); }

export default function ConsistencyChallenge() {
  const [started, setStarted] = useState(false), [finished, setFinished] = useState(false);
  const [level, setLevel] = useState(0), [images, setImages] = useState<string[]>([]);
  const [firstPick, setFirstPick] = useState<string[]>([]), [secondPick, setSecondPick] = useState<string[]>([]);
  const [phase, setPhase] = useState<"first" | "second">("first"), [scores, setScores] = useState<number[]>([]);
  const count = LEVELS[level];
  const selected = phase === "first" ? firstPick : secondPick;
  const shuffledPositions = level >= 5 && phase === "second";

  const beginLevel = (index: number) => { setLevel(index); setImages(makeSet()); setFirstPick([]); setSecondPick([]); setPhase("first"); };
  const start = () => { setStarted(true); setFinished(false); setScores([]); beginLevel(0); };
  const choose = (image: string) => { if (selected.includes(image) || selected.length >= count) return; if (phase === "first") setFirstPick(v => [...v, image]); else setSecondPick(v => [...v, image]); };
  const redo = () => {
    if (shuffledPositions) setImages(shuffledDifferent(images));
    setSecondPick([]); setPhase("second");
  };
  const submit = () => {
    const score = Math.round((secondPick.filter((item, i) => item === firstPick[i]).length / count) * 100);
    const nextScores = [...scores, score]; setScores(nextScores);
    if (level === LEVELS.length - 1) setFinished(true); else beginLevel(level + 1);
  };
  const consistency = useMemo(() => scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0, [scores]);

  return <main className="game-shell">
    <div className="game-topbar"><Link href="/" className="game-back">← FORGE</Link><div className="game-progress">{started&&!finished ? "LEVEL "+(level+1)+"/"+LEVELS.length : "CONSISTENCY"}</div></div>
    {!started && <section className="game-intro"><div className="eyebrow">CONSISTENCY · PROGRESSIVE MEMORY</div><h1>Build your consistency, one step at a time.</h1><p>Start with 2 images and build toward 8. First create your own order. At later levels, the whole board changes position before you reproduce that same order.</p><div className="rule-pills"><span>2 → 8 items</span><span>10-image board</span><span>Position shuffle from level 6</span></div><button className="btn btn-primary" onClick={start}>Start Consistency</button></section>}
    {started&&!finished && <section className="game-stage"><div className="target-card"><span>{phase==="first"?"CHOOSE YOUR ORDER":shuffledPositions?"REBUILD YOUR ORDER":"REPEAT YOUR ORDER"}</span><strong>{selected.length}/{count}</strong></div><p className="game-hint">{phase==="first"?"Choose "+count+" images from the 10-image board in any order. Your order becomes the pattern.":shuffledPositions?"The entire board has been rearranged. Find the same images and select them in the exact order you created before.":"Repeat the exact same images in the same order. There is no speed test."}</p><div className="consistency-image-grid">{images.map((image,i)=><button key={image+"-"+i} type="button" className={"consistency-image "+(selected.includes(image)?"selected":"")} onClick={()=>choose(image)} aria-label={"Choose "+image}><span>{image}</span>{selected.includes(image)&&<small>{selected.indexOf(image)+1}</small>}</button>)}</div>{selected.length===count&&phase==="first"&&<button className="btn btn-primary" onClick={redo}>{shuffledPositions?"Shuffle board & rebuild":"Repeat the order"}</button>}{selected.length===count&&phase==="second"&&<button className="btn btn-primary" onClick={submit}>Check consistency</button>}<div className="live-stats"><span>LEVEL <b>{level+1}</b></span><span>ITEMS <b>{count}</b></span><span>PREVIOUS <b>{scores.length?scores[scores.length-1]+"%":"—"}</b></span></div></section>}
    {finished&&<section className="result-card"><div className="eyebrow">CONSISTENCY COMPLETE</div><div className="result-score">{consistency}%</div><div className="result-label">OVERALL CONSISTENCY</div><div className="result-stats">{scores.map((score,i)=><div key={LEVELS[i]}><strong>{score}%</strong><span>{LEVELS[i]}-item match</span></div>)}</div><p>You progressed from 2 items to 8. From level 6 onward, the entire board is shuffled before you reproduce your original sequence.</p><div className="cta-row"><button className="btn btn-primary" onClick={start}>Try again</button><Link href="/" className="btn btn-secondary">I'm done</Link></div></section>}
  </main>;
}
