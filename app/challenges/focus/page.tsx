"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

const ROUNDS = 18;
const SHAPES = ["●", "▲", "◆", "■", "✦", "⬟", "✚", "⬢"];
const GRID_SIZE = 30;

export default function FocusChallenge() {
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState("●");
  const [targetCell, setTargetCell] = useState(-1);
  const [visible, setVisible] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [hits, setHits] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [reactionTotal, setReactionTotal] = useState(0);
  const [shownAt, setShownAt] = useState(0);

  const difficulty = Math.min(1, round / (ROUNDS - 1));
  const visibleMs = Math.round(900 - difficulty * 430);
  const score = useMemo(() => {
    if (!finished) return 0;
    const accuracy = hits / Math.max(1, hits + mistakes);
    const averageReaction = reactionTotal / Math.max(1, hits);
    const speed = Math.max(0, 1 - averageReaction / 1300);
    const streakBonus = Math.min(10, bestStreak * 0.8);
    return Math.round(Math.min(100, accuracy * 65 + speed * 25 + streakBonus));
  }, [finished, hits, mistakes, reactionTotal, bestStreak]);

  const createRound = useCallback(() => {
    const nextTarget = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const nextCell = Math.floor(Math.random() * GRID_SIZE);
    setTarget(nextTarget);
    setTargetCell(nextCell);
    setVisible(true);
    setShownAt(performance.now());
    window.setTimeout(() => setVisible(false), visibleMs);
  }, [visibleMs]);

  const start = () => {
    setStarted(true); setFinished(false); setRound(0); setHits(0); setMistakes(0);
    setStreak(0); setBestStreak(0); setReactionTotal(0);
    window.setTimeout(createRound, 300);
  };

  const choose = (index: number) => {
    if (!started || finished || !visible) return;
    const reaction = performance.now() - shownAt;
    if (index === targetCell) {
      const nextStreak = streak + 1;
      setHits((value) => value + 1); setStreak(nextStreak);
      setBestStreak((value) => Math.max(value, nextStreak));
      setReactionTotal((value) => value + reaction);
    } else {
      setMistakes((value) => value + 1); setStreak(0);
    }
    setVisible(false);
    if (round >= ROUNDS - 1) setFinished(true);
    else {
      setRound((value) => value + 1);
      window.setTimeout(createRound, 180 + Math.random() * 280);
    }
  };

  useEffect(() => {
    if (!started || finished) return;
    const onKey = (event: KeyboardEvent) => {
      const index = Number(event.key) - 1;
      if (index >= 0 && index < GRID_SIZE) choose(index);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (!finished) return;
    const previous = JSON.parse(window.localStorage.getItem("forge.metrics") || "[[\"Focus\",0],[\"Control\",0],[\"Patience\",0],[\"Persistence\",0],[\"Consistency\",0]]") as [string, number][];
    const next = previous.map(([name, value]) => name === "Focus" ? [name, Math.max(value, score)] as [string, number] : [name, value] as [string, number]);
    window.localStorage.setItem("forge.metrics", JSON.stringify(next));
    window.localStorage.setItem("forge.lastFocus", String(score));
    window.localStorage.setItem("forge.sessions", String(Number(window.localStorage.getItem("forge.sessions") || 0) + 1));
  }, [finished, score]);

  return (
    <main className="game-shell">
      <div className="game-topbar"><Link href="/" className="game-back">← FORGE</Link><div className="game-progress">{started && !finished ? `${round + 1}/${ROUNDS}` : "FOCUS"}</div></div>
      {!started && !finished && <section className="game-intro"><div className="eyebrow">FOCUS · 60–90 SEC</div><h1>Catch it before it disappears.</h1><p>A shape will flash somewhere in the field. Find its exact position and tap it while it is visible. Every round moves, changes and gets faster.</p><div className="rule-pills"><span>Accuracy first</span><span>18 rounds</span><span>Gets faster</span></div><button className="btn btn-primary" onClick={start}>Begin Focus</button></section>}
      {started && !finished && <section className="game-stage"><div className="target-card"><span>WATCH FOR</span><strong>{target}</strong></div><div className={`focus-grid ${visible ? "target-visible" : "target-hidden"}`}>{Array.from({ length: GRID_SIZE }, (_, index) => <button key={`${round}-${index}`} className={`focus-cell ${visible && index === targetCell ? "focus-target" : ""}`} onClick={() => choose(index)} aria-label={visible && index === targetCell ? "target" : "field position"}>{visible && index === targetCell ? target : ""}</button>)}</div><div className="live-stats"><span>STREAK <b>{streak}</b></span><span>HITS <b>{hits}</b></span><span>MISS <b>{mistakes}</b></span></div><p className="game-hint">The target disappears quickly. Don't guess — find it.</p></section>}
      {finished && <section className="result-card"><div className="eyebrow">CHALLENGE COMPLETE</div><div className="result-score">{score}</div><div className="result-label">FOCUS SCORE</div><div className="result-stats"><div><strong>{hits}</strong><span>correct</span></div><div><strong>{mistakes}</strong><span>misses</span></div><div><strong>{bestStreak}</strong><span>best streak</span></div></div><p>{score >= 80 ? "Strong recovery and attention. Now try to beat your own score without extending the session." : "You can recover. Change your strategy, slow down when needed, and try one more deliberate attempt."}</p><div className="cta-row"><button className="btn btn-primary" onClick={start}>Try a harder round</button><Link href="/" className="btn btn-secondary">I'm done</Link></div></section>}
    </main>
  );
}
