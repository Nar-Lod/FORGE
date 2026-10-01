import type { FocusItem } from "./focus-library";

export type FocusDifficultyVector = {
  targetSimilarity: number;
  distractorSimilarity: number;
  distractorDiversity: number;
  spatialUncertainty: number;
  spatialCompetition: number;
  visualComplexity: number;
  temporalPressure: number;
};

export type FocusCell = {
  item: FocusItem;
  isTarget: boolean;
  similarity: number;
  variant: {
    hueShift: number;
    rotation: number;
    scale: number;
    opacity: number;
    borderWeight: number;
  };
};

export type FocusChallenge = {
  target: FocusItem;
  targetCell: number;
  cells: FocusCell[];
  mode: string;
  difficulty: FocusDifficultyVector;
  structuralScore: number;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function chooseTargetCell(gridSize: number, spatialUncertainty: number) {
  // Low uncertainty teaches broad search. Higher uncertainty removes positional
  // predictability by avoiding repeated regions and edge/center habits.
  const candidates = Array.from({ length: gridSize }, (_, index) => index);
  if (spatialUncertainty < 0.35) {
    const preferred = candidates.filter((index) => index % 2 === 0);
    return pick(preferred.length ? preferred : candidates);
  }
  if (spatialUncertainty < 0.7) return pick(candidates);
  const weighted = candidates.flatMap((index) =>
    Array.from({ length: 1 + (index % 3 === 0 ? 2 : 0) }, () => index),
  );
  return pick(weighted);
}

function buildDistractors(
  pool: FocusItem[],
  target: FocusItem,
  count: number,
  distractorSimilarity: number,
  distractorDiversity: number,
) {
  const withoutTarget = pool.filter((item) => item.id !== target.id);
  const sameFamily = withoutTarget.filter((item) => item.tone === target.tone);
  const differentFamily = withoutTarget.filter((item) => item.tone !== target.tone);

  const similarCount = Math.round(count * (0.25 + distractorSimilarity * 0.55));
  const diverseCount = Math.max(0, count - similarCount);
  const similar = shuffle(sameFamily.length ? sameFamily : withoutTarget).slice(0, similarCount);

  const remaining = shuffle(
    differentFamily.length ? differentFamily : withoutTarget,
  ).filter((item) => !similar.some((candidate) => candidate.id === item.id));

  const diverse = remaining.slice(0, diverseCount);
  const merged = [...similar, ...diverse];

  // Refill without duplicates when the family pool is small.
  const used = new Set(merged.map((item) => item.id));
  for (const item of shuffle(withoutTarget)) {
    if (merged.length >= count) break;
    if (!used.has(item.id)) {
      used.add(item.id);
      merged.push(item);
    }
  }
  return merged.slice(0, count);
}

function cellVariant(index: number, isTarget: boolean, difficulty: FocusDifficultyVector) {
  if (isTarget) {
    return { hueShift: 0, rotation: 0, scale: 1, opacity: 1, borderWeight: 2 };
  }

  const similarity = difficulty.targetSimilarity;
  const rotationRange = 4 + difficulty.visualComplexity * 24;
  const hueRange = 8 + (1 - similarity) * 72;
  const scaleRange = 0.06 + difficulty.visualComplexity * 0.22;

  return {
    hueShift: Math.round(((index * 31) % (hueRange * 2 + 1)) - hueRange),
    rotation: Math.round(((index * 17) % (rotationRange * 2 + 1)) - rotationRange),
    scale: Number((1 - scaleRange / 2 + ((index * 13) % 100) / 100 * scaleRange).toFixed(2)),
    opacity: Number((0.78 + ((index * 7) % 18) / 100).toFixed(2)),
    borderWeight: difficulty.spatialCompetition > 0.65 ? 1 : 2,
  };
}

export function generateFocusChallenge({
  mode,
  library,
  gridSize,
  level,
  difficulty,
}: {
  mode: string;
  library: FocusItem[];
  gridSize: number;
  level: number;
  difficulty: FocusDifficultyVector;
}): FocusChallenge {
  const target = pick(library);
  const targetCell = chooseTargetCell(gridSize, difficulty.spatialUncertainty);
  const distractorCount = gridSize - 1;

  const distractors = buildDistractors(
    library,
    target,
    distractorCount,
    difficulty.distractorSimilarity,
    difficulty.distractorDiversity,
  );

  const cells: FocusCell[] = [];
  let cursor = 0;

  for (let index = 0; index < gridSize; index += 1) {
    const isTarget = index === targetCell;
    const item = isTarget ? target : distractors[cursor++ % Math.max(1, distractors.length)];
    cells.push({
      item,
      isTarget,
      similarity: isTarget ? 1 : clamp(
        difficulty.targetSimilarity +
          (item.tone === target.tone ? 0.12 : -0.12) +
          (index % 5) * 0.01,
      ),
      variant: cellVariant(index, isTarget, difficulty),
    });
  }

  const structuralScore = clamp(
    difficulty.targetSimilarity * 0.22 +
    difficulty.distractorSimilarity * 0.16 +
    difficulty.distractorDiversity * 0.12 +
    difficulty.spatialUncertainty * 0.14 +
    difficulty.spatialCompetition * 0.14 +
    difficulty.visualComplexity * 0.12 +
    difficulty.temporalPressure * 0.10 +
    (level / 5) * 0.10,
  );

  return { target, targetCell, cells, mode, difficulty, structuralScore };
}

export function focusDifficultyForLevel(level: number): FocusDifficultyVector {
  const normalized = clamp((level - 1) / 4);
  return {
    targetSimilarity: 0.18 + normalized * 0.64,
    distractorSimilarity: 0.16 + normalized * 0.66,
    distractorDiversity: 0.22 + normalized * 0.58,
    spatialUncertainty: 0.20 + normalized * 0.70,
    spatialCompetition: 0.18 + normalized * 0.68,
    visualComplexity: 0.12 + normalized * 0.72,
    // Timing is intentionally a secondary difficulty axis.
    temporalPressure: 0.08 + normalized * 0.24,
  };
}
