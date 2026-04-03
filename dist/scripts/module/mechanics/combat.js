import { parseCard } from "./card-usage.js";
const t = (key, fallback) => {
    const localized = game.i18n?.localize(key);
    return localized && localized !== key ? localized : fallback;
};
const tf = (key, data, fallback) => {
    const localized = game.i18n?.format(key, data);
    return localized && localized !== key ? localized : fallback;
};
const WEAPON_LABEL_KEYS = {
    fistsWeak: "NGH.Combat.Weapon.FistsWeak",
    fistsStandard: "NGH.Combat.Weapon.FistsStandard",
    fistsStrong: "NGH.Combat.Weapon.FistsStrong",
    knife: "NGH.Combat.Weapon.Knife",
    club: "NGH.Combat.Weapon.Club",
    swordBayonet: "NGH.Combat.Weapon.SwordBayonet",
    axePick: "NGH.Combat.Weapon.AxePick",
    staff: "NGH.Combat.Weapon.Staff",
    pistol: "NGH.Combat.Weapon.Pistol",
    rifle: "NGH.Combat.Weapon.Rifle",
    machineGun: "NGH.Combat.Weapon.MachineGun",
    explosives: "NGH.Combat.Weapon.Explosives",
    grenade: "NGH.Combat.Weapon.Grenade"
};
const EFFECT_LABEL_KEYS = {
    bonusDamage: "NGH.Combat.Effect.BonusDamage",
    stun: "NGH.Combat.Effect.Stun",
    aim: "NGH.Combat.Effect.Aim",
    overwhelm: "NGH.Combat.Effect.Overwhelm",
    spray: "NGH.Combat.Effect.Spray",
    flurry: "NGH.Combat.Effect.Flurry",
    critical: "NGH.Combat.Effect.Critical",
    shatter: "NGH.Combat.Effect.Shatter",
    shrapnel: "NGH.Combat.Effect.Shrapnel"
};
const rollD6 = (rng = Math.random) => Math.floor(rng() * 6) + 1;
export const NGH_WEAPON_PROFILES = {
    fistsWeak: {
        id: "fistsWeak",
        label: "Pięści (<3 Krzepa)",
        skill: "walkaWrecz",
        targetAttribute: "krzepa",
        baseDamage: 0,
        effects: [{ key: "bonusDamage", cost: 2, label: "+1 damage" }]
    },
    fistsStandard: {
        id: "fistsStandard",
        label: "Pięści (3-7 Krzepa)",
        skill: "walkaWrecz",
        targetAttribute: "krzepa",
        baseDamage: 1,
        effects: [{ key: "bonusDamage", cost: 2, label: "+1 damage" }]
    },
    fistsStrong: {
        id: "fistsStrong",
        label: "Pięści (>7 Krzepa)",
        skill: "walkaWrecz",
        targetAttribute: "krzepa",
        baseDamage: 2,
        effects: [{ key: "bonusDamage", cost: 2, label: "+1 damage" }]
    },
    knife: {
        id: "knife",
        label: "Nóż",
        skill: "walkaWrecz",
        targetAttribute: "krzepa",
        baseDamage: 1,
        effects: [{ key: "bonusDamage", cost: 2, label: "+1 damage" }]
    },
    club: {
        id: "club",
        label: "Pałka",
        skill: "walkaWrecz",
        targetAttribute: "krzepa",
        baseDamage: 1,
        effects: [
            { key: "bonusDamage", cost: 2, label: "+1 damage" },
            { key: "stun", cost: 3, label: "Ogłuszenie" }
        ]
    },
    swordBayonet: {
        id: "swordBayonet",
        label: "Miecz / Bagnet",
        skill: "walkaWrecz",
        targetAttribute: "krzepa",
        baseDamage: 1,
        effects: [
            { key: "bonusDamage", cost: 2, label: "+1 damage" },
            { key: "overwhelm", cost: 3, label: "Przytłoczenie" }
        ]
    },
    axePick: {
        id: "axePick",
        label: "Siekiera / Kilof",
        skill: "walkaWrecz",
        targetAttribute: "krzepa",
        baseDamage: 1,
        effects: [
            { key: "bonusDamage", cost: 2, label: "+1 damage" },
            { key: "shatter", cost: 3, label: "Zdruzgotanie" }
        ]
    },
    staff: {
        id: "staff",
        label: "Kostur",
        skill: "walkaWrecz",
        targetAttribute: "krzepa",
        baseDamage: 1,
        effects: [
            { key: "bonusDamage", cost: 2, label: "+1 damage" },
            { key: "flurry", cost: 3, label: "Seria ciosów" }
        ]
    },
    pistol: {
        id: "pistol",
        label: "Pistolet",
        skill: "walkaDystansowa",
        targetAttribute: "krzepa",
        baseDamage: 2,
        effects: []
    },
    rifle: {
        id: "rifle",
        label: "Karabin",
        skill: "walkaDystansowa",
        targetAttribute: "krzepa",
        baseDamage: 2,
        effects: [
            { key: "critical", cost: 3, label: "Trafienie krytyczne" },
            { key: "aim", cost: 1, label: "Przycelowanie" }
        ]
    },
    machineGun: {
        id: "machineGun",
        label: "Karabin maszynowy",
        skill: "walkaDystansowa",
        targetAttribute: "krzepa",
        baseDamage: 2,
        effects: [
            { key: "critical", cost: 3, label: "Trafienie krytyczne" },
            { key: "spray", cost: 2, label: "Rozrzut" }
        ]
    },
    explosives: {
        id: "explosives",
        label: "Materiały wybuchowe",
        skill: "walkaDystansowa",
        targetAttribute: "krzepa",
        baseDamage: 2,
        effects: [
            { key: "bonusDamage", cost: 1, label: "+1 damage" },
            { key: "shrapnel", cost: 3, label: "Odłamki" }
        ]
    },
    grenade: {
        id: "grenade",
        label: "Granat",
        skill: "walkaDystansowa",
        targetAttribute: "krzepa",
        baseDamage: 1,
        effects: [{ key: "shrapnel", cost: 0, label: "Odłamki" }]
    }
};
const uniqueEffects = (keys) => [...new Set(keys)];
const localizeWeaponProfile = (profile) => ({
    ...profile,
    label: t(WEAPON_LABEL_KEYS[profile.id] ?? profile.id, profile.label),
    effects: profile.effects.map((effect) => ({
        ...effect,
        label: t(EFFECT_LABEL_KEYS[effect.key] ?? effect.key, effect.label)
    }))
});
export const getWeaponProfile = (weaponId) => {
    const profile = NGH_WEAPON_PROFILES[weaponId];
    if (!profile)
        throw new Error(tf("NGH.Error.UnknownWeaponProfile", { weaponId }, `Unknown weapon profile: ${weaponId}`));
    return localizeWeaponProfile(profile);
};
export const resolveWeaponAttack = (options) => {
    const weapon = getWeaponProfile(options.weaponId);
    const successes = Math.max(0, Math.floor(options.successes));
    const defense = Math.max(0, Math.floor(options.defense));
    const hit = successes >= defense;
    const surplus = hit ? successes - defense : 0;
    const availableEffects = weapon.effects.filter((effect) => effect.cost <= surplus);
    const selectedKeys = uniqueEffects(options.selectedEffects ?? []);
    const selectedEffects = selectedKeys.map((key) => {
        const effect = weapon.effects.find((candidate) => candidate.key === key);
        if (!effect) {
            throw new Error(tf("NGH.Error.UnsupportedWeaponEffect", { weaponId: weapon.id, effect: key }, `Weapon ${weapon.id} does not support effect ${key}`));
        }
        return effect;
    });
    const spentSurplus = selectedEffects.reduce((sum, effect) => sum + effect.cost, 0);
    if (spentSurplus > surplus) {
        throw new Error(t("NGH.Error.WeaponEffectsExceedSurplus", "Selected weapon effects exceed available surplus successes"));
    }
    let totalDamage = hit ? weapon.baseDamage : 0;
    let ignoredArmorOnNextAttack = false;
    let extraTargets = 0;
    let followUpAttack = false;
    let targetArmorReducedBy = 0;
    let criticalDamage = null;
    for (const effect of selectedEffects) {
        switch (effect.key) {
            case "bonusDamage":
                totalDamage += 1;
                break;
            case "aim":
                ignoredArmorOnNextAttack = true;
                break;
            case "spray":
                extraTargets += 1;
                break;
            case "flurry":
                followUpAttack = true;
                break;
            case "critical":
                criticalDamage = rollD6(options.rng);
                totalDamage = criticalDamage;
                break;
            case "shatter":
                targetArmorReducedBy += 1;
                break;
            case "stun":
            case "overwhelm":
            case "shrapnel":
                break;
            default:
                break;
        }
    }
    return {
        weapon,
        successes,
        defense,
        hit,
        surplus,
        baseDamage: weapon.baseDamage,
        totalDamage,
        selectedEffects,
        availableEffects,
        ignoredArmorOnNextAttack,
        extraTargets,
        followUpAttack,
        targetArmorReducedBy,
        criticalDamage
    };
};
export const resolveInitiativeOrder = (entries) => {
    const resolved = entries.map((entry) => {
        const parsedCard = entry.card ? parseCard(entry.card) : null;
        return {
            ...entry,
            parsedCard,
            score: parsedCard?.score ?? Math.max(0, Math.floor(entry.fixedScore ?? 0)),
            tied: false
        };
    });
    resolved.sort((left, right) => right.score - left.score);
    for (let index = 0; index < resolved.length - 1; index += 1) {
        if (resolved[index].score === resolved[index + 1].score) {
            resolved[index].tied = true;
            resolved[index + 1].tied = true;
        }
    }
    return resolved;
};
/**
 * Returns the effective PT for an attack against a target.
 * PT = max(target's Krzepa, target's armor value).
 * Armor value of 0 means no armor (default PT = Krzepa).
 */
export const computeAttackPT = (targetKrzepa, targetArmor) => {
    return Math.max(Math.max(0, Math.floor(targetKrzepa)), Math.max(0, Math.floor(targetArmor)));
};
/**
 * Resolves a tie between two initiative entries by comparing additional tie-breaker cards.
 * Returns positive if entryA wins, negative if entryB wins, 0 if still tied.
 */
export const resolveTieBreaker = (cardA, cardB) => {
    const scoreA = cardA ? (parseCard(cardA)?.score ?? 0) : 0;
    const scoreB = cardB ? (parseCard(cardB)?.score ?? 0) : 0;
    return scoreA - scoreB;
};
/**
 * Returns the IDs of actors eligible to go first in the next round.
 * The last actor in a round may choose any other actor (not themselves).
 */
export const getNextRoundStarterOptions = (allActorIds, lastActorId) => {
    return allActorIds.filter((id) => id !== lastActorId);
};
