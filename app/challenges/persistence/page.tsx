"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Item = { id: string; shape: string; color: string };

const LEVELS = [5, 6, 7, 8, 9, 10, 11, 12];
const SHAPES = ["●", "■", "▲", "◆", "⬟", "⬢", "★", "✚", "✦", "⬣", "✿", "☀"];
const COLORS = ["red", "blue", "green", "yellow", "purple", "orange"];

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Persistence deliberately uses unique SHAPES and unique COLOURS within
// every level. The player must never have to distinguish two items by a
// hidden code that looks identical on screen.
function makeSequence(length: number): Item[] {
  const count = Math.min(length, Math.min(SHAPES.length, COLORS.length));
  const shapes = shuffle(SHAPES).slice(0, count);
  const colors = shuffle(COLORS).slice(0, count);

  return shuffle(
    shapes.map((shape, index) => ({
      id: `${shape}-${colors[index]}`,
      shape,
      color: colors[index],
    })),
  );
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
  const [replacementIndex, setReplacementIndex] = useState<number | null>(null);

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
    setReplacementIndex(null);
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
    setReplacementIndex(null);
  };

  const choose = (item: Item) => {
    if (showing || finished || (submitted && lastResult === "correct")) return;

    if (replacementIndex !== null) {
      setAnswer((current) =>
        current.map((selected, index) =>
          index === replacementIndex ? item : selected,
        ),
      );
      setReplacementIndex(null);
      setSubmitted(false);
      setLastResult(null);
      return;
    }

    if (answer.length >= length || answer.some((selected) => same(selected, item))) return;
    setSubmitted(false);
    setLastResult(null);
    setAnswer((current) => [...current, item]);
  };

  const selectSlotForReplacement = (index: number) => {
    if (finished || (submitted && lastResult === "correct")) return;
    setReplacementIndex(index);
    setSubmitted(false);
    setLastResult(null);
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
      setReplacementIndex(null);
      return;
    }

    setLastResult("correct");
    setReplacementIndex(null);
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

  // Build a completely distinct decoy pool too: no two visible options share
  // a shape OR a colour. This prevents the interface itself from creating
  // ambiguous choices for the player.
  const options = useMemo(() => {
    if (!sequence.length) return [];

    const usedShapes = new Set(sequence.map((item) => item.shape));
    const usedColors = new Set(sequence.map((item) => item.color));
    const unusedShapes = shuffle(SHAPES.filter((shape) => !usedShapes.has(shape)));
    const unusedColors = shuffle(COLORS.filter((color) => !usedColors.has(color)));

    const decoys: Item[] = [];
    const count = Math.min(unusedShapes.length, unusedColors.length, 4);
    for (let i = 0; i < count; i += 1) {
      decoys.push({
        id: `${unusedShapes[i]}-${unusedColors[i]}`,
        shape: unusedShapes[i],
        color: unusedColors[i],
      });
    }

    return shuffle([...sequence, ...decoys]);
  }, [sequence]);

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
            Every level uses visually distinct shapes and colours. You must remember
            the exact sequence rather than relying on ambiguous look-alike objects.
          </p>
          <div className="rule-pills">
            <span>5 → 12 unique items</span>
            <span>Distinct shape + colour</span>
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
                {options.map((item) => {
                  const alreadySelected = answer.some((selected) => same(selected, item));
                  return (
                    <button
                      key={item.id}
                      disabled={
                        (submitted && lastResult === "correct") ||
                        (replacementIndex === null && alreadySelected)
                      }
                      className={`switch-tile sequence-option ${item.color} ${alreadySelected ? "selected-option" : ""}`}
                      onClick={() => choose(item)}
                    >
                      <span>{item.shape}</span>
                    </button>
                  );
                })}
              </div>

              <div className="answer-strip">
                {Array.from({ length }).map((_, index) => {
                  const item = answer[index];
                  const replacing = replacementIndex === index;
                  return (
                    <button
                      key={`slot-${index}`}
                      className={`correction-slot ${item ? item.color : "empty"} ${replacing ? "replacement-active" : ""}`}
                      onClick={() => item && selectSlotForReplacement(index)}
                      disabled={!item || (submitted && lastResult === "correct")}
                      aria-label={item ? `Replace item ${index + 1}` : `Empty position ${index + 1}`}
                    >
                      {item ? <span>{item.shape}</span> : <span>+</span>}
                      <small>{index + 1}</small>
                    </button>
                  );
                })}
              </div>

              {replacementIndex !== null && (
                <p className="game-hint">
                  Position {replacementIndex + 1} is selected. Choose its replacement from the board.
                </p>
              )}

              <button
                className="btn btn-primary"
                disabled={answer.length !== length || replacementIndex !== null || (submitted && lastResult === "correct")}
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
                    Tap a selected position to replace it, then choose the replacement from the distinct items above.
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
                ? "Study every shape, colour and its order. Press Arrange when you have memorized the complete sequence."
                : "Study the complete sequence. Every item has a unique shape and colour. It will disappear automatically."
              : "Rebuild the exact sequence. Every visible choice is visually distinct in both shape and colour."}
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
            You progressed from deliberate study into timed memory pressure while adapting to longer sequences.
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
