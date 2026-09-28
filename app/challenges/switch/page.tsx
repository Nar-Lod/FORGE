"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const ROUNDS = 8;
const TOTAL_SECONDS = 60;

const makeRound = (index: number) => ({
  instruction: index % 2 === 0 ? "TAP ONLY THE GREEN" : "TAP ONLY THE CIRCLE",
  options: index % 2 === 0 ? ["GREEN", "RED", "BLUE"] : ["SQUARE", "TRIANGLE", "CIRCLE"],
  correct: index % 2 === 0 ? "GREEN" : "CIRCLE",
});

export default function SwitchChallenge() {
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [seconds, setSeconds] = useState(TOTAL_SECONDS);
  const [finished, setFinished] = useState(false);

  const current = useMemo(() => makeRound(round), [round]);
  const score = Math.round((correct / ROUNDS) * 75 + Math.max(0, 25 - mistakes * 4));

  useEffect(() => {
    if (!started || finished) return;
    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          setFinished(true);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [started, finished]);

  const begin = () => {
    setStarted(true);
    setFinished(false);
    setRound(0);
    setCorrect(0);
    setMistakes(0);
    setSeconds(TOTAL_SECONDS);
  };

  const choose = (value: string) => {
    if (!started || finished) return;
    if (value === current.correct) setCorrect((v) => v + 1);
    else setMistakes((v) => v + 1);

    if (round >= ROUNDS - 1) setFinished(true);
    else setRound((v) => v + 1);
  };

  return (
    <main className="game-shell">
      <div className="game-topbar">
        <Link href="/" className="game-back">← FORGE</Link>
        <div className="game-progress">{started && !finished ? `${seconds}s` : "SWITCH"}</div>
      </div>

      {!started && !finished && (
        <section className="game-intro">
          <div className="eyebrow">SWITCH · 60 SEC</div>
          <h1>Interrupt the impulse.<br />Choose deliberately.</h1>
          <p>Your rules will change. Pause, notice the instruction, and choose the correct response instead of the most obvious distraction.</p>
          <button className="btn btn-primary" onClick={begin}>Start Switch</button>
        </section>
      )}

      {started && !finished && (
        <section className="game-stage">
          <div className="target-card" style={{ width: "min(420px, 100%)" }}>
            <span>RULE {round + 1} / {ROUNDS}</span>
            <strong style={{ fontSize: 25 }}>{current.instruction}</strong>
          </div>
          <div className="switch-options">
            {current.options.map((option) => (
              <button key={option} className="switch-option" onClick={() => choose(option)}>{option}</button>
            ))}
          </div>
          <p className="game-hint">Pause for a beat before you tap. The rule matters more than speed.</p>
        </section>
      )}

      {finished && (
        <section className="result-card">
          <div className="eyebrow">SWITCH COMPLETE</div>
          <div className="result-score">{Math.min(100, Math.max(0, score))}</div>
          <div className="result-label">CONTROL SCORE</div>
          <div className="result-stats">
            <div><strong>{correct}</strong><span>correct</span></div>
            <div><strong>{mistakes}</strong><span>mistakes</span></div>
            <div><strong>{TOTAL_SECONDS - seconds}s</strong><span>training</span></div>
          </div>
          <p>You interrupted the automatic response and practiced choosing deliberately. Now the important part: leave FORGE and do what you intended to do.</p>
          <div className="cta-row" style={{ justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={begin}>Try again</button>
            <Link href="/" className="btn btn-secondary">I'm done</Link>
          </div>
        </section>
      )}
    </main>
  );
}
