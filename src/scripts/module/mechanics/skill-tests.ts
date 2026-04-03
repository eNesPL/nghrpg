export type NGHAttributeKey = "krzepa" | "spryt" | "hart";

export type NGHSkillKey =
  | "atletyka"
  | "walkaWrecz"
  | "skradanie"
  | "komunikacja"
  | "wiedza"
  | "mechanika"
  | "sledztwo"
  | "walkaDystansowa"
  | "transport"
  | "szepty";

const SKILL_ATTRIBUTE_MAP: Record<Exclude<NGHSkillKey, "szepty">, NGHAttributeKey> = {
  atletyka: "krzepa",
  walkaWrecz: "krzepa",
  skradanie: "krzepa",
  komunikacja: "spryt",
  wiedza: "spryt",
  mechanika: "spryt",
  sledztwo: "hart",
  walkaDystansowa: "hart",
  transport: "hart"
};

const t = (key: string, fallback: string): string => {
  const localized = game.i18n?.localize(key);
  return localized && localized !== key ? localized : fallback;
};

export interface NGHSkillTestOptions {
  skill: NGHSkillKey;
  difficulty: number;
  skillLevel: number;
  attributeValue: number;
  attributeOverride?: NGHAttributeKey;
  temporaryTraining?: boolean;
  bonusDice?: number;
  rerollIndices?: number[];
  increaseIndices?: number[];
}

export interface NGHSkillTestResult {
  skill: NGHSkillKey;
  attribute: NGHAttributeKey;
  difficulty: number;
  diceCount: number;
  rollsBeforePost: number[];
  rollsAfterPost: number[];
  successes: number;
  passed: boolean;
  modifiers: {
    budget: number;
    spent: number;
    remaining: number;
    temporaryTrainingUsed: boolean;
    bonusDiceUsed: number;
    rerollUsed: boolean;
    increasesUsed: number;
  };
}

export interface NGHChallengeParticipant {
  id: string;
  label: string;
  skillLevel: number;
  attributeValue: number;
  bonusDice?: number;
  temporaryTraining?: boolean;
}

export interface NGHChallengeResult {
  skill: NGHSkillKey;
  difficulty: number;
  totalSuccesses: number;
  passed: boolean;
  participants: Array<{
    id: string;
    label: string;
    successes: number;
    rolls: number[];
  }>;
}

const clampInt = (value: number, min = 0) => {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.floor(value));
};

const rollD6 = (rng: () => number): number => Math.floor(rng() * 6) + 1;

const uniqueIndices = (indices: number[], maxExclusive: number): number[] => {
  const seen = new Set<number>();
  const cleaned: number[] = [];

  for (const idx of indices) {
    const n = Math.floor(idx);
    if (n < 0 || n >= maxExclusive) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    cleaned.push(n);
  }

  return cleaned;
};

export const getSkillAttribute = (
  skill: NGHSkillKey,
  attributeOverride?: NGHAttributeKey
): NGHAttributeKey => {
  if (attributeOverride) return attributeOverride;
  if (skill === "szepty") {
    throw new Error(t("NGH.Error.WhisperAttributeOverrideRequired", "Whisper tests require an explicit attributeOverride"));
  }
  return SKILL_ATTRIBUTE_MAP[skill];
};

export const executeSkillTest = (
  options: NGHSkillTestOptions,
  rng: () => number = Math.random
): NGHSkillTestResult => {
  const difficulty = clampInt(options.difficulty, 1);
  const skillLevel = clampInt(options.skillLevel, 0);
  const attributeValue = clampInt(options.attributeValue, 0);
  const bonusDice = clampInt(options.bonusDice ?? 0, 0);
  const temporaryTrainingRequested = Boolean(options.temporaryTraining);

  let spent = 0;
  let effectiveSkillLevel = skillLevel;
  let temporaryTrainingUsed = false;

  if (temporaryTrainingRequested && skillLevel < 1) {
    temporaryTrainingUsed = true;
    effectiveSkillLevel = 1;
    spent += 1;
  }

  spent += bonusDice;

  if (spent > attributeValue) {
    throw new Error(t("NGH.Error.ModifierBudgetExceededBeforeRoll", "Modifier budget exceeded before roll"));
  }

  const diceCount = effectiveSkillLevel + bonusDice;
  const rollsBeforePost = Array.from({ length: diceCount }, () => rollD6(rng));
  const rollsAfterPost = [...rollsBeforePost];

  const rerollIndices = uniqueIndices(options.rerollIndices ?? [], rollsAfterPost.length);
  let rerollUsed = false;

  if (rerollIndices.length > 0) {
    rerollUsed = true;
    spent += 1;
    if (spent > attributeValue) {
      throw new Error(t("NGH.Error.ModifierBudgetExceededReroll", "Modifier budget exceeded when applying reroll"));
    }

    for (const idx of rerollIndices) {
      rollsAfterPost[idx] = rollD6(rng);
    }
  }

  const increaseIndices = uniqueIndices(options.increaseIndices ?? [], rollsAfterPost.length);
  spent += increaseIndices.length;

  if (spent > attributeValue) {
    throw new Error(t("NGH.Error.ModifierBudgetExceededIncrease", "Modifier budget exceeded when increasing dice"));
  }

  for (const idx of increaseIndices) {
    rollsAfterPost[idx] = Math.min(6, rollsAfterPost[idx] + 1);
  }

  const successes = rollsAfterPost.filter((roll) => roll >= 5).length;

  return {
    skill: options.skill,
    attribute: getSkillAttribute(options.skill, options.attributeOverride),
    difficulty,
    diceCount,
    rollsBeforePost,
    rollsAfterPost,
    successes,
    passed: successes >= difficulty,
    modifiers: {
      budget: attributeValue,
      spent,
      remaining: Math.max(0, attributeValue - spent),
      temporaryTrainingUsed,
      bonusDiceUsed: bonusDice,
      rerollUsed,
      increasesUsed: increaseIndices.length
    }
  };
};

export const rollChallenge = (
  participants: NGHChallengeParticipant[],
  skill: NGHSkillKey,
  difficulty: number,
  attributeOverride?: NGHAttributeKey
): NGHChallengeResult => {
  const results = participants.map((participant) => {
    const test = executeSkillTest({
      skill,
      difficulty: 1,
      skillLevel: participant.skillLevel,
      attributeValue: participant.attributeValue,
      attributeOverride,
      bonusDice: participant.bonusDice,
      temporaryTraining: participant.temporaryTraining
    });
    return {
      id: participant.id,
      label: participant.label,
      successes: test.successes,
      rolls: test.rollsAfterPost
    };
  });

  const totalSuccesses = results.reduce((sum, entry) => sum + entry.successes, 0);
  const target = clampInt(difficulty, 1);

  return {
    skill,
    difficulty: target,
    totalSuccesses,
    passed: totalSuccesses >= target,
    participants: results
  };
};
