"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

const TARGETS = ["△", "●", "■", "◆"];
const ROUNDS = 12;

function nextTarget(previous: string) {
  const choices = TARGETS.filter((item) => item !== previous);
  return choices[Math.floor(Math.random() * choices.length)];
}

export default function FocusChallenge() {
  const [round, setRound] = useState(1);
  const [target, setTarget] = useState("●");
  const [grid, setGrid] = useState<string[]>([]);
  const [hits, setHits] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [reactionTotal, setReactionTotal] = useState(0);
  const [shownAt, setShownAt] = useState(0);

  const score = useMemo(() => {
    if (!finished) return 0;
    const accuracy = hits / Math.max(1, hits + mistakes);
    const reactionBonus = Math.max(0, 1 - reactionTotal / Math.max(1, hits) / 1800);
    return Math.round(Math.max(0, accuracy * 80 + reactionBonus * 20));
  }, [finished, hits, mistakes, reactionTotal]);

  const createRound = useCallback((currentTarget: string) => {
    const cells = Array.from({ length: 16 }, () => TARGETS[Math.floor(Math.random() * TARGETS.length)]);
    const index = Math.floor(Math.random() * cells.length);
    cells[index] = currentTarget;
    setGrid(cells);
    setShownAt(performance.now());
  }, []);

  const start = () => {
    setStarted(true);
    setFinished(false);
    setRound(1);
    setHits(0);
    setMistakes(0);
    setReactionTotal(0);
    setTarget("●");
    createRound("●");
  };

  const choose = (symbol: string) => {
    if (!started || finished) return;
    const reaction = performance.now() - shownAt;
    if (symbol === target) {
      setHits((value) => value + 1);
      setReactionTotal((value) => value + reaction);
    } else {
      setMistakes((value) => value + 1);
    }

    if (round >= ROUNDS) {
      setFinished(true);
      return;
    }

    const next = nextTarget(target);
    setTarget(next);
    setRound((value) => value + 1);
    createRound(next);
  };

  useEffect(() => {
    if (!started || finished) return;
    const onKey = (event: KeyboardEvent) => {
      const index = Number(event.key) - 1;
      if (index >= 0 && index < TARGETS.length) choose(TARGETS[index]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <main className="game-shell">
      <div className="game-topbar">
        <Link href="/" className="game-back">← FORGE</Link>
        <div className="game-progress">{started && !finished ? `${round}/${ROUNDS}` : "FOCUS"}</div>
      </div>

      {!started && !finished && (
        <section className="game-intro">
          <div className="eyebrow">FOCUS · 60–90 SEC</div>
          <h1>Find the target.<br />Ignore everything else.</h1>
          <p>You will see a field of symbols. Tap the symbol named at the top. Speed matters, but accuracy matters more.</p>
          <button className="btn btn-primary" onClick={start}>Begin Focus</button>
        </section>
      )}

      {started && !finished && (
        <section className="game-stage">
          <div className="target-card">
            <span>FIND</span>
            <strong>{target}</strong>
          </div>
          <div className="symbol-grid">
            {grid.map((symbol, index) => (
              <button key={`${round}-${index}`} className="symbol-cell" onClick={() => choose(symbol)} aria-label={`symbol ${symbol}`}>
                {symbol}
              </button>
            ))}
          </div>
          <p className="game-hint">Keyboard: 1 △ · 2 ● · 3 ■ · 4 ◆</p>
        </section>
      )}

      {finished && (
        <section className="result-card">
          <div className="eyebrow">CHALLENGE COMPLETE</div>
          <div className="result-score">{score}</div>
          <div className="result-label">FOCUS SCORE</div>
          <div className="result-stats">
            <div><strong>{hits}</strong><span>correct</span></div>
            <div><strong>{mistakes}</strong><span>mistakes</span></div>
            <div><strong>{ROUNDS}</strong><span>rounds</span></div>
          </div>
          <p>Accuracy is your foundation. Next time, try to keep the same accuracy while reacting faster.</p>
          <div className="cta-row">
            <button className="btn btn-primary" onClick={start}>Try again</button>
            <Link href="/" className="btn btn-secondary">Back to profile</Link>
          </div>
        </section>
      )}
    </main>
  );
}
