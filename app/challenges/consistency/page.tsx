"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const ITEMS = ["●", "■", "▲", "◆", "★", "✚", "✦", "⬟", "⬢", "✿", "☀", "❖"];
const SETS = [5, 7, 7];

function makeSet(count = 10) {
  return [...ITEMS].sort(() => Math.random() - 0.5).slice(0, count);
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export default function ConsistencyChallenge() {
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [challenge, setChallenge] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [firstPick, setFirstPick] = useState<string[]>([]);
  const [secondPick, setSecondPick] = useState<string[]>([]);
  const [phase, setPhase] = useState<"first" | "second">("first");
  const [scores, setScores] = useState<number[]>([]);

  const count = SETS[challenge];
  const selected = phase === "first" ? firstPick : secondPick;
  const shuffledPositions = challenge === 2 && phase === "second";

  const beginChallenge = (index: number) => {
    setChallenge(index);
    setImages(makeSet());
    setFirstPick([]);
    setSecondPick([]);
    setPhase("first");
  };

  const start = () => {
    setStarted(true);
    setFinished(false);
    setScores([]);
    beginChallenge(0);
  };

  const choose = (image: string) => {
    if (selected.includes(image) || selected.length >= count) return;
    if (phase === "first") setFirstPick((current) => [...current, image]);
    else setSecondPick((current) => [...current, image]);
  };

  const redo = () => {
    if (challenge === 2) setImages(shuffle(firstPick));
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

    if (challenge === SETS.length - 1) setFinished(true);
    else beginChallenge(challenge + 1);
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
          {started && !finished ? "CHALLENGE " + (challenge + 1) + "/3" : "CONSISTENCY"}
        </div>
      </div>

      {!started && (
        <section className="game-intro">
          <div className="eyebrow">CONSISTENCY · REPEATABILITY</div>
          <h1>Can you repeat what you just did?</h1>
          <p>
            First choose your own order. Then reproduce that exact order. In the final challenge,
            the positions change, so you must remember the images themselves—not where you first saw them.
          </p>
          <div className="rule-pills">
            <span>5 from 10</span>
            <span>7 from 10</span>
            <span>7 with shuffled positions</span>
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
                ? "The same " + count + " images are here, but their positions have changed. Select them in the exact order you chose before."
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
              {challenge === 2 ? "Shuffle positions & rebuild" : "Repeat the order"}
            </button>
          )}

          {selected.length === count && phase === "second" && (
            <button className="btn btn-primary" onClick={submit}>Check consistency</button>
          )}

          <div className="live-stats">
            <span>CHALLENGE <b>{challenge + 1}/3</b></span>
            <span>SELECT <b>{count}</b></span>
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
            <div><strong>{scores[0]}%</strong><span>5-image match</span></div>
            <div><strong>{scores[1]}%</strong><span>7-image match</span></div>
            <div><strong>{scores[2]}%</strong><span>shuffled-position match</span></div>
          </div>
          <p>
            This score reflects how reliably you reproduced your own decisions. The final challenge
            removes position memory: the images move, but your original order stays the same.
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
