const SKILL_ATTRIBUTE_MAP = {
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
const t = (key, fallback) => {
    const localized = game.i18n?.localize(key);
    return localized && localized !== key ? localized : fallback;
};
const clampInt = (value, min = 0) => {
    if (!Number.isFinite(value))
        return min;
    return Math.max(min, Math.floor(value));
};
const rollD6 = (rng) => Math.floor(rng() * 6) + 1;
const uniqueIndices = (indices, maxExclusive) => {
    const seen = new Set();
    const cleaned = [];
    for (const idx of indices) {
        const n = Math.floor(idx);
        if (n < 0 || n >= maxExclusive)
            continue;
        if (seen.has(n))
            continue;
        seen.add(n);
        cleaned.push(n);
    }
    return cleaned;
};
export const getSkillAttribute = (skill, attributeOverride) => {
    if (attributeOverride)
        return attributeOverride;
    if (skill === "szepty") {
        throw new Error(t("NGH.Error.WhisperAttributeOverrideRequired", "Whisper tests require an explicit attributeOverride"));
    }
    return SKILL_ATTRIBUTE_MAP[skill];
};
export const executeSkillTest = (options, rng = Math.random) => {
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
export const rollChallenge = (participants, skill, difficulty, attributeOverride) => {
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
