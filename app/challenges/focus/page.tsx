"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FOCUS_LIBRARIES, FOCUS_MODES, type FocusItem } from "../../../lib/focus-library";
import { FORGE_CONFIG } from "../../../lib/forge-config";
import {
  recordEvent,
  startForgeSession,
  updateSkillModel,
} from "../../../lib/forge-analytics";
import {
  difficultySnapshot,
  updateAdaptiveState,
  type AdaptiveState,
} from "../../../lib/forge-adaptive";

const { rounds: ROUNDS, gridSize: GRID_SIZE } = FORGE_CONFIG.focus;
type Phase = "ready" | "visible" | "wait";

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function makePalette(mode: string, target: FocusItem, complexity: number) {
  const pool = FOCUS_LIBRARIES[mode].filter((item) => item.id !== target.id);
  const size = Math.min(10 + complexity, pool.length + 1);
  const distractors = shuffle(pool).slice(0, Math.max(0, size - 1));
  return [target, ...distractors];
}

function visualStyle(index: number, item: FocusItem, target: boolean) {
  const hues = [18, 42, 76, 118, 158, 198, 238, 278, 318, 346];
  const hue = hues[index % hues.length];
  const rotation = ((index * 37) % 28) - 14;
  const scale = 0.78 + ((index * 17) % 35) / 100;

  return {
    "--focus-hue": hue,
    "--focus-rotation": `${target ? 0 : rotation}deg`,
    "--focus-scale": target ? 1 : scale,
    "--focus-delay": `${(index % 5) * 20}ms`,
    "--focus-surface": `hsl(${hue} 70% 94%)`,
    "--focus-ink": `hsl(${hue} 72% 35%)`,
  } as React.CSSProperties;
}

export default function FocusChallenge() {
  const [round, setRound] = useState(0);
  const [level, setLevel] = useState(FORGE_CONFIG.focus.startingLevel);
  const [goodRounds, setGoodRounds] = useState(0);
  const [poorRounds, setPoorRounds] = useState(0);
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
  const [shownAt, setShownAt] = useState(0);
  const [palette, setPalette] = useState<FocusItem[]>([]);
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

  const advanceDifficulty = useCallback((wasCorrect: boolean) => {
    const result = updateAdaptiveState(
      adaptive,
      wasCorrect ? 1 : 0,
      {
        minLevel: FORGE_CONFIG.focus.minLevel,
        maxLevel: FORGE_CONFIG.focus.maxLevel,
        startingLevel: FORGE_CONFIG.focus.startingLevel,
        bands: FORGE_CONFIG.focus.levels.map((band) => ({
          level: band.level,
          minPerformance: 0,
          maxPerformance: 1,
        })),
        upThreshold: FORGE_CONFIG.focus.goodAccuracy,
        downThreshold: FORGE_CONFIG.focus.poorAccuracy,
        consecutiveUp: FORGE_CONFIG.focus.consecutiveGoodRounds,
        consecutiveDown: FORGE_CONFIG.focus.consecutivePoorRounds,
      },
    );

    setAdaptive(result.state);
    setLevel(result.decision.level);

    if (sessionId) {
      recordEvent({
        sessionId,
        skill: "focus",
        game: "focus",
        event: "difficulty_changed",
        difficulty: difficultySnapshot(result.decision.level),
        payload: {
          direction: result.decision.direction,
          performance: result.decision.targetPerformance,
        },
      });
    }
  }, [adaptive, sessionId]);

  const finishRound = useCallback((wasCorrect: boolean, reaction?: number) => {
    clearTimer();
    if (sessionId) {
      recordEvent({
        sessionId,
        skill: "focus",
        game: "focus",
        event: "trial_completed",
        difficulty: difficultySnapshot(level),
        payload: {
          correct: wasCorrect,
          reactionMs: reaction ?? null,
        },
      });
      if (!wasCorrect) {
        recordEvent({
          sessionId,
          skill: "focus",
          game: "focus",
          event: "mistake",
          difficulty: difficultySnapshot(level),
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
      if (reaction !== undefined) setReactionTotal((value) => value + reaction);
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
        setRound((value) => value + 1);
        setPhase("ready");
      }
      timerRef.current = null;
    }, FORGE_CONFIG.focus.waitDurationMs);
  }, [advanceDifficulty, clearTimer, level, round, sessionId]);

  const createRound = useCallback(() => {
    clearTimer();

    const complexity = levelConfig.familyComplexity;
    const nextMode = pick(FOCUS_MODES);
    const nextTarget = pick(FOCUS_LIBRARIES[nextMode]);
    const nextTargetCell = Math.floor(Math.random() * GRID_SIZE);

    setMode(nextMode);
    setTarget(nextTarget);
    setPalette(makePalette(nextMode, nextTarget, complexity));
    setTargetCell(nextTargetCell);
    setPhase("visible");
    setShownAt(performance.now());

    timerRef.current = window.setTimeout(() => {
      advanceDifficulty(false);
      setPhase("wait");
      setMistakes((value) => value + 1);
      setStreak(0);

      timerRef.current = window.setTimeout(() => {
        if (round >= ROUNDS - 1) {
          setFinished(true);
          setPhase("ready");
        } else {
          setRound((value) => value + 1);
          setPhase("ready");
        }
        timerRef.current = null;
      }, FORGE_CONFIG.focus.waitDurationMs);
    }, visibleMs);
  }, [advanceDifficulty, clearTimer, levelConfig.familyComplexity, round, visibleMs]);

  const start = () => {
    clearTimer();
    setStarted(true);
    setFinished(false);
    setRound(0);
    setLevel(FORGE_CONFIG.focus.startingLevel);
    setGoodRounds(0);
    setPoorRounds(0);
    setHits(0);
    setMistakes(0);
    setStreak(0);
    setBestStreak(0);
    setReactionTotal(0);
    const nextSession = startForgeSession("focus", "focus", { rounds: ROUNDS });
    setSessionId(nextSession);
    setAdaptive({
      level: FORGE_CONFIG.focus.startingLevel,
      upStreak: 0,
      downStreak: 0,
      history: [],
    });
    setLevel(FORGE_CONFIG.focus.startingLevel);
    setPhase("ready");

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      createRound();
    }, FORGE_CONFIG.focus.startDelayMs);
  };

  const choose = (index: number) => {
    if (!started || finished || phase !== "visible") return;
    const reaction = performance.now() - shownAt;
    finishRound(index === targetCell, index === targetCell ? reaction : undefined);
  };

  useEffect(() => {
    if (!started || finished) return;

    const onKey = (event: KeyboardEvent) => {
      const n = Number(event.key) - 1;
      if (n >= 0 && n < GRID_SIZE) choose(n);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, finished, phase, targetCell, shownAt]);

  useEffect(() => {
    if (!started || finished || phase !== "ready") return;
    if (round === 0) return;
    createRound();
  }, [round, started, finished, phase, createRound]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const score = useMemo(() => {
    if (!finished) return 0;
    const accuracy = hits / Math.max(1, hits + mistakes);
    const avgReaction = reactionTotal / Math.max(1, hits);
    const speed = Math.max(0, 1 - avgReaction / FORGE_CONFIG.focus.resultSpeedReferenceMs);
    const streakBonus = Math.min(10, bestStreak * 0.8);
    return Math.round(Math.min(100, accuracy * 65 + speed * 25 + streakBonus));
  }, [finished, hits, mistakes, reactionTotal, bestStreak]);

  const previousBest = typeof window === "undefined"
    ? 0
    : Number(window.localStorage.getItem("forge.lastFocus") || 0);

  useEffect(() => {
    if (!finished || !sessionId) return;

    const performance = hits / Math.max(1, hits + mistakes);
    updateSkillModel("focus", performance, level, performance >= FORGE_CONFIG.focus.goodAccuracy);
    recordEvent({
      sessionId,
      skill: "focus",
      game: "focus",
      event: "session_completed",
      difficulty: difficultySnapshot(level),
      payload: {
        score,
        accuracy: performance,
        hits,
        mistakes,
        bestStreak,
      },
    });
  }, [finished, sessionId, score, hits, mistakes, bestStreak, level]);

  const showField = phase === "visible";
  const accuracy = hits / Math.max(1, hits + mistakes);
  const improvementMessage =
    score > previousBest && previousBest > 0
      ? "You improved your Focus score. The field also adapts as your accuracy holds."
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
            The field changes every round. Your reaction window starts at 1.5 seconds
            and adapts gradually as your accuracy holds. Better performance brings
            faster timing and more complex distractors.
          </p>
          <div className="rule-pills">
            <span>6 visual families</span>
            <span>36 positions</span>
            <span>Adaptive speed</span>
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
                <small>Find the exact target. Distractors vary in type, color, size and rotation.</small>
              </>
            )}
          </div>

          <div className={"focus-grid " + (showField ? "focus-grid-live" : "focus-grid-wait")}>
            {Array.from({ length: GRID_SIZE }, (_, index) => {
              const item = palette[(index * 7 + round * 3) % Math.max(1, palette.length)];
              const occupancySeed = ((index * 17 + round * 13) % 100) / 100;
              const occupied = showField && index !== targetCell && occupancySeed < levelConfig.distractorDensity;

              return (
                <button
                  key={round + "-" + index}
                  className={"focus-cell " + (showField && index === targetCell ? "focus-target" : "")}
                  onClick={() => choose(index)}
                  disabled={phase !== "visible"}
                  style={item ? visualStyle(index, item, index === targetCell) : undefined}
                  aria-label={
                    showField && index === targetCell
                      ? target.label
                      : phase === "wait"
                        ? "waiting"
                        : "field position"
                  }
                >
                  {showField && occupied && item ? item.glyph : ""}
                </button>
              );
            })}
          </div>

          <div className="live-stats">
            <span>STREAK <b>{streak}</b></span>
            <span>HITS <b>{hits}</b></span>
            <span>MISS <b>{mistakes}</b></span>
            <span>LEVEL <b>{level}</b></span>
          </div>

          <p className="game-hint">
            {phase === "wait"
              ? "WAIT is intentional: the target is gone. Resist the urge to tap."
              : `Level ${level}: scan the whole field. Hold accuracy to unlock a harder field.`}
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
            <div><strong>{mistakes}</strong><span>misses</span></div>
            <div><strong>{bestStreak}</strong><span>best streak</span></div>
          </div>
          <p>{improvementMessage}</p>
          <p className="game-hint">
            Session accuracy: {Math.round(accuracy * 100)}%. Highest adaptive level reached: {level}.
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
