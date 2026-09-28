"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const ROUNDS = 8;
const MAX_ATTEMPTS = 2;
const COLORS = ["GREEN", "RED", "BLUE", "YELLOW"];
const SHAPES = ["CIRCLE", "SQUARE", "TRIANGLE", "DIAMOND"];

type Task = { rule: "color" | "shape"; value: string; options: { color: string; shape: string }[] };

function makeTask(): Task {
  const rule = Math.random() > 0.5 ? "color" : "shape";
  const value = rule === "color" ? COLORS[Math.floor(Math.random() * COLORS.length)] : SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const options = Array.from({ length: 6 }, () => ({ color: COLORS[Math.floor(Math.random() * COLORS.length)], shape: SHAPES[Math.floor(Math.random() * SHAPES.length)] }));
  const target = Math.floor(Math.random() * options.length);
  options[target] = { color: rule === "color" ? value : options[target].color, shape: rule === "shape" ? value : options[target].shape };
  return { rule, value, options };
}

export default function PersistenceChallenge() {
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [round, setRound] = useState(0);
  const [task, setTask] = useState<Task>(makeTask());
  const [attempts, setAttempts] = useState(0);
  const [recovered, setRecovered] = useState(0);
  const [failedRounds, setFailedRounds] = useState(0);
  const [score, setScore] = useState(0);

  const load = () => {
    setTask(makeTask());
    setAttempts(0);
  };

  const finish = (nextRecovered: number, nextFailed: number) => {
    const result = Math.max(0, Math.min(100, Math.round((nextRecovered / ROUNDS) * 75 + Math.max(0, 25 - nextFailed * 4))));
    setRecovered(nextRecovered);
    setFailedRounds(nextFailed);
    setScore(result);
    setFinished(true);
  };

  const choose = (index: number) => {
    if (!started || finished) return;
    const option = task.options[index];
    const correct = task.rule === "color" ? option.color === task.value : option.shape === task.value;
    if (correct) {
      const nextRecovered = recovered + (attempts > 0 ? 1 : 0);
      if (round >= ROUNDS - 1) finish(nextRecovered + (attempts === 0 ? 1 : 0), failedRounds);
      else { setRecovered(nextRecovered + (attempts === 0 ? 1 : 0)); setRound((v) => v + 1); window.setTimeout(load, 120); }
      return;
    }
    const nextAttempt = attempts + 1;
    if (nextAttempt < MAX_ATTEMPTS) {
      setAttempts(nextAttempt);
      return;
    }
    const nextFailed = failedRounds + 1;
    if (round >= ROUNDS - 1) finish(recovered, nextFailed);
    else { setFailedRounds(nextFailed); setRound((v) => v + 1); window.setTimeout(load, 120); }
  };

  const begin = () => {
    setStarted(true); setFinished(false); setRound(0); setAttempts(0); setRecovered(0); setFailedRounds(0); setScore(0); load();
  };

  useEffect(() => {
    if (!finished) return;
    const previous = JSON.parse(window.localStorage.getItem("forge.metrics") || "[[\"Focus\",0],[\"Control\",0],[\"Patience\",0],[\"Persistence\",0],[\"Consistency\",0]]") as [string, number][];
    window.localStorage.setItem("forge.metrics", JSON.stringify(previous.map(([name, value]) => name === "Persistence" ? [name, Math.max(value, score)] : [name, value])));
  }, [finished, score]);

  return (
    <main className="game-shell">
      <div className="game-topbar"><Link href="/" className="game-back">← FORGE</Link><div className="game-progress">{started && !finished ? `${round + 1}/${ROUNDS}` : "PERSISTENCE"}</div></div>
      {!started && <section className="game-intro"><div className="eyebrow">PERSISTENCE · RECOVERY</div><h1>Failure is information.</h1><p>Each round gives you a small task. If you miss, you get one chance to change your approach. Persistence is measured by recovery, not by endless retries.</p><div className="rule-pills"><span>8 rounds</span><span>1 recovery chance</span><span>Adapt</span></div><button className="btn btn-primary" onClick={begin}>Start Persistence</button></section>}
      {started && !finished && <section className="game-stage">
        <div className="target-card"><span>RULE</span><strong>{task.rule.toUpperCase()} → {task.value}</strong></div>
        <div className="switch-field">{task.options.map((option, index) => <button key={index} className={`switch-tile tile-${option.color.toLowerCase()}`} onClick={() => choose(index)} aria-label={`${option.color} ${option.shape}`}><span>{option.shape === "CIRCLE" ? "●" : option.shape === "SQUARE" ? "■" : option.shape === "TRIANGLE" ? "▲" : "◆"}</span></button>)}</div>
        <div className="live-stats"><span>ROUND <b>{round + 1}</b></span><span>ATTEMPT <b>{attempts + 1}/{MAX_ATTEMPTS}</b></span><span>RECOVERED <b>{recovered}</b></span></div>
        <p className="game-hint">{attempts ? "You missed. Change something: slow down, reread the rule, then choose." : "Solve it deliberately. If you miss, use the feedback instead of rushing."}</p>
      </section>}
      {finished && <section className="result-card"><div className="eyebrow">PERSISTENCE COMPLETE</div><div className="result-score">{score}</div><div className="result-label">PERSISTENCE SCORE</div><div className="result-stats"><div><strong>{recovered}</strong><span>recovered</span></div><div><strong>{failedRounds}</strong><span>failed rounds</span></div><div><strong>{ROUNDS}</strong><span>rounds</span></div></div><p>{recovered ? "You demonstrated recovery after mistakes. Persistence is adapting and continuing with a better approach." : "The next skill is recovery: when something fails, change one thing before trying again."}</p><div className="cta-row"><button className="btn btn-primary" onClick={begin}>Run once more</button><Link href="/" className="btn btn-secondary">I'm done</Link></div></section>}
    </main>
  );
}
