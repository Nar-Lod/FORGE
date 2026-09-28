"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const ITEMS = ["●", "■", "▲", "◆", "★", "✚", "✦", "⬟", "⬢", "✿", "☀", "❖"];
const LEVELS = [2, 3, 4, 5, 6, 7, 8];

function makeSet(count = 10) {
  return [...ITEMS].sort(() => Math.random() - 0.5).slice(0, count);
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export default function ConsistencyChallenge() {
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [level, setLevel] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [firstPick, setFirstPick] = useState<string[]>([]);
  const [secondPick, setSecondPick] = useState<string[]>([]);
  const [phase, setPhase] = useState<"first" | "second">("first");
  const [scores, setScores] = useState<number[]>([]);

  const count = LEVELS[level];
  const selected = phase === "first" ? firstPick : secondPick;
  const shuffledPositions = level >= 5 && phase === "second";

  const beginLevel = (index: number) => {
    setLevel(index);
    setImages(makeSet());
    setFirstPick([]);
    setSecondPick([]);
    setPhase("first");
  };

  const start = () => {
    setStarted(true);
    setFinished(false);
    setScores([]);
    beginLevel(0);
  };

  const choose = (image: string) => {
    if (selected.includes(image) || selected.length >= count) return;

    if (phase === "first") setFirstPick((current) => [...current, image]);
    else setSecondPick((current) => [...current, image]);
  };

  const redo = () => {
    if (shuffledPositions) setImages(shuffle(firstPick));
    setSecondPick([]);
    setPhase("second");
  };

  const submit = () => {
    const score =
      firstPick.length === 0
        ? 0
        : Math.round(
            (secondPick.filter((item, index) => item === firstPick[index]).length /
              firstPick.length) *
              100,
          );

    const nextScores = [...scores, score];
    setScores(nextScores);

    if (level === LEVELS.length - 1) {
      setFinished(true);
    } else {
      beginLevel(level + 1);
    }
  };

  const consistency = useMemo(() => {
    if (!scores.length) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [scores]);

  return (
    <main className="game-shell">
      <div className="game-topbar">
        <Link href="/" className="game-back">← FORGE</Link>
        <div className="game-progress">
          {started && !finished ? "LEVEL " + (level + 1) + "/" + LEVELS.length : "CONSISTENCY"}
        </div>
      </div>

      {!started && (
        <section className="game-intro">
          <div className="eyebrow">CONSISTENCY · PROGRESSIVE MEMORY</div>
          <h1>Build your consistency, one step at a time.</h1>
          <p>
            Start with just 2 images. Each level adds one more. Create your own order, then reproduce it.
            Later levels move the images so you must remember the items themselves, not their positions.
          </p>
          <div className="rule-pills">
            <span>2 → 3 → 4 → 5</span>
            <span>6 → 7 → 8</span>
            <span>Progressive difficulty</span>
          </div>
          <button className="btn btn-primary" onClick={start}>Start Consistency</button>
        </section>
      )}

      {started && !finished && (
        <section className="game-stage">
          <div className="target-card">
            <span>
              {phase === "first"
                ? "CHOOSE YOUR ORDER"
                : shuffledPositions
                  ? "REBUILD YOUR ORDER"
                  : "REPEAT YOUR ORDER"}
            </span>
            <strong>{selected.length}/{count}</strong>
          </div>

          <p className="game-hint">
            {phase === "first"
              ? "Choose " + count + " images from the 10-image set in any order. The order you create becomes your pattern."
              : shuffledPositions
                ? "The same " + count + " images are here, but their positions changed. Select them in the exact order you created before."
                : "Now repeat the exact same " + count + " images in the same order. There is no speed test."}
          </p>

          <div className="consistency-image-grid">
            {images.map((image) => (
              <button
                key={image}
                type="button"
                className={"consistency-image " + (selected.includes(image) ? "selected" : "")}
                onClick={() => choose(image)}
                aria-label={"Choose " + image}
              >
                <span>{image}</span>
                {selected.includes(image) && <small>{selected.indexOf(image) + 1}</small>}
              </button>
            ))}
          </div>

          {selected.length === count && phase === "first" && (
            <button className="btn btn-primary" onClick={redo}>
              {shuffledPositions ? "Shuffle positions & rebuild" : "Repeat the order"}
            </button>
          )}

          {selected.length === count && phase === "second" && (
            <button className="btn btn-primary" onClick={submit}>Check consistency</button>
          )}

          <div className="live-stats">
            <span>LEVEL <b>{level + 1}</b></span>
            <span>ITEMS <b>{count}</b></span>
            <span>PREVIOUS <b>{scores.length ? scores[scores.length - 1] + "%" : "—"}</b></span>
          </div>
        </section>
      )}

      {finished && (
        <section className="result-card">
          <div className="eyebrow">CONSISTENCY COMPLETE</div>
          <div className="result-score">{consistency}%</div>
          <div className="result-label">OVERALL CONSISTENCY</div>
          <div className="result-stats">
            {scores.map((score, index) => (
              <div key={LEVELS[index]}>
                <strong>{score}%</strong>
                <span>{LEVELS[index]}-item match</span>
              </div>
            ))}
          </div>
          <p>
            You progressed from 2 items to 8. The later levels also remove position memory by moving
            the items before you reproduce your original order.
          </p>
          <div className="cta-row">
            <button className="btn btn-primary" onClick={start}>Try again</button>
            <Link href="/" className="btn btn-secondary">I'm done</Link>
          </div>
        </section>
      )}
    </main>
  );
}
