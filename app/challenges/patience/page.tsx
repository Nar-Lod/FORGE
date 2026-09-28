"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const ROUNDS = 10;
const WAIT_MS = 3000;
const BANK_WINDOW_MS = 5000;

export default function PatienceChallenge() {
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [round, setRound] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [banked, setBanked] = useState(0);
  const [early, setEarly] = useState(0);
  const [score, setScore] = useState(0);
  const [roundStart, setRoundStart] = useState(0);

  const beginRound = () => {
    setElapsed(0);
    setRoundStart(performance.now());
  };

  useEffect(() => {
    if (!started || finished) return;
    const timer = window.setInterval(() => {
      const value = performance.now() - roundStart;
      setElapsed(Math.min(value, BANK_WINDOW_MS));
    }, 50);
    return () => window.clearInterval(timer);
  }, [started, finished, roundStart]);

  const nextRound = (didBank: boolean) => {
    if (didBank) setBanked((v) => v + 1);
    if (round >= ROUNDS - 1) {
      const finalBanked = banked + (didBank ? 1 : 0);
      const finalEarly = early;
      const result = Math.max(0, Math.min(100, Math.round((finalBanked / ROUNDS) * 80 + Math.max(0, 20 - finalEarly * 4))));
      setScore(result);
      setFinished(true);
      return;
    }
    setRound((v) => v + 1);
    window.setTimeout(beginRound, 120);
  };

  const choose = () => {
    if (!started || finished) return;
    if (elapsed < WAIT_MS) {
      setEarly((v) => v + 1);
      nextRound(false);
    } else {
      nextRound(true);
    }
  };

  const begin = () => {
    setStarted(true);
    setFinished(false);
    setRound(0);
    setBanked(0);
    setEarly(0);
    setScore(0);
    window.setTimeout(beginRound, 100);
  };

  const progress = Math.min(100, (elapsed / BANK_WINDOW_MS) * 100);
  const ready = elapsed >= WAIT_MS;
  const value = useMemo(() => ready ? "BANK" : "WAIT", [ready]);

  useEffect(() => {
    if (!finished) return;
    const previous = JSON.parse(window.localStorage.getItem("forge.metrics") || "[[\"Focus\",0],[\"Control\",0],[\"Patience\",0],[\"Persistence\",0],[\"Consistency\",0]]") as [string, number][];
    window.localStorage.setItem("forge.metrics", JSON.stringify(previous.map(([name, value]) => name === "Patience" ? [name, Math.max(value, score)] : [name, value])));
  }, [finished, score]);

  return (
    <main className="game-shell">
      <div className="game-topbar"><Link href="/" className="game-back">← FORGE</Link><div className="game-progress">{started && !finished ? `${round + 1}/${ROUNDS}` : "PATIENCE"}</div></div>
      {!started && <section className="game-intro"><div className="eyebrow">PATIENCE · DELAYED REWARD</div><h1>Wait for the better reward.</h1><p>A reward is building. You can tap now, but the full reward is only available after the waiting window. Practice letting the easy option pass.</p><div className="rule-pills"><span>Wait 3s</span><span>Bank reward</span><span>No rush</span></div><button className="btn btn-primary" onClick={begin}>Start Patience</button></section>}
      {started && !finished && <section className="game-stage">
        <div className="target-card"><span>REWARD BUILDING</span><strong>{value}</strong></div>
        <div className="patience-meter"><div className="patience-fill" style={{ width: `${progress}%` }} /></div>
        <div className="patience-value">{ready ? "FULL REWARD AVAILABLE" : "WAITING FOR FULL VALUE…"}</div>
        <button className={`btn ${ready ? "btn-primary" : "btn-secondary"} patience-action`} onClick={choose}>{ready ? "Bank full reward" : "Take the early option"}</button>
        <div className="live-stats"><span>ROUND <b>{round + 1}</b></span><span>BANKED <b>{banked}</b></span><span>EARLY <b>{early}</b></span></div>
        <p className="game-hint">{ready ? "You waited. Choose deliberately." : "Notice the urge to take the easy option. You do not have to obey it."}</p>
      </section>}
      {finished && <section className="result-card"><div className="eyebrow">PATIENCE COMPLETE</div><div className="result-score">{score}</div><div className="result-label">PATIENCE SCORE</div><div className="result-stats"><div><strong>{banked}</strong><span>full rewards</span></div><div><strong>{early}</strong><span>early choices</span></div><div><strong>{ROUNDS}</strong><span>rounds</span></div></div><p>{early === 0 ? "You consistently delayed the easy reward and waited for the full value." : "The useful signal is where you gave in early. Next time, notice the urge before choosing."}</p><div className="cta-row"><button className="btn btn-primary" onClick={begin}>Run once more</button><Link href="/" className="btn btn-secondary">I'm done</Link></div></section>}
    </main>
  );
}
