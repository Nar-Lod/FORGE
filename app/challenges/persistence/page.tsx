"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { REVEAL_COST, getCredits, spendCredits } from "../../../lib/forge-credits";
import {
  recordEvent,
  startForgeSession,
  updateSkillModel,
  applyCrossSkillTransfer,
} from "../../../lib/forge-analytics";
import {
  chooseInitialDifficulty,
  difficultySnapshot,
  getAdaptiveProfile,
  updateAdaptiveState,
  type AdaptiveState,
} from "../../../lib/forge-adaptive";
import { generateSequence, type SequenceSymbol } from "../../../lib/forge-sequences";

type Item = { id: string; shape: string; color: string };

const LEVELS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const LEVEL_CONFIG = [
  { exposurePerItem: 1900, buffer: 700, manual: true, decoys: 2 },
  { exposurePerItem: 1700, buffer: 700, manual: true, decoys: 2 },
  { exposurePerItem: 1500, buffer: 650, manual: true, decoys: 3 },
  { exposurePerItem: 2700, buffer: 1200, manual: false, decoys: 3 },
  { exposurePerItem: 2500, buffer: 1100, manual: false, decoys: 3 },
  { exposurePerItem: 2300, buffer: 1000, manual: false, decoys: 4 },
  { exposurePerItem: 2100, buffer: 900, manual: false, decoys: 4 },
  { exposurePerItem: 980, buffer: 450, manual: false, decoys: 4 },
  { exposurePerItem: 900, buffer: 400, manual: false, decoys: 4 },
  { exposurePerItem: 820, buffer: 400, manual: false, decoys: 4 },
];

const SHAPES = ["●", "■", "▲", "◆", "⬟", "⬢", "★", "✚", "✦", "⬣", "✿", "☀"];
const COLORS = [
  "red", "blue", "green", "yellow", "purple", "orange",
  "pink", "cyan", "lime", "violet", "teal", "coral",
];

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// The identity of an item is always shape + colour.
// Each level uses unique shapes and unique colours, eliminating visual ambiguity.
const SEQUENCE_POOL: SequenceSymbol[] = SHAPES.flatMap((shape) =>
  COLORS.map((color) => ({
    id: `${shape}-${color}`,
    family: shape,
    value: color,
  })),
);

function makeSequence(length: number) {
  const generated = generateSequence(SEQUENCE_POOL, {
    length,
    uniqueFamily: true,
    uniqueValue: true,
    noAdjacentFamily: true,
    noAdjacentValue: true,
  });

  return {
    items: generated.items.map((item) => {
      const [shape, color] = item.id.split("-");
      return { id: item.id, shape, color };
    }),
    difficulty: generated.difficulty,
  };
}

const same = (a: Item, b: Item) => a.id === b.id;

function playFeedback(kind: "success" | "error" | "milestone") {
  try {
    if ("vibrate" in navigator) {
      navigator.vibrate(kind === "error" ? [35, 25, 35] : kind === "milestone" ? [25, 40, 70] : 25);
    }
  } catch {
    // Haptics are optional and must never block gameplay.
  }

  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = kind === "error" ? 180 : kind === "milestone" ? 620 : 440;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (kind === "milestone" ? 0.22 : 0.11));
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + (kind === "milestone" ? 0.24 : 0.13));
    oscillator.onended = () => void ctx.close();
  } catch {
    // Audio is optional and browser autoplay policies may block it.
  }
}

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
  const [levelMisses, setLevelMisses] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [lastResult, setLastResult] = useState<"correct" | "wrong" | null>(null);
  const [replacementIndex, setReplacementIndex] = useState<number | null>(null);
  const [levelAttempts, setLevelAttempts] = useState(0);
  const [levelsCleared, setLevelsCleared] = useState(0);
  const [firstTryClears, setFirstTryClears] = useState(0);
  const [lastLevelPoints, setLastLevelPoints] = useState(0);
  const [credits, setCredits] = useState(0);
  const [revealing, setRevealing] = useState(false);
  const [levelReveals, setLevelReveals] = useState(0);
  const [totalReveals, setTotalReveals] = useState(0);
  const [sequenceDifficulty, setSequenceDifficulty] = useState(0);
  const [sessionId, setSessionId] = useState("");
  const [adaptive, setAdaptive] = useState<AdaptiveState>({
    level: 1,
    upStreak: 0,
    downStreak: 0,
    history: [],
  });

  const length = LEVELS[level];
  const config = LEVEL_CONFIG[level];
  const manual = config.manual;

  useEffect(() => {
    setBest(Number(window.localStorage.getItem("forge.persistence.best") || 0));
    setCredits(getCredits());
  }, []);

  const startLevel = (levelIndex: number) => {
    const nextLength = LEVELS[levelIndex];
    const generated = makeSequence(nextLength);
    setLevel(levelIndex);
    setSequence(generated.items);
    setSequenceDifficulty(generated.difficulty);
    setAnswer([]);
    setSubmitted(false);
    setLastResult(null);
    setReplacementIndex(null);
    setLevelAttempts(0);
    setLevelMisses(0);
    setLevelReveals(0);
    setRevealing(false);
    setShowing(true);
  };

  const begin = () => {
    setStarted(true);
    setFinished(false);
    setScore(0);
    setWrong(0);
    setLevelsCleared(0);
    setFirstTryClears(0);
    setLastLevelPoints(0);
    setTotalReveals(0);

    const adaptiveConfig = getAdaptiveProfile("persistence");
    const initialLevel = chooseInitialDifficulty("persistence", adaptiveConfig);
    setAdaptive({
      level: initialLevel,
      upStreak: 0,
      downStreak: 0,
      history: [],
    });
    const nextSession = startForgeSession("persistence", "persistence", {
      startingLevel: initialLevel,
    });
    setSessionId(nextSession);
    startLevel(initialLevel - 1);
  };

  useEffect(() => {
    if (!started || !showing || manual) return;
    const duration = config.buffer + length * config.exposurePerItem;
    const timer = window.setTimeout(() => setShowing(false), duration);
    return () => window.clearTimeout(timer);
  }, [started, showing, manual, length, config.buffer, config.exposurePerItem]);

  const reveal = () => {
    if (showing || finished || revealing || credits < REVEAL_COST) return;
    if (!spendCredits(REVEAL_COST)) return;
    setCredits(getCredits());
    setLevelReveals((current) => current + 1);
    setTotalReveals((current) => current + 1);
    if (sessionId) {
      recordEvent({
        sessionId,
        skill: "persistence",
        game: "persistence",
        event: "reveal_used",
        difficulty: difficultySnapshot(level + 1),
        payload: { credits: REVEAL_COST },
      });
    }
    setRevealing(true);
    window.setTimeout(() => setRevealing(false), 2500);
  };

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
      if (answer.some((selected, index) => index !== replacementIndex && same(selected, item))) return;
      setAnswer((current) => current.map((selected, index) => index === replacementIndex ? item : selected));
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
    if (answer.length !== length || replacementIndex !== null) return;

    const attemptNumber = levelAttempts + 1;
    setLevelAttempts(attemptNumber);
    const correct = answer.every((item, index) => same(item, sequence[index]));
    setSubmitted(true);

    if (sessionId) {
      recordEvent({
        sessionId,
        skill: "persistence",
        game: "persistence",
        event: "trial_completed",
        difficulty: difficultySnapshot(level + 1),
        payload: {
          correct,
          attempt: attemptNumber,
          reveals: levelReveals,
          sequenceLength: length,
          correctPositions: correctCount,
          sequenceDifficulty,
        },
      });
    }

    if (!correct) {
      setWrong((current) => current + 1);
      setLevelMisses((current) => current + 1);
      setLastResult("wrong");
      setReplacementIndex(null);
      if (sessionId) {
        recordEvent({
          sessionId,
          skill: "persistence",
          game: "persistence",
          event: "recovery",
          difficulty: difficultySnapshot(level + 1),
          payload: {
            attempt: attemptNumber,
            correctPositions: correctCount,
          },
        });
      }
      playFeedback("error");
      return;
    }

    setLastResult("correct");
    setReplacementIndex(null);

    // Harder levels are worth more. A clean first attempt earns a meaningful bonus;
    // recovery still earns progress without rewarding repeated guessing.
    const basePoints = 70 + length * 22;
    const firstTryBonus = attemptNumber === 1 && levelReveals === 0 ? 45 : 0;
    const cleanBonus = levelMisses === 0 && attemptNumber === 1 && levelReveals === 0 ? 20 : 0;
    const levelPoints = basePoints + firstTryBonus + cleanBonus;
    const nextScore = score + levelPoints;

    setScore(nextScore);
    setLastLevelPoints(levelPoints);
    setLevelsCleared((current) => current + 1);
    if (attemptNumber === 1) setFirstTryClears((current) => current + 1);
    playFeedback(level === LEVELS.length - 1 ? "milestone" : "success");

    const performance =
      (attemptNumber === 1 ? 1 : 0.72) *
      (levelReveals > 0 ? 0.55 : 1);

    const adaptiveResult = updateAdaptiveState(
      adaptive,
      performance,
      {
        minLevel: 1,
        maxLevel: LEVELS.length,
        startingLevel: 1,
        bands: LEVELS.map((items, index) => ({
          level: index + 1,
          minPerformance: 0,
          maxPerformance: 1,
        })),
        upThreshold: 0.9,
        downThreshold: 0.55,
        consecutiveUp: 1,
        consecutiveDown: 2,
      },
    );
    setAdaptive(adaptiveResult.state);

    if (sessionId) {
      applyCrossSkillTransfer("persistence", "consistency", performance * 0.2 - 0.1);

      updateSkillModel(
        "persistence",
        performance,
        adaptiveResult.decision.level,
        true,
        {
          accuracy: correctCount / Math.max(1, length),
          memoryLoad: Math.min(1, length / 12),
          recovery: attemptNumber === 1 ? 1 : Math.max(0, 1 - (attemptNumber - 1) * 0.15),
          consistency: levelReveals === 0 ? 1 : 0.5,
          difficulty: sequenceDifficulty,
        },
      );
      recordEvent({
        sessionId,
        skill: "persistence",
        game: "persistence",
        event: "difficulty_changed",
        difficulty: difficultySnapshot(adaptiveResult.decision.level),
        payload: {
          direction: adaptiveResult.decision.direction,
          performance,
        },
      });
    }

    if (adaptiveResult.decision.level === LEVELS.length) {
      setBest((current) => {
        const next = Math.max(current, nextScore);
        window.localStorage.setItem("forge.persistence.best", String(next));
        return next;
      });
      setFinished(true);
      if (sessionId) {
        recordEvent({
          sessionId,
          skill: "persistence",
          game: "persistence",
          event: "session_completed",
          difficulty: difficultySnapshot(LEVELS.length),
          payload: {
            score: nextScore,
            levelsCleared: levelsCleared + 1,
            reveals: totalReveals,
          },
        });
      }
      return;
    }

    const nextLevel = adaptiveResult.decision.level - 1;
    window.setTimeout(() => startLevel(nextLevel), 900);
  };

  const options = useMemo(() => {
    if (!sequence.length) return [];

    const usedShapes = new Set(sequence.map((item) => item.shape));
    const usedColors = new Set(sequence.map((item) => item.color));
    const unusedShapes = shuffle(SHAPES.filter((shape) => !usedShapes.has(shape)));
    const unusedColors = shuffle(COLORS.filter((color) => !usedColors.has(color)));

    const decoys: Item[] = [];
    const count = Math.min(config.decoys, unusedShapes.length, unusedColors.length);
    for (let i = 0; i < count; i += 1) {
      decoys.push({
        id: `${unusedShapes[i]}-${unusedColors[i]}`,
        shape: unusedShapes[i],
        color: unusedColors[i],
      });
    }

    return shuffle([...sequence, ...decoys]);
  }, [sequence, config.decoys]);

  const maxPossibleScore = LEVELS.reduce((total, items, index) => total + 70 + items * 22 + 45 + 20, 0);
  const masteryPercent = Math.round((score / maxPossibleScore) * 100);
  const firstTryRate = levelsCleared ? Math.round((firstTryClears / levelsCleared) * 100) : 0;

  return (
    <main className="game-shell">
      <div className="game-topbar">
        <Link href="/" className="game-back">← FORGE</Link>
        <div className="game-progress">
          {started && !finished ? `LEVEL ${level + 1}/${LEVELS.length}` : "PERSISTENCE"}
        </div>
      </div>

      {!started && (
        <section className="game-intro">
          <div className="eyebrow">PERSISTENCE · SEQUENCE MEMORY</div>
          <h1>Remember. Arrange. Adapt.</h1>
          <p>
            Build persistence by holding a growing sequence in memory, reconstructing it under pressure,
            correcting mistakes and advancing when you are ready.
          </p>
          <div className="rule-pills">
            <span>3 → 12 unique items</span>
            <span>Unique shape + colour</span>
            <span>Timed pressure increases</span>
            <span>Recovery matters</span>
          </div>
          <button className="btn btn-primary" onClick={begin}>Start Persistence</button>
        </section>
      )}

      {started && !finished && (
        <section className="game-stage">
          <div className="target-card persistence-target">
            <span>{showing ? "MEMORIZE" : "REBUILD"} · LEVEL {level + 1}</span>
            <strong>{showing ? `${length} ITEMS` : `${answer.length}/${length}`}</strong>
            <small>{showing && !manual ? `Timed · ${(config.buffer + length * config.exposurePerItem) / 1000}s` : manual ? "Study at your pace" : "Reconstruct from memory"}</small>
          </div>

          {showing && (
            <>
              <div className="persistence-sequence-frame">
                <div className="persistence-sequence-label">SEQUENCE</div>
                <div className="focus-grid sequence-grid">
                  {sequence.map((item, index) => (
                    <div key={item.id} className={`focus-cell sequence-cell ${item.color}`} aria-label={`Sequence item ${index + 1}`}>
                      <span>{item.shape}</span>
                      <small>{index + 1}</small>
                    </div>
                  ))}
                </div>
              </div>
              {manual && <button className="btn btn-primary" onClick={arrange}>I&apos;ve got it — Arrange</button>}
              {!manual && (
                <div className="auto-disappear-notice" role="status">
                  <span>⚡ AUTO-DISAPPEAR</span>
                  <strong>WATCH THE SEQUENCE — IT DISAPPEARS AUTOMATICALLY.</strong>
                  <small>Use the study window. When it ends, you rebuild from memory.</small>
                </div>
              )}
            </>
          )}

          {!showing && (
            <>
              <div className="persistence-instruction">
                <span>{replacementIndex !== null ? "REPLACE A POSITION" : "REBUILD THE SEQUENCE"}</span>
                <strong>{replacementIndex !== null ? `Choose what belongs in position ${replacementIndex + 1}` : "Shape + colour + order"}</strong>
              </div>

              <div className="option-grid persistence-options">
                {options.map((item) => {
                  const alreadySelected = answer.some((selected) => same(selected, item));
                  return (
                    <button
                      key={item.id}
                      disabled={(submitted && lastResult === "correct") || (replacementIndex === null && alreadySelected)}
                      className={`switch-tile sequence-option ${item.color} ${alreadySelected ? "selected-option" : ""}`}
                      onClick={() => choose(item)}
                      aria-label={`Choose ${item.shape} ${item.color}`}
                    >
                      <span>{item.shape}</span>
                    </button>
                  );
                })}
              </div>

              <div className="answer-strip persistence-answer-strip">
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
                <p className="game-hint replacement-hint">Position {replacementIndex + 1} is selected. Choose its replacement above.</p>
              )}

              <div className="reveal-bar">
                <button type="button" className="reveal-button" disabled={credits < REVEAL_COST || revealing || (submitted && lastResult === "correct")} onClick={reveal}>
                  <span>REVEAL</span>
                  <b>−{REVEAL_COST} CREDIT</b>
                </button>
                <span className="credit-balance">CREDITS <b>{credits}</b></span>
                {levelReveals > 0 && <span className="assisted-label">ASSISTED · {levelReveals}</span>}
              </div>

              {revealing && (
                <div className="reveal-panel">
                  <span>MEMORY ASSIST · {length} ITEMS</span>
                  <div className="reveal-sequence">
                    {sequence.map((item, index) => (
                      <div key={item.id} className={`reveal-item ${item.color}`}>
                        <b>{item.shape}</b><small>{index + 1}</small>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                className="btn btn-primary persistence-submit"
                disabled={answer.length !== length || replacementIndex !== null || (submitted && lastResult === "correct")}
                onClick={submit}
              >
                {lastResult === "correct"
                  ? level === LEVELS.length - 1 ? "Complete" : "Correct — Next Level"
                  : submitted && lastResult === "wrong" ? "Submit corrected arrangement" : "Submit arrangement"}
              </button>

              {submitted && lastResult === "wrong" && (
                <div className="persistence-recovery">
                  <div className="recovery-score">
                    <strong>{correctCount}/{length}</strong>
                    <span>positions correct</span>
                  </div>
                  <div>
                    <b>Recover, don&apos;t restart.</b>
                    <p>Tap any position you want to change, then choose its replacement. The sequence stays hidden.</p>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="live-stats persistence-live-stats">
            <span>LEVEL <b>{level + 1}</b></span>
            <span>ITEMS <b>{length}</b></span>
            <span>SCORE <b>{score}</b></span>
            <span>MISSES <b>{wrong}</b></span>
            <span>LAST <b>+{lastLevelPoints}</b></span><span>CREDITS <b>{credits}</b></span>
          </div>

          <p className="game-hint persistence-footer-hint">
            {showing
              ? manual
                ? "Study every shape, colour and its exact order. You control when the sequence disappears."
                : "The study window is shrinking per item as the levels rise. Hold the whole sequence, not just individual objects."
              : "Rebuild the exact sequence. A mistake is information: correct it and keep moving."}
          </p>
        </section>
      )}

      {finished && (
        <section className="result-card persistence-result-card">
          <div className="eyebrow">PERSISTENCE COMPLETE</div>
          <div className="result-score">{score}</div>
          <div className="result-label">MEMORY PERSISTENCE SCORE</div>

          <div className="persistence-mastery">
            <div>
              <span>MASTERY</span>
              <strong>{masteryPercent}%</strong>
            </div>
            <div>
              <span>FIRST-TRY CLEARS</span>
              <strong>{firstTryRate}%</strong>
            </div>
            <div>
              <span>MISSES</span>
              <strong>{wrong}</strong>
            </div>
          </div>

          <div className="result-stats">
            <div><strong>{LEVELS.length}</strong><span>levels cleared</span></div>
            <div><strong>3→12</strong><span>item range</span></div>
            <div><strong>{best}</strong><span>best score</span></div>
          </div>

          <p>
            You moved from deliberate memorization into timed pressure, longer sequences and recovery from mistakes.
            Your score rewards difficult levels and clean first attempts without making failure a dead end.
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
