"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Item = { id: string; shape: string; color: string };

const LEVELS = [5, 6, 7, 8, 9, 10, 11, 12];
const SHAPES = ["●", "■", "▲", "◆", "⬟", "⬢", "★", "✚", "✦", "⬣", "✿", "☀"];
const COLORS = ["red", "blue", "green", "yellow", "purple", "orange"];

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function makeSequence(length: number): Item[] {
  const combos: Item[] = [];
  for (const shape of SHAPES) {
    for (const color of COLORS) {
      combos.push({ id: `${shape}-${color}`, shape, color });
    }
  }
  return shuffle(combos).slice(0, length);
}

const same = (a: Item, b: Item) => a.id === b.id;

export default function PersistenceChallenge() {
  const [started, setStarted] = useState(false);
  const [showing, setShowing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [level, setLevel] = useState(0);
  const [sequence, setSequence] = useState<Item[]>([]);
  const [answer, setAnswer] = useState<Item[]>([]);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [lastResult, setLastResult] = useState<"correct" | "wrong" | null>(null);

  const length = LEVELS[level];
  const manual = level < 4;

  useEffect(() => {
    setBest(Number(window.localStorage.getItem("forge.persistence.best") || 0));
  }, []);

  const startLevel = (levelIndex: number) => {
    const nextLength = LEVELS[levelIndex];
    const seq = makeSequence(nextLength);
    setLevel(levelIndex);
    setSequence(seq);
    setAnswer([]);
    setSubmitted(false);
    setLastResult(null);
    setShowing(true);
  };

  const begin = () => {
    setStarted(true);
    setFinished(false);
    setScore(0);
    setWrong(0);
    startLevel(0);
  };

  useEffect(() => {
    if (!started || !showing || manual) return;
    const duration = 5500 + length * 650;
    const timer = window.setTimeout(() => setShowing(false), duration);
    return () => window.clearTimeout(timer);
  }, [started, showing, manual, length]);

  useEffect(() => {
    if (finished) {
      setBest((current) => {
        const next = Math.max(current, score);
        window.localStorage.setItem("forge.persistence.best", String(next));
        return next;
      });
    }
  }, [finished, score]);

  const arrange = () => {
    setShowing(false);
    setAnswer([]);
    setSubmitted(false);
    setLastResult(null);
  };

  const choose = (item: Item) => {
    if (showing || finished || (submitted && lastResult === "correct") || answer.length >= length) return;
    if (answer.some((selected) => same(selected, item))) return;
    setSubmitted(false);
    setLastResult(null);
    setAnswer((current) => [...current, item]);
  };

  const removeFromAnswer = (index: number) => {
    if (finished || (submitted && lastResult === "correct")) return;
    setSubmitted(false);
    setLastResult(null);
    setAnswer((current) => current.filter((_, i) => i !== index));
  };

  const correctCount = answer.reduce(
    (count, item, index) => count + (same(item, sequence[index]) ? 1 : 0),
    0,
  );

  const submit = () => {
    if (answer.length !== length) return;

    const correct = answer.every((item, index) => same(item, sequence[index]));
    setSubmitted(true);

    if (!correct) {
      setWrong((current) => current + 1);
      setLastResult("wrong");
      return;
    }

    setLastResult("correct");
    const nextScore = score + length * 10;
    setScore(nextScore);

    if (level === LEVELS.length - 1) {
      setBest((current) => {
        const next = Math.max(current, nextScore);
        window.localStorage.setItem("forge.persistence.best", String(next));
        return next;
      });
      setFinished(true);
      return;
    }

    const nextLevel = level + 1;
    window.setTimeout(() => startLevel(nextLevel), 900);
  };

  const options = useMemo(() => {
    if (!sequence.length) return [];

    const decoyPool = makeSequence(Math.min(12, length + 4)).filter(
      (item) => !sequence.some((original) => same(original, item)),
    );

    return shuffle([
      ...sequence,
      ...decoyPool.slice(0, Math.max(3, Math.min(6, length - 2))),
    ]);
  }, [sequence, length]);

  return (
    <main className="game-shell">
      <div className="game-topbar">
        <Link href="/" className="game-back">← FORGE</Link>
        <div className="game-progress">
          {started && !finished ? `LEVEL ${level + 1}/8` : "PERSISTENCE"}
        </div>
      </div>

      {!started && (
        <section className="game-intro">
          <div className="eyebrow">PERSISTENCE · SEQUENCE MEMORY</div>
          <h1>Remember. Arrange. Adapt.</h1>
          <p>
            Levels 1–4 let you study the complete sequence as long as you need.
            From level 5 onward, the complete sequence disappears automatically
            after a timed viewing window.
          </p>
          <div className="rule-pills">
            <span>5 → 12 unique items</span>
            <span>Arrange when ready</span>
            <span>Timed from level 5</span>
          </div>
          <button className="btn btn-primary" onClick={begin}>Start Persistence</button>
        </section>
      )}

      {started && !finished && (
        <section className="game-stage">
          <div className="target-card">
            <span>{showing ? "MEMORIZE" : "REBUILD"}</span>
            <strong>{showing ? `${length} ITEMS` : `${answer.length}/${length}`}</strong>
          </div>

          {showing && (
            <>
              <div className="focus-grid sequence-grid">
                {sequence.map((item) => (
                  <div key={item.id} className={`focus-cell sequence-cell ${item.color}`}>
                    <span>{item.shape}</span>
                  </div>
                ))}
              </div>
              {manual && (
                <button className="btn btn-primary" onClick={arrange}>Arrange</button>
              )}
            </>
          )}

          {!showing && (
            <>
              <div className="option-grid">
                {options.map((item) => (
                  <button
                    key={item.id}
                    disabled={submitted && lastResult === "correct"}
                    className={`switch-tile sequence-option ${item.color}`}
                    onClick={() => choose(item)}
                  >
                    <span>{item.shape}</span>
                  </button>
                ))}
              </div>

              <div className="answer-strip">
                {Array.from({ length }).map((_, index) => {
                  const item = answer[index];
                  return (
                    <button
                      key={`slot-${index}`}
                      className={`correction-slot ${item ? item.color : "empty"}`}
                      onClick={() => item && removeFromAnswer(index)}
                      disabled={submitted && lastResult === "correct"}
                      aria-label={item ? `Remove item ${index + 1}` : `Empty position ${index + 1}`}
                    >
                      {item ? <span>{item.shape}</span> : <span>+</span>}
                      <small>{index + 1}</small>
                    </button>
                  );
                })}
              </div>

              <button
                className="btn btn-primary"
                disabled={answer.length !== length || (submitted && lastResult === "correct")}
                onClick={submit}
              >
                {lastResult === "correct"
                  ? level === LEVELS.length - 1 ? "Complete" : "Correct — Next Level"
                  : submitted && lastResult === "wrong"
                    ? "Submit corrected arrangement"
                    : "Submit arrangement"}
              </button>

              {submitted && lastResult === "wrong" && (
                <div className="game-hint correction-message">
                  <strong>{correctCount}/{length} in the correct position.</strong>
                  <span>
                    Your arrangement is not correct yet. Tap a selected item to remove it,
                    then choose its replacement from the board. You can correct as many
                    positions as needed before submitting again.
                  </span>
                </div>
              )}
            </>
          )}

          <div className="live-stats">
            <span>LEVEL <b>{level + 1}</b></span>
            <span>ITEMS <b>{length}</b></span>
            <span>SCORE <b>{score}</b></span>
            <span>MISSES <b>{wrong}</b></span>
          </div>

          <p className="game-hint">
            {showing
              ? manual
                ? "Study every item, its colour and its order. Press Arrange only when you have memorized the complete sequence."
                : "Study the complete sequence, including each item's colour. It will disappear automatically."
              : "Build the exact sequence. Shape + colour identify each item, so visually similar shapes are deliberately separated by colour."}
          </p>
        </section>
      )}

      {finished && (
        <section className="result-card">
          <div className="eyebrow">PERSISTENCE COMPLETE</div>
          <div className="result-score">{score}</div>
          <div className="result-label">MEMORY PERSISTENCE SCORE</div>
          <div className="result-stats">
            <div><strong>8</strong><span>levels cleared</span></div>
            <div><strong>{wrong}</strong><span>misses</span></div>
            <div><strong>{best}</strong><span>best score</span></div>
          </div>
          <p>
            You progressed from deliberate study into timed memory pressure while
            adapting to longer sequences.
          </p>
          <div className="cta-row">
            <button className="btn btn-primary" onClick={begin}>Try again</button>
            <Link href="/" className="btn btn-secondary">I&apos;m done</Link>
          </div>
        </section>
      )}
    </main>
  );
}
