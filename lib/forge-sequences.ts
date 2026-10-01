export type SequenceSymbol = {
  id: string;
  family: string;
  value: string;
};

export type SequenceConstraints = {
  length: number;
  families?: string[];
  values?: string[];
  noAdjacentFamily?: boolean;
  noAdjacentValue?: boolean;
  uniqueFamily?: boolean;
  uniqueValue?: boolean;
  avoidPrevious?: string[];
};

export type GeneratedSequence = {
  items: SequenceSymbol[];
  difficulty: number;
  signature: string;
};

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function signature(items: SequenceSymbol[]) {
  return items.map((item) => item.id).join("|");
}

function valid(
  candidate: SequenceSymbol[],
  constraints: SequenceConstraints,
) {
  if (constraints.uniqueFamily) {
    const families = new Set(candidate.map((item) => item.family));
    if (families.size !== candidate.length) return false;
  }

  if (constraints.uniqueValue) {
    const values = new Set(candidate.map((item) => item.value));
    if (values.size !== candidate.length) return false;
  }

  if (constraints.noAdjacentFamily) {
    for (let i = 1; i < candidate.length; i += 1) {
      if (candidate[i].family === candidate[i - 1].family) return false;
    }
  }

  if (constraints.noAdjacentValue) {
    for (let i = 1; i < candidate.length; i += 1) {
      if (candidate[i].value === candidate[i - 1].value) return false;
    }
  }

  if (constraints.avoidPrevious?.length) {
    const previous = new Set(constraints.avoidPrevious);
    const overlap = candidate.filter((item) => previous.has(item.id)).length;
    if (overlap > Math.floor(candidate.length / 3)) return false;
  }

  return true;
}

export function generateSequence(
  pool: SequenceSymbol[],
  constraints: SequenceConstraints,
): GeneratedSequence {
  const filtered = pool.filter((item) => {
    if (constraints.families?.length && !constraints.families.includes(item.family)) return false;
    if (constraints.values?.length && !constraints.values.includes(item.value)) return false;
    return true;
  });

  if (filtered.length < constraints.length) {
    throw new Error("Sequence pool is smaller than the requested sequence length.");
  }

  for (let attempt = 0; attempt < 250; attempt += 1) {
    const candidate = shuffle(filtered).slice(0, constraints.length);
    if (valid(candidate, constraints)) {
      return {
        items: candidate,
        difficulty: calculateSequenceDifficulty(candidate, pool, constraints),
        signature: signature(candidate),
      };
    }
  }

  // Deterministic fallback still respects uniqueness when the pool permits it.
  const fallback = shuffle(filtered).slice(0, constraints.length);
  return {
    items: fallback,
    difficulty: calculateSequenceDifficulty(fallback, pool, constraints),
    signature: signature(fallback),
  };
}

export function calculateSequenceDifficulty(
  items: SequenceSymbol[],
  pool: SequenceSymbol[],
  constraints: SequenceConstraints,
) {
  const lengthFactor = Math.min(1, items.length / Math.max(1, Math.min(12, pool.length)));
  const familyFactor = constraints.noAdjacentFamily ? 0.12 : 0;
  const valueFactor = constraints.noAdjacentValue ? 0.12 : 0;
  const uniquenessFactor =
    (constraints.uniqueFamily ? 0.1 : 0) +
    (constraints.uniqueValue ? 0.1 : 0);

  const transitionChanges = items.reduce((count, item, index) => {
    if (index === 0) return count;
    return count
      + Number(item.family !== items[index - 1].family)
      + Number(item.value !== items[index - 1].value);
  }, 0);

  const transitionFactor = items.length > 1
    ? (transitionChanges / ((items.length - 1) * 2)) * 0.24
    : 0;

  return Math.max(
    0,
    Math.min(1, 0.25 + lengthFactor * 0.35 + familyFactor + valueFactor + uniquenessFactor + transitionFactor),
  );
}
