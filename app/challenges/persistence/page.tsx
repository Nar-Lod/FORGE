"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const LEVELS = [5, 6, 7, 8, 9, 10, 11, 12];
const SHAPES = ["●", "■", "▲", "◆", "⬟", "⬢", "★", "✚", "✦", "⬣", "✿", "☀"];
const COLORS = ["red", "blue", "green", "yellow", "purple", "orange"];

type Item = { shape: string; color: string };
function makeSequence(length: number): Item[] {
  return Array.from({ length }, (_, i) => ({ shape: SHAPES[Math.floor(Math.random() * SHAPES.length)], color: COLORS[(i * 3 + Math.floor(Math.random() * COLORS.length)) % COLORS.length] }));
}

export default function PersistenceChallenge() {
  const [started, setStarted] = useState(false), [showing, setShowing] = useState(false), [finished, setFinished] = useState(false);
  const [level, setLevel] = useState(0), [sequence, setSequence] = useState<Item[]>([]), [answer, setAnswer] = useState<Item[]>([]);
  const [score, setScore] = useState(0), [best, setBest] = useState(0), [wrong, setWrong] = useState(0);
  const length = LEVELS[level];
  const newLevel = () => { const seq = makeSequence(LEVELS[level]); setSequence(seq); setAnswer([]); setShowing(true); window.setTimeout(() => setShowing(false), 1100 + LEVELS[level] * 130); };
  const begin = () => { setStarted(true); setFinished(false); setLevel(0); setScore(0); setWrong(0); window.setTimeout(newLevel, 100); };
  const choose = (item: Item) => { if (showing || finished || answer.length >= length) return; const next = [...answer, item]; setAnswer(next); if (next.length === length) { const ok = next.every((v, i) => v.shape === sequence[i].shape && v.color === sequence[i].color); if (ok) { const nextScore = score + length * 10; setScore(nextScore); if (level === LEVELS.length - 1) { setBest(Math.max(best, nextScore)); setFinished(true); } else { setLevel(v => v + 1); window.setTimeout(newLevel, 500); } } else { setWrong(v => v + 1); if (level === 0) { setFinished(true); } else { setLevel(v => v - 1); window.setTimeout(newLevel, 500); } } } };
  const options = useMemo(() => { const pool = [...sequence, ...makeSequence(Math.max(6, Math.min(10, length)))]; return pool.sort(() => Math.random() - .5).slice(0, Math.min(10, pool.length)); }, [sequence, length]);
  useEffect(() => { const old = Number(window.localStorage.getItem("forge.persistence.best") || 0); setBest(old); }, []);
  useEffect(() => { if (finished) window.localStorage.setItem("forge.persistence.best", String(Math.max(best, score))); }, [finished, best, score]);
  return <main className="game-shell"><div className="game-topbar"><Link href="/" className="game-back">← FORGE</Link><div className="game-progress">{started && !finished ? `LEVEL ${level + 1}/8` : "PERSISTENCE"}</div></div>
    {!started && <section className="game-intro"><div className="eyebrow">PERSISTENCE · SEQUENCE MEMORY</div><h1>Build the pattern. Recover when it breaks.</h1><p>Study a sequence of shapes, then rebuild it from memory. Each level adds another item. If you fail, the challenge steps back and gives you another chance to adapt.</p><div className="rule-pills"><span>5 → 12 items</span><span>Visual memory</span><span>Recover & adapt</span></div><button className="btn btn-primary" onClick={begin}>Start Persistence</button></section>}
    {started && !finished && <section className="game-stage"><div className="target-card"><span>{showing ? "MEMORIZE" : "REBUILD"}</span><strong>{showing ? `${length} ITEMS` : `${answer.length}/${length}`}</strong></div><div className="focus-grid sequence-grid">{(showing ? sequence : answer).map((x,i)=><div key={i} className={`focus-cell sequence-cell ${x.color}`}><span>{x.shape}</span></div>)}</div>{!showing && <div className="option-grid">{options.map((x,i)=><button key={i} className={`switch-tile sequence-option ${x.color}`} onClick={()=>choose(x)}><span>{x.shape}</span></button>)}</div>}<div className="live-stats"><span>LEVEL <b>{level + 1}</b></span><span>SCORE <b>{score}</b></span><span>MISSES <b>{wrong}</b></span></div><p className="game-hint">{showing ? "Look carefully. The order matters." : "Rebuild the exact sequence. If you miss, slow down and adapt."}</p></section>}
    {finished && <section className="result-card"><div className="eyebrow">PERSISTENCE COMPLETE</div><div className="result-score">{score}</div><div className="result-label">MEMORY PERSISTENCE SCORE</div><div className="result-stats"><div><strong>{level + 1}</strong><span>highest level</span></div><div><strong>{wrong}</strong><span>misses</span></div><div><strong>{best}</strong><span>best score</span></div></div><p>{level >= 5 ? "You pushed through increasing complexity and adapted after difficulty." : "Persistence improves when a mistake changes your approach rather than ending the attempt."}</p><div className="cta-row"><button className="btn btn-primary" onClick={begin}>Try again</button><Link href="/" className="btn btn-secondary">I'm done</Link></div></section>}</main>;
}
