"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

const ROUNDS = 10;
const TARGET = 1500;

export default function ConsistencyChallenge() {
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [round, setRound] = useState(0);
  const [results, setResults] = useState<number[]>([]);
  const [armed, setArmed] = useState(false);
  const [startAt, setStartAt] = useState(0);
  const [score, setScore] = useState(0);
  const timer = useRef<number | null>(null);

  const clear = () => { if (timer.current !== null) window.clearTimeout(timer.current); timer.current = null; };

  const beginRound = () => {
    clear();
    setArmed(false);
    timer.current = window.setTimeout(() => { setArmed(true); setStartAt(performance.now()); }, 600 + Math.random() * 700);
  };

  useEffect(() => () => clear(), []);

  const tap = () => {
    if (!started || finished || !armed) return;
    const delta = Math.round(performance.now() - startAt);
    const next = [...results, delta];
    setResults(next);
    if (next.length >= ROUNDS) {
      const mean = next.reduce((a, b) => a + b, 0) / next.length;
      const variance = next.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / next.length;
      const sd = Math.sqrt(variance);
      const finalScore = Math.max(0, Math.min(100, Math.round(100 - Math.min(100, sd / 5))));
      setScore(finalScore);
      setFinished(true);
      clear();
    } else {
      setRound((v) => v + 1);
      window.setTimeout(beginRound, 150);
    }
  };

  const begin = () => {
    clear(); setStarted(true); setFinished(false); setRound(0); setResults([]); setScore(0);
    window.setTimeout(beginRound, 200);
  };

  const mean = useMemo(() => results.length ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : 0, [results]);
  const spread = useMemo(() => {
    if (results.length < 2) return 0;
    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    return Math.round(Math.sqrt(results.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / results.length));
  }, [results]);

  useEffect(() => {
    if (!finished) return;
    const previous = JSON.parse(window.localStorage.getItem("forge.metrics") || "[[\"Focus\",0],[\"Control\",0],[\"Patience\",0],[\"Persistence\",0],[\"Consistency\",0]]") as [string, number][];
    window.localStorage.setItem("forge.metrics", JSON.stringify(previous.map(([name, value]) => name === "Consistency" ? [name, Math.max(value, score)] : [name, value])));
  }, [finished, score]);

  return (
    <main className="game-shell">
      <div className="game-topbar"><Link href="/" className="game-back">← FORGE</Link><div className="game-progress">{started && !finished ? `${round + 1}/${ROUNDS}` : "CONSISTENCY"}</div></div>
      {!started && <section className="game-intro"><div className="eyebrow">CONSISTENCY · STABILITY</div><h1>Can you do the same thing reliably?</h1><p>Tap after the signal. The goal is not your fastest reaction. The goal is to produce a stable performance across repeated rounds.</p><div className="rule-pills"><span>10 rounds</span><span>Same target</span><span>Measure variance</span></div><button className="btn btn-primary" onClick={begin}>Start Consistency</button></section>}
      {started && !finished && <section className="game-stage">
        <div className={`target-card ${armed ? "armed" : "waiting"}`}><span>{armed ? "SIGNAL LIVE" : "WAIT"}</span><strong>{armed ? "TAP NOW" : "…"}</strong></div>
        <button className="consistency-target" onClick={tap} aria-label="tap target"><span>●</span></button>
        <div className="live-stats"><span>ROUND <b>{round + 1}</b></span><span>AVG <b>{mean}ms</b></span><span>SPREAD <b>{spread}ms</b></span></div>
        <p className="game-hint">Aim for repeatability. A steady result beats one unusually fast result.</p>
      </section>}
      {finished && <section className="result-card"><div className="eyebrow">CONSISTENCY COMPLETE</div><div className="result-score">{score}</div><div className="result-label">CONSISTENCY SCORE</div><div className="result-stats"><div><strong>{mean}ms</strong><span>average</span></div><div><strong>{spread}ms</strong><span>spread</span></div><div><strong>{ROUNDS}</strong><span>rounds</span></div></div><p>{spread < 80 ? "Your timing stayed relatively stable across the run." : "Your results moved around. Consistency improves when you choose a repeatable process instead of chasing your fastest attempt."}</p><div className="cta-row"><button className="btn btn-primary" onClick={begin}>Run once more</button><Link href="/" className="btn btn-secondary">I'm done</Link></div></section>}
    </main>
  );
}
