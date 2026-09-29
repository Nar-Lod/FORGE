"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const ROUNDS = 18;
const COLORS = ["GREEN", "RED", "BLUE", "YELLOW"];
const SHAPES = ["CIRCLE", "SQUARE", "TRIANGLE", "DIAMOND"];
type Rule = "color" | "shape" | "opposite" | "either";
type Tile = { id:number; color:string; shape:string; trap:boolean };

function icon(shape:string){return shape==="CIRCLE"?"●":shape==="SQUARE"?"■":shape==="TRIANGLE"?"▲":"◆";}
function makeBoard(rule:Rule, difficulty:number){
 const targetColor=COLORS[Math.floor(Math.random()*COLORS.length)], targetShape=SHAPES[Math.floor(Math.random()*SHAPES.length)];
 const tiles:Tile[]=Array.from({length:8},(_,id)=>({id,color:COLORS[Math.floor(Math.random()*COLORS.length)],shape:SHAPES[Math.floor(Math.random()*SHAPES.length)],trap:false}));
 const target=tiles[Math.floor(Math.random()*tiles.length)];
 if(rule==="color") target.color=targetColor;
 if(rule==="shape") target.shape=targetShape;
 if(rule==="opposite"){target.color=targetColor;target.shape=targetShape;}
 if(rule==="either"){target.color=targetColor;target.shape=targetShape;}
 const conflict=tiles.find(t=>t.id!==target.id && ((rule==="color"&&t.shape===targetShape)||(rule==="shape"&&t.color===targetColor)||(rule==="opposite"&&t.color===targetColor)||(rule==="either"&&t.color===targetColor)));
 if(conflict) conflict.trap=true;
 if(difficulty>5){const extra=tiles.find(t=>t.id!==target.id&&!t.trap);if(extra)extra.trap=true;}
 return {tiles,targetColor,targetShape,targetId:target.id};
}

export default function SwitchChallenge(){
 const [started,setStarted]=useState(false),[finished,setFinished]=useState(false),[round,setRound]=useState(0),[rule,setRule]=useState<Rule>("color"),[tiles,setTiles]=useState<Tile[]>([]),[targetColor,setTargetColor]=useState(""),[targetShape,setTargetShape]=useState(""),[correct,setCorrect]=useState(0),[mistakes,setMistakes]=useState(0),[traps,setTraps]=useState(0),[clean,setClean]=useState(0),[streak,setStreak]=useState(0),[bestStreak,setBestStreak]=useState(0),[signal,setSignal]=useState(false);
 const difficulty=Math.min(10,Math.floor(round/2));
 const ruleLabel=rule==="color"?`MATCH COLOR: ${targetColor}`:rule==="shape"?`MATCH SHAPE: ${targetShape}`:rule==="opposite"?`MATCH ${targetColor}, BUT IGNORE THE SHAPE`:`MATCH EITHER ${targetColor} OR ${targetShape}`;
 const nextRule=(n:number):Rule=>{const pool:Rule[]=n<4?["color","shape"]:["color","shape","opposite","either"];return pool[Math.floor(Math.random()*pool.length)];};
 const beginRound=(n:number)=>{const r=nextRule(n);const b=makeBoard(r,Math.min(10,Math.floor(n/2)));setRule(r);setTiles(b.tiles);setTargetColor(b.targetColor);setTargetShape(b.targetShape);setSignal(false);window.setTimeout(()=>setSignal(true),500+Math.random()*900);};
 const begin=()=>{setStarted(true);setFinished(false);setRound(0);setCorrect(0);setMistakes(0);setTraps(0);setClean(0);setStreak(0);setBestStreak(0);beginRound(0);};
 const choose=(tile:Tile)=>{if(!signal||finished)return;const matches=rule==="color"?tile.color===targetColor:rule==="shape"?tile.shape===targetShape:rule==="opposite"?tile.color===targetColor&&tile.shape!==targetShape:tile.color===targetColor||tile.shape===targetShape;const isCorrect=tile.id===tiles.find(t=>t.id!==undefined&&((rule==="color"?t.color===targetColor:rule==="shape"?t.shape===targetShape:rule==="opposite"?t.color===targetColor&&t.shape!==targetShape:t.color===targetColor||t.shape===targetShape)))?.id;const ok=matches&&isCorrect;if(tile.trap)setTraps(v=>v+1);if(ok){setCorrect(v=>v+1);setClean(v=>v+1);const ns=streak+1;setStreak(ns);setBestStreak(v=>Math.max(v,ns));}else{setMistakes(v=>v+1);setStreak(0);}if(round>=ROUNDS-1)setFinished(true);else{const nr=round+1;setRound(nr);beginRound(nr);}};
 const score=useMemo(()=>finished?Math.max(0,Math.min(100,Math.round(correct/ROUNDS*70+clean/ROUNDS*30-mistakes*2))):0,[finished,correct,clean,mistakes]);
 useEffect(()=>{if(!finished)return;let previous:[string,number][]=[["Focus",0],["Control",0],["Patience",0],["Persistence",0],["Consistency",0]];try{previous=JSON.parse(window.localStorage.getItem("forge.metrics")||JSON.stringify(previous))}catch{}window.localStorage.setItem("forge.metrics",JSON.stringify(previous.map(([n,v])=>n==="Control"?[n,Math.max(v,score)]:[n,v])));},[finished,score]);
 return <main className="game-shell"><div className="game-topbar"><Link href="/" className="game-back">← FORGE</Link><div className="game-progress">{started&&!finished?`ROUND ${round+1}/${ROUNDS}`:"SWITCH"}</div></div>
 {!started&&<section className="game-intro"><div className="eyebrow">SWITCH · CONTROL & INTERFERENCE</div><h1>Beat the obvious answer.</h1><p>The board is designed to tempt you. Read the rule, ignore the distracting feature, and choose deliberately. As you progress, the rule changes and the traps become stronger.</p><div className="rule-pills"><span>Read the rule</span><span>Ignore interference</span><span>Adapt</span></div><button className="btn btn-primary" onClick={begin}>Start Switch</button></section>}
 {started&&!finished&&<section className="game-stage"><div className={`target-card switch-rule ${signal?"armed":"waiting"}`}><span>{signal?"CONTROL RULE":"PAUSE"}</span><strong>{signal?ruleLabel:"Read before acting…"}</strong></div><div className="switch-field">{tiles.map(tile=><button key={tile.id} className={`switch-tile tile-${tile.color.toLowerCase()} ${tile.trap?"trap-tile":""}`} onClick={()=>choose(tile)} aria-label={`${tile.color} ${tile.shape}`}><span>{icon(tile.shape)}</span></button>)}</div><div className="live-stats"><span>ROUND <b>{round+1}</b></span><span>CLEAN <b>{clean}</b></span><span>STREAK <b>{streak}</b></span></div><p className="game-hint">Do not follow the tile that merely looks tempting. Follow the rule you were given.</p></section>}
 {finished&&<section className="result-card"><div className="eyebrow">SWITCH COMPLETE</div><div className="result-score">{score}</div><div className="result-label">CONTROL SCORE</div><div className="result-stats"><div><strong>{correct}</strong><span>correct</span></div><div><strong>{mistakes}</strong><span>mistakes</span></div><div><strong>{bestStreak}</strong><span>best streak</span></div></div><p>{score>=80?"You consistently followed the current rule despite competing signals.":"Your mistakes show where the tempting response won. Replay and try to notice the rule before acting."}</p><div className="cta-row"><button className="btn btn-primary" onClick={begin}>Try again</button><Link href="/" className="btn btn-secondary">I'm done</Link></div></section>}
 </main>;
}
