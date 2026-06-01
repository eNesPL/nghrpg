import { burnCardsForHealing } from "./card-usage.js";

export type NGHTrackedAttributeKey = "krzepa" | "spryt" | "hart";

export interface NGHAttributeTrack {
  value: number;
  max: number;
}

export interface NGHAttributeUpdateResult {
  attribute: NGHTrackedAttributeKey;
  previous: number;
  current: number;
  max: number;
  changedBy: number;
  isDead: boolean;
}

export interface NGHDamageApplicationResult extends NGHAttributeUpdateResult {
  incomingDamage: number;
  appliedDamage: number;
  preventedDamage: number;
  burnedCards?: string[];
  triggersCorruptionRisk?: boolean;
}

const clampInt = (value: number, min = 0): number => {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.floor(value));
};

const getActorSystem = (actor: any) => {
  const system = actor?.system;
  if (!system) throw new Error("Actor system data is not available");
  return system as {
    attributes?: Record<NGHTrackedAttributeKey, NGHAttributeTrack>;
    armor?: number;
  };
};

const getAttributeTrack = (actor: any, attribute: NGHTrackedAttributeKey): NGHAttributeTrack => {
  const system = getActorSystem(actor);
  const track = system.attributes?.[attribute];
  if (!track) throw new Error(`Missing attribute track: ${attribute}`);
  return track;
};

export const isActorDead = (actor: any): boolean => {
  const system = getActorSystem(actor);
  return (["krzepa", "spryt", "hart"] as NGHTrackedAttributeKey[]).some((attribute) => {
    const track = system.attributes?.[attribute];
    return !track || track.value <= 0;
  });
};

export const getActorDefenseValue = (
  actor: any,
  attribute: NGHTrackedAttributeKey,
  options?: { physical?: boolean }
): number => {
  const track = getAttributeTrack(actor, attribute);
  const physical = options?.physical ?? attribute === "krzepa";
  const armor = clampInt(getActorSystem(actor).armor ?? 0, 0);

  if (attribute === "krzepa" && physical) {
    return Math.max(track.value, armor);
  }

  return track.value;
};

export const applyAttributeDamage = async (
  actor: any,
  attribute: NGHTrackedAttributeKey,
  damage: number
): Promise<NGHDamageApplicationResult> => {
  const track = getAttributeTrack(actor, attribute);
  const previous = clampInt(track.value, 0);
  const max = Math.max(1, clampInt(track.max, 1));
  const incomingDamage = clampInt(damage, 0);
  const appliedDamage = Math.min(previous, incomingDamage);
  const current = Math.max(0, previous - appliedDamage);

  await actor.update({ [`system.attributes.${attribute}.value`]: current });

  return {
    attribute,
    incomingDamage,
    appliedDamage,
    preventedDamage: 0,
    previous,
    current,
    max,
    changedBy: -appliedDamage,
    isDead: (["krzepa", "spryt", "hart"] as NGHTrackedAttributeKey[]).some((key) => {
      if (key === attribute) return current <= 0;
      return getAttributeTrack(actor, key).value <= 0;
    })
  };
};

export const healAttributeDamage = async (
  actor: any,
  attribute: NGHTrackedAttributeKey,
  healing: number
): Promise<NGHAttributeUpdateResult> => {
  const track = getAttributeTrack(actor, attribute);
  const previous = clampInt(track.value, 0);
  const max = Math.max(1, clampInt(track.max, 1));
  const requestedHealing = clampInt(healing, 0);
  const current = Math.min(max, previous + requestedHealing);
  const changedBy = current - previous;

  await actor.update({ [`system.attributes.${attribute}.value`]: current });

  return {
    attribute,
    previous,
    current,
    max,
    changedBy,
    isDead: false
  };
};

export const preventDamageWithCards = async (
  actor: any,
  attribute: NGHTrackedAttributeKey,
  incomingDamage: number,
  cards: string[],
  userId: string = game.user?.id ?? ""
): Promise<NGHDamageApplicationResult> => {
  const damage = clampInt(incomingDamage, 0);
  const usableCards = cards.slice(0, damage);
  const preventedDamage = usableCards.length;
  let triggersCorruptionRisk = false;

  if (usableCards.length > 0) {
    const burnResult = await burnCardsForHealing(usableCards, userId);
    triggersCorruptionRisk = burnResult.triggersCorruptionRisk;
  }

  const remainingDamage = Math.max(0, damage - preventedDamage);
  const result = await applyAttributeDamage(actor, attribute, remainingDamage);

  return {
    ...result,
    incomingDamage: damage,
    preventedDamage,
    appliedDamage: remainingDamage,
    changedBy: -remainingDamage,
    burnedCards: usableCards,
    triggersCorruptionRisk
  };
};
