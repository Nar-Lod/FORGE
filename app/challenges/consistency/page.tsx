"use client";

import { useMemo, useState } from "react";
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
import { getServerAdaptiveLevel } from "../../../lib/forge-adaptive-client";

const ITEMS = ["●", "■", "▲", "◆", "★", "✚", "✦", "⬟", "⬢", "✿", "☀", "❖"];
const LEVELS = [2, 3, 4, 5, 6, 7, 8];

function shuffle<T>(items: T[]) { return [...items].sort(() => Math.random() - 0.5); }
function makeSet(count = 10) { return shuffle(ITEMS).slice(0, count); }
function rearrangeBoard(board: string[], remembered: string[]) {
  let result = shuffle(board);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    result = shuffle(board);
    if (remembered.every(item => result.indexOf(item) !== board.indexOf(item))) return result;
  }
  return [...board.slice(1), board[0]];
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
  const [credits, setCredits] = useState(0);
  const [revealing, setRevealing] = useState(false);
  const [levelAttempts, setLevelAttempts] = useState(0);
  const [levelReveals, setLevelReveals] = useState(0);
  const [recoveryLevels, setRecoveryLevels] = useState(0);
  const [sessionId, setSessionId] = useState("");
  const [adaptive, setAdaptive] = useState<AdaptiveState>({
    level: 1,
    upStreak: 0,
    downStreak: 0,
    history: [],
  });

  const count = LEVELS[level];
  const selected = phase === "first" ? firstPick : secondPick;

  const beginLevel = (index: number) => {
    setLevel(index);
    setImages(makeSet());
    setFirstPick([]);
    setSecondPick([]);
    setPhase("first");
    setLevelAttempts(0);
    setLevelReveals(0);
    setRevealing(false);
  };

  const start = async () => {
    setStarted(true);
    setFinished(false);
    setScores([]);
    setRecoveryLevels(0);
    setCredits(getCredits());

    const adaptiveConfig = getAdaptiveProfile("consistency");
    const localLevel = chooseInitialDifficulty("consistency", adaptiveConfig);
    const initialLevel = await getServerAdaptiveLevel("consistency", localLevel);
    setAdaptive({
      level: initialLevel,
      upStreak: 0,
      downStreak: 0,
      history: [],
    });
    const nextSession = startForgeSession("consistency", "consistency", {
      startingLevel: initialLevel,
    });
    setSessionId(nextSession);
    beginLevel(initialLevel - 1);
  };

  const choose = (image: string) => {
    if (selected.includes(image) || selected.length >= count) return;
    if (phase === "first") setFirstPick((v) => [...v, image]);
    else setSecondPick((v) => [...v, image]);
  };

  const redo = () => {
    setImages(rearrangeBoard(images, firstPick));
    setSecondPick([]);
    setPhase("second");
  };

  const reveal = () => {
    if (phase !== "second" || revealing || credits < REVEAL_COST) return;
    if (!spendCredits(REVEAL_COST)) return;
    setCredits(getCredits());
    setLevelReveals((v) => v + 1);
    if (sessionId) {
      recordEvent({
        sessionId,
        skill: "consistency",
        game: "consistency",
        event: "reveal_used",
        difficulty: difficultySnapshot(level + 1),
        payload: { credits: REVEAL_COST },
      });
    }
    setRevealing(true);
    window.setTimeout(() => setRevealing(false), 2500);
  };

  const submit = () => {
    if (secondPick.length !== count) return;
    const score = Math.round((secondPick.filter((item, i) => item === firstPick[i]).length / count) * 100);
    const attempt = levelAttempts + 1;
    setLevelAttempts(attempt);

    if (sessionId) {
      recordEvent({
        sessionId,
        skill: "consistency",
        game: "consistency",
        event: "trial_completed",
        difficulty: difficultySnapshot(level + 1),
        payload: {
          score,
          attempt,
          reveals: levelReveals,
          sequenceLength: count,
        },
      });
    }

    if (score < 100) {
      setRecoveryLevels((v) => v + 1);
      if (sessionId) {
        recordEvent({
          sessionId,
          skill: "consistency",
          game: "consistency",
          event: "recovery",
          difficulty: difficultySnapshot(level + 1),
          payload: { score, attempt },
        });
      }
      setSecondPick([]);
      return;
    }

    const performance =
      (attempt === 1 ? 1 : 0.72) *
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

    const nextScores = [...scores, score];
    setScores(nextScores);

    if (sessionId) {
      applyCrossSkillTransfer("consistency", "persistence", performance * 0.15 - 0.075);

      updateSkillModel(
        "consistency",
        performance,
        adaptiveResult.decision.level,
        true,
        {
          accuracy: score / 100,
          memoryLoad: Math.min(1, count / 8),
          recovery: attempt === 1 ? 1 : Math.max(0, 1 - (attempt - 1) * 0.15),
          consistency: nextScores.length > 1
            ? Math.min(...nextScores) / 100
            : score / 100,
          difficulty: (count / 8) * 0.75 + (levelReveals === 0 ? 0.25 : 0),
        },
      );
      recordEvent({
        sessionId,
        skill: "consistency",
        game: "consistency",
        event: "difficulty_changed",
        difficulty: difficultySnapshot(adaptiveResult.decision.level),
        payload: {
          direction: adaptiveResult.decision.direction,
          performance,
        },
      });
    }

    if (adaptiveResult.decision.level === LEVELS.length) {
      setFinished(true);
      if (sessionId) {
        recordEvent({
          sessionId,
          skill: "consistency",
          game: "consistency",
          event: "session_completed",
          difficulty: difficultySnapshot(LEVELS.length),
          payload: {
            mastery: Math.round((nextScores.reduce((sum, value) => sum + value, 0) / nextScores.length)),
            reveals: levelReveals,
          },
        });
      }
    } else {
      beginLevel(adaptiveResult.decision.level - 1);
    }
  };

  const mastery = useMemo(() => {
    if (!scores.length) return 0;
    const weightedLevels = scores.map((score, i) => {
      const lengthWeight = Math.pow(LEVELS[i] / LEVELS[0], 1.35);
      const positionIndependence = i >= 3 ? 1.12 : 1;
      const repeatedPerformance = i > 0
        ? 0.92 + (0.08 * Math.min(score, scores[i - 1]) / 100)
        : 1;
      return { score, weight: lengthWeight * positionIndependence * repeatedPerformance };
    });
    const weighted = weightedLevels.reduce((sum, item) => sum + item.score * item.weight, 0);
    const totalWeight = weightedLevels.reduce((sum, item) => sum + item.weight, 0);
    const recoveryFactor = 1 - Math.min(0.08, recoveryLevels * 0.01);
    return Math.round((weighted / totalWeight) * recoveryFactor);
  }, [scores, recoveryLevels]);

  return <main className="game-shell">
    <div className="game-topbar">
      <Link href="/" className="game-back">← FORGE</Link>
      <div className="game-progress">{started && !finished ? "LEVEL " + (level + 1) + "/" + LEVELS.length : "CONSISTENCY"}</div>
    </div>

    {!started && <section className="game-intro">
      <div className="eyebrow">CONSISTENCY · POSITION-INDEPENDENT MEMORY</div>
      <h1>Remember the objects, not the slots.</h1>
      <p>Choose your own sequence. Then the board is deliberately rearranged so your original order must be reconstructed from the individual shapes themselves.</p>
      <div className="rule-pills"><span>2 → 8 items</span><span>10-object board</span><span>Position independence</span><span>Recovery matters</span></div>
      <button className="btn btn-primary" onClick={start}>Start Consistency</button>
    </section>}

    {started && !finished && <section className="game-stage">
      <div className="target-card">
        <span>{phase === "first" ? "CREATE YOUR PATTERN" : "REBUILD YOUR PATTERN"}</span>
        <strong>{selected.length}/{count}</strong>
        <small>{phase === "second" ? `ATTEMPT ${levelAttempts + 1}` : "Choose your sequence"}</small>
      </div>
      <p className="game-hint">{phase === "first" ? `Choose ${count} different objects in any order. Remember their shape and identity.` : "The remembered objects moved. Find the same objects and tap them in the exact order you created before."}</p>
      <div className="consistency-image-grid">
        {images.map((image, i) => <button key={image + "-" + i} type="button" className={"consistency-image " + (selected.includes(image) ? "selected" : "")} onClick={() => choose(image)} aria-label={"Choose " + image}><span>{image}</span>{selected.includes(image) && <small>{selected.indexOf(image) + 1}</small>}</button>)}
      </div>

      {selected.length === count && phase === "first" && <button className="btn btn-primary" onClick={redo}>Rearrange board</button>}

      {selected.length === count && phase === "second" && <>
        <div className="reveal-bar">
          <button type="button" className="reveal-button" disabled={credits < REVEAL_COST || revealing} onClick={reveal}><span>REVEAL</span><b>−{REVEAL_COST} CREDIT</b></button>
          <span className="credit-balance">CREDITS <b>{credits}</b></span>
          {levelReveals > 0 && <span className="assisted-label">ASSISTED</span>}
        </div>
        {revealing && <div className="reveal-panel consistency-reveal"><span>MEMORY ASSIST · ORIGINAL ORDER</span><div className="reveal-sequence">{firstPick.map((image, i) => <div key={image} className="reveal-item"><b>{image}</b><small>{i + 1}</small></div>)}</div></div>}
        <button className="btn btn-primary" onClick={submit}>Submit sequence</button>
      </>}

      {phase === "second" && levelAttempts > 0 && secondPick.length === 0 && <div className="persistence-recovery consistency-recovery"><div><b>Recover, don&apos;t restart.</b><p>Your order was not exact. The board stays rearranged. Try the same level again and strengthen the sequence.</p></div></div>}

      <div className="live-stats"><span>LEVEL <b>{level + 1}</b></span><span>ITEMS <b>{count}</b></span><span>PREVIOUS <b>{scores.length ? scores[scores.length - 1] + "%" : "—"}</b></span><span>CREDITS <b>{credits}</b></span></div>
    </section>}

    {finished && <section className="result-card">
      <div className="eyebrow">CONSISTENCY COMPLETE</div>
      <div className="result-score">{mastery}%</div>
      <div className="result-label">CONSISTENCY MASTERY</div>
      <div className="result-stats">{scores.map((score, i) => <div key={LEVELS[i]}><strong>{score}%</strong><span>{LEVELS[i]}-item match</span></div>)}</div>
      <p>Mastery weights sequence length, position independence and stable repeated performance instead of treating an easy 2-item level as equal to an 8-item challenge. Recovery attempts are tracked separately so improvement after mistakes can become part of the analytics layer.</p>
      <div className="cta-row"><button className="btn btn-primary" onClick={start}>Try again</button><Link href="/" className="btn btn-secondary">I&apos;m done</Link></div>
    </section>}
  </main>;
}