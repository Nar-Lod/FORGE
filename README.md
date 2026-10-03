# FORGE

FORGE is a game-first training system for Focus, Control, Patience, Persistence and Consistency. Its design goal is not raw retention: it trains deliberate attention, inhibition, persistence, memory, recovery and healthy stopping.

## Development roadmap — authoritative schedule

**Schedule basis:** maximum **120 minutes (2 hours) of FORGE development per day**.

**Schedule start:** Monday, September 28, 2026  
**Current scheduled day:** **Day 4 — Thursday, October 1, 2026**  
**Total planned development budget:** **60 hours / 30 days**  
**Scheduled time through today:** **8 hours / 60 hours (13.3%)**  
**Scheduled time remaining:** **52 hours**  
**Projected scheduled completion:** **Tuesday, October 27, 2026**, assuming the daily 120-minute cap is respected.

> **Important tracking rule:** calendar progress, scheduled hours, and implementation coverage are different measurements. Never describe the product as “13.3% complete” simply because 8 of 60 scheduled hours have elapsed.

## System composition and effort allocation

The percentages below are the planned share of the complete 60-hour roadmap. They are **effort allocation**, not quality scores or readiness scores.

| ID | System section | Share | Planned hours | Current implementation coverage* |
|---|---|---:|---:|---:|
| 01 | Architecture & product foundation | 8% | 4.8h | 100% |
| 02 | Core game mechanics | 12% | 7.2h | 100% |
| 03 | Focus | 15% | 9.0h | 50% |
| 04 | Control | 10% | 6.0h | 55% |
| 05 | Memory suite — Persistence / Consistency / Recall | 12% | 7.2h | 85% |
| 06 | Patience & healthy-use system | 8% | 4.8h | 85% |
| 07 | Intelligence layer / player model | 10% | 6.0h | 100% |
| 08 | Progression, Credits, mastery & economy | 7% | 4.2h | 70% |
| 09 | Analytics, privacy & data architecture | 5% | 3.0h | 70% |
| 10 | UX, visual polish, audio, haptics, accessibility & mobile | 5% | 3.0h | 60% |
| 11 | QA, performance, security & cross-device verification | 5% | 3.0h | 15% |
| 12 | Release, documentation & long-term roadmap | 3% | 1.8h | 15% |
| **TOTAL** | | **100%** | **60.0h** | |

*Coverage is a working implementation estimate, **not a test-certified readiness score**. A section is complete only when its research, design, implementation, instrumentation, verification and documentation gates pass.

## Development journey

```
DAY 01–04  FOUNDATION + INTELLIGENCE
███████░░░░░░░░░░░░░░░░░░░  8h scheduled

DAY 05–10  FOCUS COMPLETION
███████████░░░░░░░░░░░░░░░  +12h

DAY 11–14  CONTROL
██████████████░░░░░░░░░░░░  +8h

DAY 15–17  MEMORY INTEGRATION
████████████████░░░░░░░░░░  +6h

DAY 18–21  PATIENCE + ECONOMY
███████████████████░░░░░░░  +8h

DAY 22–25  DATA + UX
██████████████████████░░░░  +8h

DAY 26–28  SYSTEM QA
████████████████████████░░  +6h

DAY 29–30  RELEASE + FINAL GATE
██████████████████████████  +4h
```

**Target end:** October 27, 2026.

## 30-day fragmented schedule

Each row represents one development day and a maximum of 120 minutes. A day is not allowed to silently expand beyond the budget; unfinished work becomes the next scheduled chunk.

| Day | Date | 120-minute chunk | Status |
|---:|---|---|---|
| 1 | Sep 28 | Foundation audit + repository structure | Completed |
| 2 | Sep 29 | Core game loop + five-skill playable surface | Completed |
| 3 | Sep 30 | Game stabilization + memory/patience/control upgrades | Completed |
| 4 | Oct 1 | Intelligence layer + Focus diagnostic/foundation | **Current** |
| 5 | Oct 2 | Focus research gate + multidimensional difficulty model | Planned |
| 6 | Oct 3 | Focus target/distractor generator | Planned |
| 7 | Oct 4 | Focus adaptive timing + reaction-quality metrics | Planned |
| 8 | Oct 5 | Focus fatigue/recovery + challenge-quality selection | Planned |
| 9 | Oct 6 | Focus UX, game feel and mobile optimization | Planned |
| 10 | Oct 7 | Focus QA + production verification | Planned |
| 11 | Oct 8 | Control research + rule/interference specification | Planned |
| 12 | Oct 9 | Control multidimensional challenge generator | Planned |
| 13 | Oct 10 | Control adaptive behavior + recovery | Planned |
| 14 | Oct 11 | Control UX/audio/mobile + QA | Planned |
| 15 | Oct 12 | Memory: Recall integration audit | Planned |
| 16 | Oct 13 | Memory: shared generator + mastery consistency | Planned |
| 17 | Oct 14 | Memory: cross-game transfer + recovery polish | Planned |
| 18 | Oct 15 | Patience: healthy-use metrics audit | Planned |
| 19 | Oct 16 | Patience: notifications, milestones and safety polish | Planned |
| 20 | Oct 17 | Progression/economy: Credits + mastery specification | Planned |
| 21 | Oct 18 | Progression/economy implementation | Planned |
| 22 | Oct 19 | Analytics/data: event quality + session timing | Planned |
| 23 | Oct 20 | Analytics/data: privacy + backend migration contract | Planned |
| 24 | Oct 21 | UX: visual system + responsive/mobile pass | Planned |
| 25 | Oct 22 | UX: sound/haptics/accessibility | Planned |
| 26 | Oct 23 | Full system integration pass | Planned |
| 27 | Oct 24 | QA: functional/regression matrix | Planned |
| 28 | Oct 25 | QA: performance/device/production verification | Planned |
| 29 | Oct 26 | Release readiness + documentation | Planned |
| 30 | Oct 27 | Final integrated review + next-game expansion gate | Planned |

## Required workflow for every chunk

Every new feature or subsystem must pass the same sequence. All research, design, implementation and verification will be conducted in GPT unless a later task explicitly requires an external service.

### R0 — Scope & evidence
Define:
- the player behavior being trained;
- the measurable output;
- player/platform constraints;
- what is explicitly out of scope;
- the failure and recovery states.

### R1 — Systematic research
Before implementation, GPT should review the relevant evidence. Depending on the chunk this can include:
- cognitive-task and learning research where the mechanic makes a psychological claim;
- HCI/game-design research for interaction and difficulty;
- primary platform documentation for Android/iOS/web behavior, accessibility and performance;
- privacy/regulatory material when data, minors or monetization are involved;
- established game UX patterns when designing feedback, progression and game feel.

Research findings must be separated from inference and design preference. Do not claim that a game mechanic “improves cognition” unless the evidence actually supports that claim.

### R2 — Design contract
Before coding, write down:
- states and transitions;
- difficulty dimensions;
- variables and thresholds;
- scoring formula;
- adaptive rules;
- telemetry/events;
- recovery behavior;
- acceptance criteria;
- mobile/accessibility constraints.

### R3 — Build
Implement the smallest testable chunk. Reuse the shared FORGE contracts instead of creating parallel player-model, adaptive or analytics systems inside individual games.

### R4 — Instrument
Record enough information to distinguish:
- success;
- failure;
- timeout;
- false positive;
- recovery;
- assisted play;
- difficulty;
- session duration;
- rest/recovery behavior.

Never invent percentiles, benchmarks or player data.

### R5 — Verify
Verification must cover:
- code/build correctness where tooling is available;
- normal flow;
- edge cases;
- failure/recovery flow;
- mobile/touch behavior;
- persistence;
- production deployment when applicable.

### R6 — Review
Compare the observed behavior against the design contract. If evidence is weak, keep the mechanic conservative rather than simply making it faster or harder.

### R7 — Document
Update:
- README roadmap;
- development schedule;
- research findings;
- known limitations;
- commit/deployment reference;
- next gate.

## Completion gates

A subsystem moves to the next section only when all of these pass:

1. **Research gate** — relevant evidence reviewed.
2. **Design gate** — states, variables, difficulty, telemetry and acceptance criteria are explicit.
3. **Build gate** — implementation uses shared FORGE contracts.
4. **Evidence gate** — telemetry can distinguish the important outcomes.
5. **Verification gate** — no blocking regression and production behavior is checked where available.
6. **Documentation gate** — README/schedule and unresolved questions are current.

## What has already been tackled, in development order

The repository history establishes this sequence:

1. FORGE shell, visual system, landing/profile shell and navigation.
2. Playable Focus foundation.
3. Local profile/result persistence.
4. Dynamic/progressively difficult Focus foundation.
5. Switch/Control foundation and inhibition behavior.
6. Navigable skill-training pages.
7. Expanded Focus visual library and varied families.
8. Focus WAIT/round progression and configurable timing.
9. Patience and Consistency playable foundations.
10. Persistence visual sequence memory game.
11. Recall memory game foundation.
12. Consistency redesign around repeat-order accuracy and shuffled positions.
13. Game-first/mobile visual redesign.
14. Persistence correction/replacement flow and visual uniqueness.
15. Patience wait ladder, long-wait milestones and reflection guidance.
16. Persistence progression, scoring, feedback, mastery and mobile/recovery polish.
17. Credits wallet and Persistence Reveal framework.
18. Consistency mastery/recovery/Reveal framework.
19. Centralized adaptive profiles.
20. Unified multidimensional FORGE player model.
21. Challenge-quality selection and bounded cross-skill transfer.
22. Multidimensional performance vectors for Focus, Persistence and Consistency.
23. Shared constrained sequence generation.
24. Patience healthy-use analytics/events.
25. Persistence ↔ Consistency controlled transfer.
26. Focus grid population and duplicate-target fixes.
27. Focus timeout events and duplicate-target prevention.

## Current active section: Focus

### Focus difficulty contract — implemented

The Focus generator now treats difficulty as a measurable vector rather than a single level or reaction-time setting:

| Dimension | What it controls |
|---|---|
| Target similarity | How visually confusable the target is with competing items |
| Distractor similarity | How many distractors share target-family characteristics |
| Distractor diversity | How varied the competing items are |
| Spatial uncertainty | How unpredictable the target location is |
| Spatial competition | How strongly neighboring items compete for attention |
| Visual complexity | Rotation, scale, hue variation and presentation noise |
| Temporal pressure | Reaction-window pressure; deliberately kept secondary for now |

The generator contract lives in `lib/focus-generator.ts` and returns the target, target cell, fully populated grid, mode, difficulty vector and structural challenge score. Focus trial telemetry records these dimensions alongside HIT, FALSE_POSITIVE and TIMEOUT outcomes.

**Current build rule:** complexity changes before aggressive timing changes. The 3-second reaction baseline remains intact until the new perceptual generator and telemetry have enough evidence to support timing adaptation.

**Not yet introduced:** target-absent trials. They will be added only after the target-present generator is stable, because target prevalence changes decision behavior and would confound the first adaptive pass.


Focus is the next major build. The implementation target is **not** “make the reaction time faster.” Difficulty must become multidimensional:

1. reaction timing;
2. distractor density;
3. target/distractor similarity;
4. visual-family complexity;
5. positional uncertainty;
6. WAIT/no-tap intervals;
7. target duration and temporal dynamics;
8. false-positive rate versus miss/timeout rate;
9. reaction-quality distribution, not only average reaction time;
10. fatigue and within-session drift;
11. recovery after mistakes;
12. challenge-quality selection.

The current 3-second development window should remain the baseline until the evidence and adaptive model justify timing changes. Complexity should be varied before speed is aggressively reduced.

## Next sections after Focus

**Control → Memory integration → Patience/economy → Analytics/data → UX/audio/accessibility → full integration → QA → release.**

The other games will be integrated into the shared intelligence system as the roster expands, but we will not create separate intelligence architectures for each game.

## Current production verification

Latest verified production deployment:
- Commit: `b0f64fd578017fc3aff12e69c071a25281a20113`
- Change: `Record Focus timeouts and prevent duplicate target distractors`
- Status: **READY**
- Target: production

Earlier intelligence-layer production work includes the unified player model, adaptive profiles, challenge-quality selection, multidimensional performance vectors, healthy-use analytics and controlled cross-skill transfer.

## Development principle

FORGE is considered complete when the systems work together reliably, not when every screen merely exists.

The intended architecture remains:

```
EVENTS
   ↓
PLAYER MODEL
   ↓
ADAPTIVE ENGINE
   ↓
GAME GENERATOR
   ↓
SESSION RESULT
   ↓
MEASUREMENT / RECOVERY / REST
   ↓
NEXT APPROPRIATE CHALLENGE
```

The long-term loop is:

**PLAY → LEARN → IMPROVE → MEASURE → ADAPT → MASTER → REST → RETURN**

Healthy engagement is part of the product specification. The system should reward meaningful improvement and deliberate stopping rather than coercive repetition.


## Data architecture — canonical player record

The intelligence layer now has two explicit layers:

```
EVENT LOG (source of truth)
        ↓
CANONICAL PLAYER RECORD
        ↓
PLAYER MODEL / ADAPTIVE ENGINE
        ↓
GAME GENERATOR
        ↓
SESSION + ATTEMPT OUTCOMES
        ↓
EVENT LOG
```

### Canonical player record

Implemented in `lib/forge-data.ts`:

- **Player identity** — anonymous installation-scoped player ID; no email or real-world identity is required.
- **Profile** — versioned profile metadata and consent-version field.
- **Sessions** — start/end, duration, status, score, performance, difficulty, attempts, recovery and assistance counts.
- **Attempts** — outcome, performance, difficulty, score and assisted-play state.
- **Personal bests** — maintained per skill/game, with difficulty and achievement timestamp.
- **Improvement history** — longitudinal performance points retained separately from the current rating.
- **Break behavior** — rest/break records and completion state.
- **Healthy-use signals** — improvement per minute, recovery quality, rest performance, stopping quality, repeated attempts without improvement and deliberate break rate.
- **Training history** — bounded local history suitable for later synchronization to a server.

The existing `forge.analytics.events.v2` stream remains the event source. Events are now projected into the canonical record rather than creating a second independent game-state system.

### Server migration contract

The current implementation deliberately remains local-first. The canonical record is shaped so the local repository can later be replaced by a server repository without changing game mechanics:

```
Game → recordEvent()
          ↓
Local event ledger
          ↓
Canonical projection
          ↓
[future sync queue]
          ↓
Authenticated API / database
          ↓
Aggregated anonymized benchmark dataset
```

The future server should receive the minimum data required for training analytics. Raw gameplay events should not automatically become public leaderboard data, and personally identifying profile fields should be separated from benchmark aggregation.

## Global benchmark / percentile architecture

Implemented in `lib/forge-benchmarks.ts` as a **benchmark contract**, not as fabricated live rankings.

The intended scoring flow is:

```
raw session performance
        ↓
difficulty adjustment
        ↓
experience/sample-size adjustment
        ↓
reliability / stability
        ↓
FORGE skill score
        ↓
population benchmark distribution
        ↓
percentile
```

The benchmark layer supports:

- Global
- Country
- Age bracket
- Friends
- Weekly
- Monthly

Personal performance remains separate from population benchmarking.

### Important benchmark rules

1. **No fake percentile.** If a population distribution does not exist, FORGE reports that benchmarking is unavailable.
2. **Minimum population.** A benchmark requires at least 1,000 comparable observations by default.
3. **Minimum player history.** A player needs several comparable sessions before a population comparison is meaningful.
4. **Difficulty matters.** A result achieved under greater measured difficulty contributes differently from an easy result.
5. **Experience matters.** Early observations are shrunk toward a neutral midpoint until enough evidence exists.
6. **Reliability is separate from skill.** A single exceptional session should not be treated as a stable estimate.
7. **Benchmark freshness matters.** Stale population distributions are not presented as current.
8. **Cohort privacy.** Country/age cohorts should be opt-in, coarse-grained and aggregated server-side; FORGE should not infer sensitive attributes from gameplay.
9. **Percentile is descriptive, not a reward loop.** It should never become a coercive reason to keep playing.

### What is intentionally not live yet

There is currently no population dataset, authenticated multi-device identity, country/age cohort store, friends graph or server-side benchmark service. Therefore FORGE must **not** display statements such as “better than 78% of players” yet.

When the backend exists, the benchmark service should publish versioned distributions rather than raw player records. Clients can then calculate a percentile against a signed/versioned distribution while retaining the ability to show the benchmark date and population size.

## Data quality gate before global benchmarking

Global benchmarking should not activate until these conditions are met:

- enough anonymized observations per skill and difficulty band;
- stable event schema across released clients;
- duplicate/replay detection;
- bot/automation and obviously invalid-session filtering;
- session-duration and outcome integrity checks;
- difficulty calibration across devices;
- benchmark refresh/versioning;
- privacy/consent review for any cohort segmentation;
- monitoring for distribution drift.

This keeps the benchmark system from turning an early, biased player population into a misleading “global” score.
