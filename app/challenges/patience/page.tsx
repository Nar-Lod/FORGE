"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const ROUNDS = 10;
const WAIT_MS = 3000;
const BANK_WINDOW_MS = 5000;
const BREAK_KEY = "forge.patience.break";
const LAST_KEY = "forge.patience.lastScore";

type BreakRecord = {
  startedAt: number;
  lastScore: number;
};

const reflectionPrompts = [
  "Reflect on your day. What actually mattered today?",
  "Set one target for the rest of today that you will be glad you completed.",
  "Think about a goal you care about. What is one small step you can take toward it?",
  "Imagine you could restart today. How would you organize your perfect day?",
  "What deserves more of your attention than your phone right now?",
  "Picture the person you want to become. What would that person do next?",
  "You do not need to solve everything now. Just choose your next useful action.",
];

function readBreak(): BreakRecord | null {
  try {
    const raw = window.localStorage.getItem(BREAK_KEY);
    return raw ? (JSON.parse(raw) as BreakRecord) : null;
  } catch {
    return null;
  }
}

function readLastScore() {
  try {
    return Number(window.localStorage.getItem(LAST_KEY) || 0);
  } catch {
    return 0;
  }
}

export default function PatienceChallenge() {
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [round, setRound] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [banked, setBanked] = useState(0);
  const [early, setEarly] = useState(0);
  const [score, setScore] = useState(0);
  const [roundStart, setRoundStart] = useState(0);
  const [breakMode, setBreakMode] = useState(false);
  const [breakStartedAt, setBreakStartedAt] = useState<number | null>(null);
  const [breakElapsed, setBreakElapsed] = useState(0);
  const [previousBreak, setPreviousBreak] = useState(0);
  const [breakCollected, setBreakCollected] = useState(false);

  const beginRound = () => {
    setElapsed(0);
    setRoundStart(performance.now());
  };

  useEffect(() => {
    if (!started || finished || breakMode) return;
    const timer = window.setInterval(() => {
      const value = performance.now() - roundStart;
      setElapsed(Math.min(value, BANK_WINDOW_MS));
    }, 50);
    return () => window.clearInterval(timer);
  }, [started, finished, breakMode, roundStart]);

  useEffect(() => {
    const existing = readBreak();
    if (!existing) return;
    const away = Math.max(0, Math.floor((Date.now() - existing.startedAt) / 1000));
    if (away > 0) {
      setBreakMode(true);
      setBreakStartedAt(existing.startedAt);
      setBreakElapsed(away);
      setPreviousBreak(existing.lastScore || readLastScore());
      setStarted(true);
    }
  }, []);

  useEffect(() => {
    if (!breakMode || !breakStartedAt) return;
    const tick = () => setBreakElapsed(Math.max(0, Math.floor((Date.now() - breakStartedAt) / 1000)));
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [breakMode, breakStartedAt]);

  const nextRound = (didBank: boolean) => {
    if (didBank) setBanked((v) => v + 1);
    if (round >= ROUNDS - 1) {
      const finalBanked = banked + (didBank ? 1 : 0);
      const finalEarly = early;
      const result = Math.max(
        0,
        Math.min(100, Math.round((finalBanked / ROUNDS) * 80 + Math.max(0, 20 - finalEarly * 4))),
      );
      setScore(result);
      setBreakMode(true);
      setBreakCollected(false);
      setBreakStartedAt(Date.now());
      setBreakElapsed(0);
      setPreviousBreak(readLastScore());
      window.localStorage.setItem(
        BREAK_KEY,
        JSON.stringify({ startedAt: Date.now(), lastScore: readLastScore() }),
      );
      return;
    }
    setRound((v) => v + 1);
    window.setTimeout(beginRound, 120);
  };

  const choose = () => {
    if (!started || finished || breakMode) return;
    if (elapsed < WAIT_MS) {
      setEarly((v) => v + 1);
      nextRound(false);
    } else {
      nextRound(true);
    }
  };

  const begin = () => {
    window.localStorage.removeItem(BREAK_KEY);
    setStarted(true);
    setFinished(false);
    setBreakMode(false);
    setBreakCollected(false);
    setRound(0);
    setBanked(0);
    setEarly(0);
    setScore(0);
    setBreakElapsed(0);
    window.setTimeout(beginRound, 100);
  };

  const collectBreakReward = () => {
    const finalBreakScore = breakElapsed;
    setScore(finalBreakScore);
    setPreviousBreak(readLastScore());
    window.localStorage.setItem(LAST_KEY, String(finalBreakScore));
    window.localStorage.removeItem(BREAK_KEY);
    setBreakCollected(true);
    setFinished(true);
    setBreakMode(false);
  };

  const progress = Math.min(100, (elapsed / BANK_WINDOW_MS) * 100);
  const ready = elapsed >= WAIT_MS;
  const value = useMemo(() => (ready ? "BANK" : "WAIT"), [ready]);

  useEffect(() => {
    if (!finished) return;
    const previous = JSON.parse(
      window.localStorage.getItem("forge.metrics") ||
        "[["Focus",0],["Control",0],["Patience",0],["Persistence",0],["Consistency",0]]",
    ) as [string, number][];
    window.localStorage.setItem(
      "forge.metrics",
      JSON.stringify(previous.map(([name, value]) => (name === "Patience" ? [name, Math.max(value, score)] : [name, value]))),
    );
  }, [finished, score]);

  const reflection = reflectionPrompts[Math.floor(breakElapsed / 15) % reflectionPrompts.length];
  const previousLabel = previousBreak > 0 ? `${previousBreak}s` : "No previous break";
  const improvement = previousBreak > 0 ? breakElapsed - previousBreak : breakElapsed;
  const doubled = previousBreak > 0 && breakElapsed >= previousBreak * 2;

  return (
    <main className="game-shell">
      <div className="game-topbar">
        <Link href="/" className="game-back">← FORGE</Link>
        <div className="game-progress">
          {breakMode ? "PHONE BREAK" : started && !finished ? `${round + 1}/${ROUNDS}` : "PATIENCE"}
        </div>
      </div>

      {!started && (
        <section className="game-intro">
          <div className="eyebrow">PATIENCE · DELAYED REWARD</div>
          <h1>Wait for the better reward.</h1>
          <p>
            Practice waiting for value instead of taking the quickest option. After the game,
            you will get a second challenge: leave your phone untouched and earn more the longer
            you stay away.
          </p>
          <div className="rule-pills"><span>Wait 3s</span><span>Bank reward</span><span>Phone break</span></div>
          <button className="btn btn-primary" onClick={begin}>Start Patience</button>
        </section>
      )}

      {started && !finished && !breakMode && (
        <section className="game-stage">
          <div className="target-card"><span>REWARD BUILDING</span><strong>{value}</strong></div>
          <div className="patience-meter"><div className="patience-fill" style={{ width: `${progress}%` }} /></div>
          <div className="patience-value">{ready ? "FULL REWARD AVAILABLE" : "WAITING FOR FULL VALUE…"}</div>
          <button className={`btn ${ready ? "btn-primary" : "btn-secondary"} patience-action`} onClick={choose}>
            {ready ? "Bank full reward" : "Take the early option"}
          </button>
          <div className="live-stats"><span>ROUND <b>{round + 1}</b></span><span>BANKED <b>{banked}</b></span><span>EARLY <b>{early}</b></span></div>
          <p className="game-hint">{ready ? "You waited. Choose deliberately." : "Notice the urge to take the easy option. You do not have to obey it."}</p>
        </section>
      )}

      {started && !finished && breakMode && (
        <section className="game-stage patience-break">
          <div className="eyebrow">THE REAL PATIENCE TEST</div>
          <h1>Leave your phone untouched.</h1>
          <p className="break-lead">
            Put the phone down. You can close FORGE completely, lock your phone, or leave it somewhere
            out of reach. Your reward keeps growing while you are away.
          </p>
          <div className="break-clock">
            <span>TIME AWAY</span>
            <strong>{breakElapsed}s</strong>
          </div>
          <div className="break-reward">+{breakElapsed} PATIENCE POINTS</div>
          <div className="reflection-card">
            <span>WHILE YOU WAIT</span>
            <p>{reflection}</p>
          </div>
          <div className="break-stats">
            <div><span>LAST BREAK</span><strong>{previousLabel}</strong></div>
            <div><span>THIS BREAK</span><strong>{breakElapsed}s</strong></div>
          </div>
          <p className="break-guidance">
            The goal is not to stay on this screen. The goal is to leave the phone. Come back when
            you are ready to collect your reward.
          </p>
          <button className="btn btn-primary patience-collect" onClick={collectBreakReward}>
            Collect reward
          </button>
        </section>
      )}

      {finished && (
        <section className="result-card patience-result">
          <div className="eyebrow">PATIENCE COMPLETE</div>
          <div className="result-score">{score}</div>
          <div className="result-label">PATIENCE POINTS</div>
          <div className="result-stats">
            <div><strong>{score}s</strong><span>phone-free</span></div>
            <div><strong>{previousBreak ? `${previousBreak}s` : "—"}</strong><span>last break</span></div>
            <div><strong>{improvement >= 0 ? `+${improvement}s` : `${improvement}s`}</strong><span>change</span></div>
          </div>
          <div className="comparison-card">
            {doubled ? (
              <>
                <strong>You beat yourself by 2×.</strong>
                <p>You stayed away for at least twice as long as your previous Patience break.</p>
              </>
            ) : previousBreak > 0 ? (
              <>
                <strong>{improvement >= 0 ? "You improved your own record." : "Your record is still there."}</strong>
                <p>
                  Your last break was {previousBreak}s. This one was {score}s.
                  {improvement > 0 ? ` That is ${improvement}s more.` : " Next time, give yourself another chance to beat it."}
                </p>
              </>
            ) : (
              <>
                <strong>You set your first baseline.</strong>
                <p>Next time, see if you can stay away longer without turning the challenge into another screen-time session.</p>
              </>
            )}
          </div>
          <p>
            Next time, try going farther: put the phone down, close FORGE completely, and return when
            you are genuinely ready. Improvement here means having more control over when you use your phone—not using FORGE for longer.
          </p>
          <div className="cta-row">
            <button className="btn btn-primary" onClick={begin}>Run Patience again</button>
            <Link href="/" className="btn btn-secondary">I'm done</Link>
          </div>
        </section>
      )}
    </main>
  );
}
