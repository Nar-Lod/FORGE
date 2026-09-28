"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const ITEMS = ["●", "■", "▲", "◆", "★", "✚", "✦", "⬟", "⬢", "✿", "☀", "❖"];
const SETS = [5, 7];

function makeSet(count: number) {
  const shuffled = [...ITEMS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
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

  const beginChallenge = (index: number) => {
    const set = makeSet(SETS[index]);
    setChallenge(index);
    setImages(set);
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
    if (selected.includes(image)) return;
    if (selected.length >= count) return;
    if (phase === "first") setFirstPick([...firstPick, image]);
    else setSecondPick([...secondPick, image]);
  };

  const redo = () => {
    setSecondPick([]);
    setPhase("second");
  };

  const submit = () => {
    const score = firstPick.length === 0 ? 0 : Math.round(
      (secondPick.filter((x, i) => x === firstPick[i]).length / firstPick.length) * 100,
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
        <div className="game-progress">{started && !finished ? `CHALLENGE ${challenge + 1}/2` : "CONSISTENCY"}</div>
      </div>

      {!started && (
        <section className="game-intro">
          <div className="eyebrow">CONSISTENCY · REPEATABILITY</div>
          <h1>Can you repeat what you just did?</h1>
          <p>
            First choose the images in an order that feels natural. Then repeat the same selection
            in exactly the same order. Your consistency is based on how closely the second attempt
            matches the first—not how quickly you tap.
          </p>
          <div className="rule-pills"><span>5 images</span><span>Then 7</span><span>Order matters</span></div>
          <button className="btn btn-primary" onClick={start}>Start Consistency</button>
        </section>
      )}

      {started && !finished && (
        <section className="game-stage">
          <div className="target-card">
            <span>{phase === "first" ? "CHOOSE YOUR ORDER" : "REPEAT YOUR ORDER"}</span>
            <strong>{selected.length}/{count}</strong>
          </div>

          <p className="game-hint">
            {phase === "first"
              ? `Choose ${count} images from the set. There is no speed test. The order you create becomes your pattern.`
              : `Now repeat the exact same ${count} images in the same order. Do not rely on speed.`}
          </p>

          <div className="consistency-image-grid">
            {images.map((image) => (
              <button
                key={image}
                className={`consistency-image ${selected.includes(image) ? "selected" : ""}`}
                onClick={() => choose(image)}
              >
                <span>{image}</span>
                {selected.includes(image) && <small>{selected.indexOf(image) + 1}</small>}
              </button>
            ))}
          </div>

          {selected.length === count && phase === "first" && (
            <button className="btn btn-primary" onClick={redo}>Repeat the order</button>
          )}
          {selected.length === count && phase === "second" && (
            <button className="btn btn-primary" onClick={submit}>Check consistency</button>
          )}

          <div className="live-stats">
            <span>CHALLENGE <b>{challenge + 1}/2</b></span>
            <span>IMAGES <b>{count}</b></span>
            <span>PREVIOUS <b>{scores.length ? `${scores[scores.length - 1]}%` : "—"}</b></span>
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
            <div><strong>2</strong><span>challenges</span></div>
          </div>
          <p>
            This score reflects how reliably you reproduced your own decisions. The aim is not to
            tap faster; it is to create a pattern and reproduce it accurately.
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
