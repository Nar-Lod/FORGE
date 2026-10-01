"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FOCUS_LIBRARIES, FOCUS_MODES, type FocusItem } from "../../../lib/focus-library";
import { generateFocusChallenge, focusDifficultyForLevel, type FocusChallenge } from "../../../lib/focus-generator";
import { FORGE_CONFIG } from "../../../lib/forge-config";
import {
  recordEvent,
  startForgeSession,
  updateSkillModel,
  applyCrossSkillTransfer,
} from "../../../lib/forge-analytics";
import {
  difficultySnapshot,
  getAdaptiveProfile,
  updateAdaptiveState,
  type AdaptiveState,
} from "../../../lib/forge-adaptive";

const { rounds: ROUNDS, gridSize: GRID_SIZE } = FORGE_CONFIG.focus;
type Phase = "ready" | "visible" | "wait";

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function visualStyle(index: number, target: boolean, challenge: FocusChallenge) {
  const cell = challenge.cells[index];
  const hue = (index * 31 + cell.variant.hueShift + 360) % 360;

  return {
    "--focus-hue": hue,
    "--focus-rotation": `${target ? 0 : cell.variant.rotation}deg`,
    "--focus-scale": target ? 1 : cell.variant.scale,
    "--focus-opacity": target ? 1 : cell.variant.opacity,
    "--focus-similarity": cell.similarity,
    "--focus-surface": `hsl(${hue} 70% 94%)`,
    "--focus-ink": `hsl(${hue} 72% 35%)`,
  } as React.CSSProperties;
}

export default function FocusChallenge() {
  const [round, setRound] = useState(0);
  const [level, setLevel] = useState(FORGE_CONFIG.focus.startingLevel);
  const [mode, setMode] = useState("shapes");
  const [target, setTarget] = useState<FocusItem>(FOCUS_LIBRARIES.shapes[0]);
  const [targetCell, setTargetCell] = useState(-1);
  const [phase, setPhase] = useState<Phase>("ready");
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [hits, setHits] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [reactionTotal, setReactionTotal] = useState(0);
  const [reactionSamples, setReactionSamples] = useState<number[]>([]);
  const [shownAt, setShownAt] = useState(0);
  const [challenge, setChallenge] = useState<FocusChallenge | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [adaptive, setAdaptive] = useState<AdaptiveState>({
    level: FORGE_CONFIG.focus.startingLevel,
    upStreak: 0,
    downStreak: 0,
    history: [],
  });
  const timerRef = useRef<number | null>(null);

  const levelConfig = FORGE_CONFIG.focus.levels[level - 1];
  const visibleMs = levelConfig.reactionMs;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const recordRecovery = useCallback((nextRound: number) => {
    if (!sessionId) return;
    recordEvent({
      sessionId,
      skill: "focus",
      game: "focus",
      event: "recovery",
      difficulty: difficultySnapshot(level),
      performance: { recovery: 1 },
      payload: { afterMiss: true, nextRound },
    });
  }, [level, sessionId]);

  const advanceDifficulty = useCallback((wasCorrect: boolean) => {
    const result = updateAdaptiveState(
      adaptive,
      wasCorrect ? 1 : 0,
      getAdaptiveProfile("focus"),
    );

    setAdaptive(result.state);
    setLevel(result.decision.level);

    if (sessionId && result.decision.direction !== "hold") {
      recordEvent({
        sessionId,
        skill: "focus",
        game: "focus",
        event: "difficulty_changed",
        difficulty: difficultySnapshot(result.decision.level, 0.8),
        payload: {
          direction: result.decision.direction,
          performance: result.decision.targetPerformance,
          reason: result.decision.reason,
        },
      });
    }
  }, [adaptive, sessionId]);

  const endRound = useCallback((
    outcome: "hit" | "miss" | "false_positive" | "timeout",
    reaction?: number,
  ) => {
    clearTimer();

    const wasCorrect = outcome === "hit";
    const currentChallenge = challenge;
    const difficulty = currentChallenge?.difficulty ?? focusDifficultyForLevel(level);

    if (sessionId) {
      recordEvent({
        sessionId,
        skill: "focus",
        game: "focus",
        event: "trial_completed",
        difficulty: difficultySnapshot(level, currentChallenge?.structuralScore ?? 0.5),
        performance: {
          accuracy: wasCorrect ? 1 : 0,
          reactionControl: reaction === undefined
            ? 0
            : Math.max(0, Math.min(1, 1 - reaction / 3000)),
          consistency: streak / Math.max(1, ROUNDS),
          difficulty: currentChallenge?.structuralScore ?? level / 5,
        },
        payload: {
          outcome,
          reactionMs: reaction ?? null,
          targetSimilarity: difficulty.targetSimilarity,
          distractorSimilarity: difficulty.distractorSimilarity,
          distractorDiversity: difficulty.distractorDiversity,
          spatialUncertainty: difficulty.spatialUncertainty,
          spatialCompetition: difficulty.spatialCompetition,
          visualComplexity: difficulty.visualComplexity,
          temporalPressure: difficulty.temporalPressure,
        },
      });

      if (!wasCorrect) {
        recordEvent({
          sessionId,
          skill: "focus",
          game: "focus",
          event: "mistake",
          difficulty: difficultySnapshot(level, currentChallenge?.structuralScore ?? 0.5),
          payload: { reason: outcome },
        });
      }
    }

    advanceDifficulty(wasCorrect);

    if (wasCorrect) {
      setHits((value) => value + 1);
      setStreak((value) => {
        const next = value + 1;
        setBestStreak((best) => Math.max(best, next));
        return next;
      });
      if (reaction !== undefined) {
        setReactionTotal((value) => value + reaction);
        setReactionSamples((values) => [...values, reaction]);
      }
    } else {
      setMistakes((value) => value + 1);
      setStreak(0);
    }

    setPhase("wait");
    timerRef.current = window.setTimeout(() => {
      if (round >= ROUNDS - 1) {
        setFinished(true);
        setPhase("ready");
      } else {
        const nextRound = round + 1;
        setRound(nextRound);
        setPhase("ready");
        if (!wasCorrect) recordRecovery(nextRound);
      }
      timerRef.current = null;
    }, FORGE_CONFIG.focus.waitDurationMs);
  }, [
    advanceDifficulty,
    challenge,
    clearTimer,
    level,
    recordRecovery,
    round,
    sessionId,
    streak,
  ]);

  const createRound = useCallback(() => {
    clearTimer();

    const nextMode = pick(FOCUS_MODES);
    const nextLevel = level;
    const nextDifficulty = focusDifficultyForLevel(nextLevel);
    const nextChallenge = generateFocusChallenge({
      mode: nextMode,
      library: FOCUS_LIBRARIES[nextMode],
      gridSize: GRID_SIZE,
      level: nextLevel,
      difficulty: nextDifficulty,
    });

    setMode(nextMode);
    setTarget(nextChallenge.target);
    setTargetCell(nextChallenge.targetCell);
    setChallenge(nextChallenge);
    setPhase("visible");
    setShownAt(performance.now());

    if (sessionId) {
      recordEvent({
        sessionId,
        skill: "focus",
        game: "focus",
        event: "trial_started",
        difficulty: difficultySnapshot(nextLevel, nextChallenge.structuralScore),
        payload: {
          round,
          mode: nextMode,
          targetSimilarity: nextDifficulty.targetSimilarity,
          distractorSimilarity: nextDifficulty.distractorSimilarity,
          distractorDiversity: nextDifficulty.distractorDiversity,
          spatialUncertainty: nextDifficulty.spatialUncertainty,
          spatialCompetition: nextDifficulty.spatialCompetition,
          visualComplexity: nextDifficulty.visualComplexity,
          temporalPressure: nextDifficulty.temporalPressure,
        },
      });
    }

    timerRef.current = window.setTimeout(() => {
      endRound("timeout");
    }, visibleMs);
  }, [clearTimer, endRound, level, round, sessionId, visibleMs]);

  const start = () => {
    clearTimer();
    setStarted(true);
    setFinished(false);
    setRound(0);
    setLevel(FORGE_CONFIG.focus.startingLevel);
    setHits(0);
    setMistakes(0);
    setStreak(0);
    setBestStreak(0);
    setReactionTotal(0);
    setReactionSamples([]);
    setChallenge(null);

    const nextSession = startForgeSession("focus", "focus", {
      rounds: ROUNDS,
      gridSize: GRID_SIZE,
      difficultyModel: "perceptual-v1",
    });
    setSessionId(nextSession);
    setAdaptive({
      level: FORGE_CONFIG.focus.startingLevel,
      upStreak: 0,
      downStreak: 0,
      history: [],
    });
    setPhase("ready");

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      createRound();
    }, FORGE_CONFIG.focus.startDelayMs);
  };

  const choose = (index: number) => {
    if (!started || finished || phase !== "visible" || !challenge) return;
    const reaction = performance.now() - shownAt;
    endRound(index === targetCell ? "hit" : "false_positive", reaction);
  };

  useEffect(() => {
    if (!started || finished) return;

    const onKey = (event: KeyboardEvent) => {
      const n = Number(event.key) - 1;
      if (n >= 0 && n < GRID_SIZE) choose(n);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, finished, phase, targetCell, shownAt, challenge]);

  useEffect(() => {
    if (!started || finished || phase !== "ready" || round === 0) return;
    createRound();
  }, [round, started, finished, phase, createRound]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const score = useMemo(() => {
    if (!finished) return 0;
    const accuracy = hits / Math.max(1, hits + mistakes);
    const sorted = [...reactionSamples].sort((a, b) => a - b);
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 3000;
    const reactionQuality = Math.max(0, 1 - median / FORGE_CONFIG.focus.resultSpeedReferenceMs);
    const streakBonus = Math.min(10, bestStreak * 0.8);
    return Math.round(Math.min(100, accuracy * 65 + reactionQuality * 25 + streakBonus));
  }, [finished, hits, mistakes, reactionSamples, bestStreak]);

  const previousBest = typeof window === "undefined"
    ? 0
    : Number(window.localStorage.getItem("forge.lastFocus") || 0);

  useEffect(() => {
    if (!finished || !sessionId) return;

    const performance = hits / Math.max(1, hits + mistakes);
    const sorted = [...reactionSamples].sort((a, b) => a - b);
    const medianReaction = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 3000;
    const reactionControl = Math.max(0, Math.min(1, 1 - medianReaction / 3000));
    const missRate = mistakes / Math.max(1, hits + mistakes);
    const currentDifficulty = challenge?.structuralScore ?? level / Math.max(1, FORGE_CONFIG.focus.maxLevel);

    updateSkillModel(
      "focus",
      performance,
      level,
      performance >= FORGE_CONFIG.focus.goodAccuracy,
      {
        accuracy: performance,
        reactionControl,
        consistency: bestStreak / Math.max(1, ROUNDS),
        difficulty: currentDifficulty,
        recovery: Math.max(0, 1 - missRate),
      },
    );

    applyCrossSkillTransfer("focus", "control", performance * 0.2 - 0.1);
    applyCrossSkillTransfer("focus", "consistency", performance * 0.15 - 0.075);

    recordEvent({
      sessionId,
      skill: "focus",
      game: "focus",
      event: "session_completed",
      difficulty: difficultySnapshot(level, currentDifficulty),
      payload: {
        score,
        accuracy: performance,
        hits,
        mistakes,
        bestStreak,
        medianReactionMs: medianReaction,
        outcomeModel: "hit-miss-false-positive-timeout",
      },
    });

    window.localStorage.setItem("forge.lastFocus", String(score));
  }, [
    finished,
    sessionId,
    score,
    hits,
    mistakes,
    bestStreak,
    level,
    reactionSamples,
    challenge,
  ]);

  const showField = phase === "visible";
  const accuracy = hits / Math.max(1, hits + mistakes);
  const currentDifficulty = challenge?.difficulty ?? focusDifficultyForLevel(level);
  const improvementMessage =
    score > previousBest && previousBest > 0
      ? "You improved your Focus score. The field also changed its perceptual demands."
      : score === previousBest && previousBest > 0
        ? "You matched your best. One deliberate session is enough for today."
        : score < previousBest && previousBest > 0
          ? "Below your best this run. Recover with a better search strategy — not more retries."
          : "Your first run establishes a baseline. Future sessions can adapt around your performance.";

  return (
    <main className="game-shell">
      <div className="game-topbar">
        <Link href="/" className="game-back">← FORGE</Link>
        <div className="game-progress">
          {started && !finished ? `${round + 1}/${ROUNDS} · L${level}` : "FOCUS"}
        </div>
      </div>

      {!started && !finished && (
        <section className="game-intro">
          <div className="eyebrow">FOCUS · ADAPTIVE VISUAL SEARCH</div>
          <h1>Find it before it vanishes.</h1>
          <p>
            Find the exact target while FORGE changes more than speed:
            confusability, family complexity, spatial uncertainty, visual competition
            and distractor variety all contribute to the challenge.
          </p>
          <div className="rule-pills">
            <span>6 visual families</span>
            <span>36 positions</span>
            <span>7 difficulty dimensions</span>
            <span>WAIT phases</span>
          </div>
          <button className="btn btn-primary" onClick={start}>Begin Focus</button>
        </section>
      )}

      {started && !finished && (
        <section className="game-stage">
          <div className={"target-card " + (phase === "wait" ? "target-card-wait" : "")}>
            {phase === "wait" ? (
              <>
                <span>RESET · CONTROL YOUR IMPULSE</span>
                <strong>WAIT</strong>
                <small>Do not tap. The next field will appear shortly.</small>
              </>
            ) : (
              <>
                <span>FIND THIS · {mode.toUpperCase()}</span>
                <strong>{target.glyph}</strong>
                <small>Exact match only. Scan broadly before committing.</small>
              </>
            )}
          </div>

          {showField && (
            <div className="focus-difficulty-readout" aria-live="polite">
              <span>SEARCH LOAD</span>
              <b>{Math.round((challenge?.structuralScore ?? 0) * 100)}</b>
              <i style={{ width: `${Math.round((challenge?.structuralScore ?? 0) * 100)}%` }} />
            </div>
          )}

          <div className={"focus-grid " + (showField ? "focus-grid-live" : "focus-grid-wait")}>
            {Array.from({ length: GRID_SIZE }, (_, index) => {
              const cell = challenge?.cells[index];
              const item = cell?.item;

              return (
                <button
                  key={round + "-" + index}
                  className={"focus-cell " + (showField && index === targetCell ? "focus-target" : "")}
                  onClick={() => choose(index)}
                  disabled={phase !== "visible"}
                  style={item && challenge ? visualStyle(index, index === targetCell, challenge) : undefined}
                  aria-label={
                    showField && index === targetCell
                      ? target.label
                      : phase === "wait"
                        ? "waiting"
                        : "field position"
                  }
                >
                  {showField && item ? item.glyph : ""}
                </button>
              );
            })}
          </div>

          <div className="live-stats">
            <span>STREAK <b>{streak}</b></span>
            <span>HITS <b>{hits}</b></span>
            <span>ERRORS <b>{mistakes}</b></span>
            <span>LEVEL <b>{level}</b></span>
          </div>

          <p className="game-hint">
            {phase === "wait"
              ? "WAIT is intentional: the target is gone. Resist the urge to tap."
              : `Level ${level}: accuracy first. Complexity rises before reaction speed does.`}
          </p>
        </section>
      )}

      {finished && (
        <section className="result-card">
          <div className="eyebrow">CHALLENGE COMPLETE</div>
          <div className="result-score">{score}</div>
          <div className="result-label">FOCUS SCORE</div>
          <div className="result-stats">
            <div><strong>{hits}</strong><span>correct</span></div>
            <div><strong>{mistakes}</strong><span>errors</span></div>
            <div><strong>{bestStreak}</strong><span>best streak</span></div>
          </div>
          <p>{improvementMessage}</p>
          <p className="game-hint">
            Session accuracy: {Math.round(accuracy * 100)}% · Median reaction: {
              reactionSamples.length
                ? Math.round([...reactionSamples].sort((a, b) => a - b)[Math.floor(reactionSamples.length / 2)])
                : "—"
            } ms · Highest adaptive level: {level}.
          </p>
          <div className="cta-row">
            <button className="btn btn-primary" onClick={start}>Play another mix</button>
            <Link href="/" className="btn btn-secondary">I am done</Link>
          </div>
        </section>
      )}
    </main>
  );
}
