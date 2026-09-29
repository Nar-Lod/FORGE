"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const ITEMS = ["●", "■", "▲", "◆", "★", "✚", "✦", "⬟", "⬢", "✿", "☀", "❖"];
const LEVELS = [2, 3, 4, 5, 6, 7, 8];
function shuffle<T>(items: T[]) { return [...items].sort(() => Math.random() - 0.5); }
function makeSet(count = 10) { return shuffle(ITEMS).slice(0, count); }
function rearrangeBoard(board: string[], remembered: string[]) {
  let result = shuffle(board);
  for (let attempt = 0; attempt < 100; attempt++) {
    result = shuffle(board);
    if (remembered.every(item => result.indexOf(item) !== board.indexOf(item))) return result;
  }
  // Deterministic fallback: rotate the board by one slot. Because remembered
  // items are unique, no remembered object remains in its original position.
  return [...board.slice(1), board[0]];
}

export default function ConsistencyChallenge() {
  const [started, setStarted] = useState(false), [finished, setFinished] = useState(false);
  const [level, setLevel] = useState(0), [images, setImages] = useState<string[]>([]);
  const [firstPick, setFirstPick] = useState<string[]>([]), [secondPick, setSecondPick] = useState<string[]>([]);
  const [phase, setPhase] = useState<"first" | "second">("first"), [scores, setScores] = useState<number[]>([]);
  const count = LEVELS[level];
  const selected = phase === "first" ? firstPick : secondPick;
  const shuffledPositions = level >= 4 && phase === "second";

  const beginLevel = (index: number) => { setLevel(index); setImages(makeSet()); setFirstPick([]); setSecondPick([]); setPhase("first"); };
  const start = () => { setStarted(true); setFinished(false); setScores([]); beginLevel(0); };
  const choose = (image: string) => { if (selected.includes(image) || selected.length >= count) return; if (phase === "first") setFirstPick(v => [...v, image]); else setSecondPick(v => [...v, image]); };
  const redo = () => { setImages(rearrangeBoard(images, firstPick)); setSecondPick([]); setPhase("second"); };
  const submit = () => {
    const score = Math.round((secondPick.filter((item, i) => item === firstPick[i]).length / count) * 100);
    const nextScores = [...scores, score]; setScores(nextScores);
    if (level === LEVELS.length - 1) setFinished(true); else beginLevel(level + 1);
  };
  const consistency = useMemo(() => scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0, [scores]);

  return <main className="game-shell">
    <div className="game-topbar"><Link href="/" className="game-back">← FORGE</Link><div className="game-progress">{started&&!finished ? "LEVEL "+(level+1)+"/"+LEVELS.length : "CONSISTENCY"}</div></div>
    {!started && <section className="game-intro"><div className="eyebrow">CONSISTENCY · POSITION-INDEPENDENT MEMORY</div><h1>Remember the objects, not the slots.</h1><p>Choose your own sequence. Then the board is deliberately rearranged so your original order must be reconstructed from the individual shapes themselves.</p><div className="rule-pills"><span>2 → 8 items</span><span>10-object board</span><span>Movement from level 5</span></div><button className="btn btn-primary" onClick={start}>Start Consistency</button></section>}
    {started&&!finished && <section className="game-stage"><div className="target-card"><span>{phase==="first"?"CREATE YOUR PATTERN":"REBUILD YOUR PATTERN"}</span><strong>{selected.length}/{count}</strong></div><p className="game-hint">{phase==="first"?`Choose ${count} different objects in any order. Remember their shape and identity.`:"The remembered objects moved. Find the same objects and tap them in the exact order you created before."}</p><div className="consistency-image-grid">{images.map((image,i)=><button key={image+"-"+i} type="button" className={"consistency-image "+(selected.includes(image)?"selected":"")} onClick={()=>choose(image)} aria-label={"Choose "+image}><span>{image}</span>{selected.includes(image)&&<small>{selected.indexOf(image)+1}</small>}</button>)}</div>{selected.length===count&&phase==="first"&&<button className="btn btn-primary" onClick={redo}>Rearrange board</button>}{selected.length===count&&phase==="second"&&<button className="btn btn-primary" onClick={submit}>Submit sequence</button>}<div className="live-stats"><span>LEVEL <b>{level+1}</b></span><span>ITEMS <b>{count}</b></span><span>PREVIOUS <b>{scores.length?scores[scores.length-1]+"%":"—"}</b></span></div></section>}
    {finished&&<section className="result-card"><div className="eyebrow">CONSISTENCY COMPLETE</div><div className="result-score">{consistency}%</div><div className="result-label">OVERALL CONSISTENCY</div><div className="result-stats">{scores.map((score,i)=><div key={LEVELS[i]}><strong>{score}%</strong><span>{LEVELS[i]}-item match</span></div>)}</div><p>From level 5 onward, every remembered object is guaranteed to move to a different board position.</p><div className="cta-row"><button className="btn btn-primary" onClick={start}>Try again</button><Link href="/" className="btn btn-secondary">I'm done</Link></div></section>}
  </main>;
}
