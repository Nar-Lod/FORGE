"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FOCUS_LIBRARIES, FOCUS_MODES, type FocusItem } from "../../../lib/focus-library";

const ROUNDS = 20;
const GRID_SIZE = 36;
type Phase = "ready" | "visible" | "wait";

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function makePalette(mode: string, target: FocusItem) {
  const pool = FOCUS_LIBRARIES[mode].filter((item) => item.id !== target.id);
  const out = [target];

  while (out.length < Math.min(10, pool.length + 1)) {
    const item = pick(pool);
    if (!out.some((existing) => existing.id === item.id)) out.push(item);
  }

  return out;
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
  const timerRef = useRef<number | null>(null);

  const difficulty = Math.min(1, round / (ROUNDS - 1));
  const visibleMs = Math.round(1100 - difficulty * 600);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const finishRound = useCallback((wasCorrect: boolean, reaction?: number) => {
    clearTimer();

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

    if (round >= ROUNDS - 1) {
      timerRef.current = window.setTimeout(() => {
        setFinished(true);
        setPhase("ready");
        timerRef.current = null;
      }, 650);
      return;
    }

    timerRef.current = window.setTimeout(() => {
      setRound((value) => value + 1);
      timerRef.current = null;
    }, 650);
  }, [clearTimer, round]);

  const createRound = useCallback(() => {
    clearTimer();

    const nextMode = pick(FOCUS_MODES);
    const nextTarget = pick(FOCUS_LIBRARIES[nextMode]);
    const nextTargetCell = Math.floor(Math.random() * GRID_SIZE);

    setMode(nextMode);
    setTarget(nextTarget);
    setPalette(makePalette(nextMode, nextTarget));
    setTargetCell(nextTargetCell);
    setPhase("visible");
    setShownAt(performance.now());

    timerRef.current = window.setTimeout(() => {
      setPhase("wait");
      setMistakes((value) => value + 1);
      setStreak(0);

      if (round >= ROUNDS - 1) {
        timerRef.current = window.setTimeout(() => {
          setFinished(true);
          setPhase("ready");
          timerRef.current = null;
        }, 650);
      } else {
        timerRef.current = window.setTimeout(() => {
          setRound((value) => value + 1);
          timerRef.current = null;
        }, 650);
      }
    }, visibleMs);
  }, [clearTimer, round, visibleMs]);

  const start = () => {
    clearTimer();
    setStarted(true);
    setFinished(false);
    setRound(0);
    setHits(0);
    setMistakes(0);
    setStreak(0);
    setBestStreak(0);
    setReactionTotal(0);
    setPhase("ready");

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      createRound();
    }, 350);
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

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const score = useMemo(() => {
    if (!finished) return 0;
    const accuracy = hits / Math.max(1, hits + mistakes);
    const avgReaction = reactionTotal / Math.max(1, hits);
    const speed = Math.max(0, 1 - avgReaction / 1500);
    const streakBonus = Math.min(10, bestStreak * 0.8);
    return Math.round(Math.min(100, accuracy * 65 + speed * 25 + streakBonus));
  }, [finished, hits, mistakes, reactionTotal, bestStreak]);

  useEffect(() => {
    if (!finished) return;

    const previous = JSON.parse(
      window.localStorage.getItem("forge.metrics") ||
        '[[\"Focus\",0],[\"Control\",0],[\"Patience\",0],[\"Persistence\",0],[\"Consistency\",0]]'
    ) as [string, number][];

    const next = previous.map(([name, value]) =>
      name === "Focus" ? [name, Math.max(value, score)] : [name, value]
    );

    window.localStorage.setItem("forge.metrics", JSON.stringify(next));
    window.localStorage.setItem("forge.lastFocus", String(score));
    window.localStorage.setItem(
      "forge.sessions",
      String(Number(window.localStorage.getItem("forge.sessions") || 0) + 1)
    );
  }, [finished, score]);

  const showField = phase === "visible";

  return (
    <main className="game-shell">
      <div className="game-topbar">
        <Link href="/" className="game-back">← FORGE</Link>
        <div className="game-progress">
          {started && !finished ? round + 1 + "/" + ROUNDS : "FOCUS"}
        </div>
      </div>

      {!started && !finished && (
        <section className="game-intro">
          <div className="eyebrow">FOCUS · VISUAL SEARCH</div>
          <h1>Find it before it vanishes.</h1>
          <p>
            The library changes every round. Shapes, emojis, animals, food, vehicles and
            flags can all appear. Scan the field, identify the exact target, then act before
            it disappears.
          </p>
          <div className="rule-pills">
            <span>6 visual families</span>
            <span>36 positions</span>
            <span>Gets faster</span>
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
              const occupied = showField && index !== targetCell && index % 2 === (round % 2);

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
            <span>MODE <b>{mode}</b></span>
          </div>

          <p className="game-hint">
            {phase === "wait"
              ? "WAIT is intentional: the target is gone. Resist the urge to tap."
              : "Scan the whole field. A wrong tap or a missed target advances the round."}
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
          <p>
            {score >= 80
              ? "Strong visual control. Recover or beat your best with one deliberate attempt — not an endless session."
              : "You can recover. Change your search strategy, then make one deliberate attempt."}
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
