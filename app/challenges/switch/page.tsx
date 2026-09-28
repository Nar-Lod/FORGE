"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const ROUNDS = 12;
const TOTAL_SECONDS = 60;
const COLORS = ["GREEN", "RED", "BLUE", "YELLOW"];
const SHAPES = ["CIRCLE", "SQUARE", "TRIANGLE", "DIAMOND"];

type Rule = { kind: "color" | "shape" | "inhibit"; value: string; label: string };
type Option = { id: number; color: string; shape: string };

function randomRule(round: number): Rule {
  const mode = round % 3;
  if (mode === 0) {
    const value = COLORS[Math.floor(Math.random() * COLORS.length)];
    return { kind: "color", value, label: `TAP ${value}` };
  }
  if (mode === 1) {
    const value = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    return { kind: "shape", value, label: `TAP ${value}` };
  }
  return Math.random() > 0.45
    ? { kind: "inhibit", value: "NONE", label: "DO NOT TAP" }
    : { kind: "color", value: COLORS[Math.floor(Math.random() * COLORS.length)], label: "WAIT FOR THE SIGNAL" };
}

function makeOptions(rule: Rule): Option[] {
  const options = Array.from({ length: 6 }, (_, index) => ({
    id: index,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
  }));

  if (rule.kind === "color") {
    const target = Math.floor(Math.random() * options.length);
    options.forEach((option, index) => {
      if (index === target) option.color = rule.value;
      else option.color = COLORS.filter((color) => color !== rule.value)[index % 3];
    });
  }
  if (rule.kind === "shape") {
    const target = Math.floor(Math.random() * options.length);
    options.forEach((option, index) => {
      if (index === target) option.shape = rule.value;
      else option.shape = SHAPES.filter((shape) => shape !== rule.value)[index % 3];
    });
  }
  return options;
}

export default function SwitchChallenge() {
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [rule, setRule] = useState<Rule>(randomRule(0));
  const [options, setOptions] = useState<Option[]>(makeOptions(rule));
  const [armed, setArmed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [falseStarts, setFalseStarts] = useState(0);
  const [seconds, setSeconds] = useState(TOTAL_SECONDS);
  const [finished, setFinished] = useState(false);

  const score = useMemo(() => {
    if (!finished) return 0;
    return Math.min(100, Math.max(0, Math.round((correct / ROUNDS) * 72 + Math.max(0, 28 - mistakes * 4 - falseStarts * 3))));
  }, [finished, correct, mistakes, falseStarts]);

  const beginRound = (index: number) => {
    const nextRule = randomRule(index);
    setRule(nextRule);
    setOptions(makeOptions(nextRule));
    setArmed(false);
    window.setTimeout(() => setArmed(true), 550 + Math.random() * 850);
  };

  useEffect(() => {
    if (!started || finished) return;
    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) { setFinished(true); return 0; }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [started, finished]);

  useEffect(() => {
    if (!started || finished || !armed || rule.kind !== "inhibit") return;
    const timeout = window.setTimeout(() => {
      if (round >= ROUNDS - 1) setFinished(true);
      else { setCorrect((value) => value + 1); setRound((value) => value + 1); beginRound(round + 1); }
    }, 1100);
    return () => window.clearTimeout(timeout);
  }, [started, finished, armed, rule.kind, round]);

  const begin = () => {
    setStarted(true); setFinished(false); setRound(0); setCorrect(0); setMistakes(0); setFalseStarts(0); setSeconds(TOTAL_SECONDS);
    beginRound(0);
  };

  const choose = (option: Option) => {
    if (!started || finished) return;
    if (!armed) { setFalseStarts((value) => value + 1); return; }
    if (rule.kind === "inhibit") {
      setMistakes((value) => value + 1);
    } else {
      const matches = rule.kind === "color" ? option.color === rule.value : option.shape === rule.value;
      if (matches) setCorrect((value) => value + 1); else setMistakes((value) => value + 1);
    }
    if (round >= ROUNDS - 1) setFinished(true);
    else { setRound((value) => value + 1); beginRound(round + 1); }
  };

  useEffect(() => {
    if (!finished) return;
    const previous = JSON.parse(window.localStorage.getItem("forge.metrics") || "[[\"Focus\",0],[\"Control\",0],[\"Patience\",0],[\"Persistence\",0],[\"Consistency\",0]]") as [string, number][];
    const next = previous.map(([name, value]) => name === "Control" ? [name, Math.max(value, score)] as [string, number] : [name, value] as [string, number]);
    window.localStorage.setItem("forge.metrics", JSON.stringify(next));
  }, [finished, score]);

  return (
    <main className="game-shell">
      <div className="game-topbar"><Link href="/" className="game-back">← FORGE</Link><div className="game-progress">{started && !finished ? `${seconds}s` : "SWITCH"}</div></div>
      {!started && !finished && <section className="game-intro"><div className="eyebrow">SWITCH · 60 SEC</div><h1>Don't follow the obvious move.</h1><p>The rule changes. The answer moves. Sometimes you must wait for the signal. Sometimes the correct action is doing nothing.</p><div className="rule-pills"><span>Wait</span><span>Adapt</span><span>Inhibit</span></div><button className="btn btn-primary" onClick={begin}>Start Switch</button></section>}
      {started && !finished && <section className="game-stage"><div className={`target-card switch-rule ${armed ? "armed" : "waiting"}`}><span>{armed ? "SIGNAL LIVE" : "PAUSE"}</span><strong>{armed ? rule.label : "WAIT…"}</strong></div><div className="switch-field">{options.map((option) => <button key={option.id} className={`switch-tile tile-${option.color.toLowerCase()}`} onClick={() => choose(option)} aria-label={`${option.color} ${option.shape}`}><span>{option.shape === "CIRCLE" ? "●" : option.shape === "SQUARE" ? "■" : option.shape === "TRIANGLE" ? "▲" : "◆"}</span></button>)}</div><div className="live-stats"><span>ROUND <b>{round + 1}</b></span><span>CORRECT <b>{correct}</b></span><span>FALSE START <b>{falseStarts}</b></span></div><p className="game-hint">The urge to tap early is part of the challenge. Notice it. Don't obey it.</p></section>}
      {finished && <section className="result-card"><div className="eyebrow">SWITCH COMPLETE</div><div className="result-score">{score}</div><div className="result-label">CONTROL SCORE</div><div className="result-stats"><div><strong>{correct}</strong><span>correct</span></div><div><strong>{mistakes}</strong><span>wrong</span></div><div><strong>{falseStarts}</strong><span>false starts</span></div></div><p>{score >= 80 ? "You stayed with the rule under pressure. The skill is not tapping faster — it is choosing when to act." : "You can recover. Your next round is an opportunity to notice the impulse, pause, and choose deliberately."}</p><div className="cta-row"><button className="btn btn-primary" onClick={begin}>Try a harder round</button><Link href="/" className="btn btn-secondary">I'm done</Link></div></section>}
    </main>
  );
}
