import {
  discardFromHand,
  drawTopDeckCard,
  getUserHand,
  hasCardInHand,
  isCardBlack,
  isJoker,
  returnCardsFromHandToDeck,
  returnJokerAfterCorruptionDraw
} from "./shared-deck.js";

export type NGHCardCode = string;
export type NGHCardSuit = "C" | "D" | "H" | "S" | "R" | "B";

export interface NGHParsedCard {
  code: NGHCardCode;
  rank: string;
  suit: NGHCardSuit;
  label: string;
  score: number;
}

export interface NGHJourneyCardResult {
  userId: string;
  source: "hand" | "top-deck";
  hidden: boolean;
  playedCards: string[];
  hand: string[];
  triggersCorruptionRisk: boolean;
}

export interface NGHCorruptionRiskResult {
  drewCard: string;
  isBlack: boolean;
  jokersSkipped: string[];
}

export interface NGHInitiativeCardResult {
  userId: string;
  source: "hand" | "top-deck";
  card: string | null;
  keptInHand: boolean;
  score: number | null;
  hand: string[];
  triggersCorruptionRisk: boolean;
}

export interface NGHBurnCardResult {
  userId: string;
  cards: string[];
  hand: string[];
  amount: number;
  reason: "plus-one" | "whisper" | "healing" | "advancement";
  triggersCorruptionRisk: boolean;
}

export interface NGHElementalRitualResult {
  source: "hand" | "top-deck";
  card: string;
  isBlack: boolean;
  triggersCorruptionRisk: boolean;
}

const t = (key: string, fallback: string): string => {
  const localized = game.i18n?.localize(key);
  return localized && localized !== key ? localized : fallback;
};

const tf = (key: string, data: Record<string, unknown>, fallback: string): string => {
  const localized = game.i18n?.format(key, data);
  return localized && localized !== key ? localized : fallback;
};

const SUIT_LABELS: Record<NGHCardSuit, string> = {
  C: "NGH.Card.Suit.Clubs",
  D: "NGH.Card.Suit.Diamonds",
  H: "NGH.Card.Suit.Hearts",
  S: "NGH.Card.Suit.Spades",
  R: "NGH.Card.Suit.RedJoker",
  B: "NGH.Card.Suit.BlackJoker"
};

const SUIT_SCORES: Record<NGHCardSuit, number> = {
  C: 0,
  D: 1,
  H: 2,
  S: 3,
  R: 4,
  B: 5
};

const RANK_SCORES: Record<string, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
  RJ: 15,
  BJ: 16
};

export const parseCard = (card: NGHCardCode): NGHParsedCard => {
  if (card === "RJ") {
    return {
      code: card,
      rank: "RJ",
      suit: "R",
      label: t(SUIT_LABELS.R, "Red Joker"),
      score: RANK_SCORES.RJ * 10 + SUIT_SCORES.R
    };
  }

  if (card === "BJ") {
    return {
      code: card,
      rank: "BJ",
      suit: "B",
      label: t(SUIT_LABELS.B, "Black Joker"),
      score: RANK_SCORES.BJ * 10 + SUIT_SCORES.B
    };
  }

  const suit = card.slice(-1) as NGHCardSuit;
  const rank = card.slice(0, -1);
  return {
    code: card,
    rank,
    suit,
    label: tf(
      "NGH.Card.Label.Of",
      { rank, suit: t(SUIT_LABELS[suit], SUIT_LABELS[suit]) },
      `${rank} of ${t(SUIT_LABELS[suit], SUIT_LABELS[suit])}`
    ),
    score: (RANK_SCORES[rank] ?? 0) * 10 + SUIT_SCORES[suit]
  };
};

const assertCardsInHand = (cards: string[], userId: string): void => {
  for (const card of cards) {
    if (!hasCardInHand(card, userId)) {
      throw new Error(tf("NGH.Error.CardNotInHand", { card }, `Card ${card} is not in the user's hand`));
    }
  }
};

const assertCardsInJourneyHand = (cards: string[], userId: string): void => {
  for (const card of cards) {
    if (!hasCardInHand(card, userId, "journey")) {
      throw new Error(tf("NGH.Error.CardNotInJourneyHand", { card }, `Card ${card} is not in the user's journey hand`));
    }
  }
};

export const drawForCorruptionRisk = async (): Promise<NGHCorruptionRiskResult> => {
  const jokersSkipped: string[] = [];

  for (let attempt = 0; attempt < 10; attempt++) {
    const result = await drawTopDeckCard(true);
    if (!result.drawn) break;

    if (isJoker(result.drawn)) {
      jokersSkipped.push(result.drawn);
      await returnJokerAfterCorruptionDraw(result.drawn);
      continue;
    }

    return {
      drewCard: result.drawn,
      isBlack: isCardBlack(result.drawn),
      jokersSkipped
    };
  }

  return { drewCard: "", isBlack: false, jokersSkipped };
};

export const burnForElementalRitual = async (
  userId: string = game.user?.id ?? "",
  card?: string
): Promise<NGHElementalRitualResult> => {
  if (!userId) throw new Error(t("NGH.Error.MissingBurnUserId", "Missing userId for card burn"));

  const hand = getUserHand(userId);
  if (hand.length > 0) {
    if (!card) {
      throw new Error(t("NGH.Error.RitualCardRequired", "Select a card from hand for Elemental Ritual."));
    }

    assertCardsInHand([card], userId);
    if (isJoker(card)) {
      await returnCardsFromHandToDeck([card], userId);
    } else {
      await discardFromHand([card], userId);
    }

    return {
      source: "hand",
      card,
      isBlack: isCardBlack(card),
      triggersCorruptionRisk: false
    };
  }

  // No cards in hand: draw from top deck and discard. Black card triggers corruption risk.
  const result = await drawTopDeckCard(true);
  const drew = result.drawn ?? "";
  if (drew && isJoker(drew)) {
    await returnJokerAfterCorruptionDraw(drew);
  }

  return {
    source: "top-deck",
    card: drew,
    isBlack: drew ? isCardBlack(drew) : false,
    triggersCorruptionRisk: drew ? isCardBlack(drew) : false
  };
};

export const useJourneyCard = async (
  userId: string = game.user?.id ?? "",
  card?: string
): Promise<NGHJourneyCardResult> => {
  if (!userId) throw new Error(t("NGH.Error.MissingJourneyUserId", "Missing userId for journey card use"));

  const hand = getUserHand(userId, "journey");
  if (hand.length > 0) {
    if (!card) throw new Error(t("NGH.Error.JourneyCardRequired", "A card from hand must be selected for journey use"));
    assertCardsInJourneyHand([card], userId);

    if (isJoker(card)) {
      const result = await returnCardsFromHandToDeck([card], userId, "journey");
      return {
        userId,
        source: "hand",
        hidden: false,
        playedCards: [card],
        hand: result.hand,
        triggersCorruptionRisk: card === "BJ"
      };
    }

    const result = await discardFromHand([card], userId, "journey");
    return {
      userId,
      source: "hand",
      hidden: false,
      playedCards: [card],
      hand: result.hand,
      triggersCorruptionRisk: false
    };
  }

  const topDeck = await drawTopDeckCard(true);
  const drawnCard = topDeck.drawn ?? null;
  if (drawnCard && isJoker(drawnCard)) {
    await returnJokerAfterCorruptionDraw(drawnCard);
  }
  return {
    userId,
    source: "top-deck",
    hidden: true,
    playedCards: drawnCard ? [drawnCard] : [],
    hand: [],
    triggersCorruptionRisk: drawnCard === "BJ"
  };
};

export const useInitiativeCard = async (
  userId: string = game.user?.id ?? "",
  card?: string
): Promise<NGHInitiativeCardResult> => {
  if (!userId) throw new Error(t("NGH.Error.MissingInitiativeUserId", "Missing userId for initiative card use"));

  const hand = getUserHand(userId);
  if (hand.length > 0) {
    if (!card) throw new Error(t("NGH.Error.InitiativeCardRequired", "A card from hand must be selected for initiative"));
    assertCardsInHand([card], userId);
    const parsed = parseCard(card);

    if (isJoker(card)) {
      const result = await returnCardsFromHandToDeck([card], userId);
      return {
        userId,
        source: "hand",
        card,
        keptInHand: false,
        score: parsed.score,
        hand: result.hand,
        triggersCorruptionRisk: card === "BJ"
      };
    }

    return {
      userId,
      source: "hand",
      card,
      keptInHand: true,
      score: parsed.score,
      hand,
      triggersCorruptionRisk: false
    };
  }

  const topDeck = await drawTopDeckCard(true);
  if (topDeck.drawn && isJoker(topDeck.drawn)) {
    await returnJokerAfterCorruptionDraw(topDeck.drawn);
  }
  const parsed = topDeck.drawn ? parseCard(topDeck.drawn) : null;
  return {
    userId,
    source: "top-deck",
    card: topDeck.drawn,
    keptInHand: false,
    score: parsed?.score ?? null,
    hand: [],
    triggersCorruptionRisk: topDeck.drawn === "BJ"
  };
};

const burnCards = async (
  cards: string[],
  reason: NGHBurnCardResult["reason"],
  userId: string = game.user?.id ?? ""
): Promise<NGHBurnCardResult> => {
  if (!userId) throw new Error(t("NGH.Error.MissingBurnUserId", "Missing userId for card burn"));
  if (cards.length < 1) throw new Error(t("NGH.Error.BurnCardRequired", "At least one card must be burned"));

  assertCardsInHand(cards, userId);

  // Jokers must be returned to deck (then reshuffled), not discarded.
  const jokerCards = cards.filter((card) => isJoker(card));
  const normalCards = cards.filter((card) => !isJoker(card));

  if (jokerCards.length > 0) {
    await returnCardsFromHandToDeck(jokerCards, userId);
  }
  if (normalCards.length > 0) {
    await discardFromHand(normalCards, userId);
  }

  const hand = getUserHand(userId);

  return {
    userId,
    cards: [...cards],
    hand,
    amount: cards.length,
    reason,
    triggersCorruptionRisk: cards.includes("BJ")
  };
};

export const burnCardForPlusOne = async (
  card: string,
  userId: string = game.user?.id ?? ""
): Promise<NGHBurnCardResult> => burnCards([card], "plus-one", userId);

export const burnCardForWhisper = async (
  card: string,
  userId: string = game.user?.id ?? ""
): Promise<NGHBurnCardResult> => burnCards([card], "whisper", userId);

export const burnCardsForHealing = async (
  cards: string[],
  userId: string = game.user?.id ?? ""
): Promise<NGHBurnCardResult> => burnCards(cards, "healing", userId);

export const getAdvancementCardCost = (newValue: number): number => {
  return Math.max(0, Math.floor(newValue) + 1);
};

export type NGHAdvancementType = "attribute" | "skill-die" | "new-skill";

export interface NGHAdvancementCostResult {
  baseCost: number;
  finalCost: number;
  cardsNeeded: number;
  sameColorDiscount: boolean;
  facesAcesBonus: boolean;
  effectBonus: number;
  validationErrors: string[];
}

const getCardColorGroup = (card: string): "red" | "black" => {
  if (card === "RJ") return "red";
  if (card === "BJ") return "black";
  const suit = card.slice(-1);
  return suit === "H" || suit === "D" ? "red" : "black";
};

const isCardFaceOrAce = (card: string): boolean => {
  if (isJoker(card)) return false;
  const rank = card.slice(0, -1);
  return ["J", "Q", "K", "A"].includes(rank);
};

export const computeAdvancementCost = (
  type: NGHAdvancementType,
  cards: string[],
  currentRank: number,
  newSkillsAlreadyBought = 0
): NGHAdvancementCostResult => {
  const errors: string[] = [];

  const baseCost =
    type === "new-skill"
      ? 1 + (newSkillsAlreadyBought + 1)
      : (currentRank + 1) + 1;

  if (type === "attribute") {
    const allRed = cards.every((card) => getCardColorGroup(card) === "red");
    if (!allRed) errors.push("NGH.Advancement.Error.AttributeRedOnly");
  }

  const colors = cards.map(getCardColorGroup);
  const sameColorDiscount = colors.length >= baseCost && colors.slice(0, baseCost).every((c) => c === colors[0]);
  const facesAcesBonus = cards.length >= baseCost && cards.slice(0, baseCost).every((c) => isCardFaceOrAce(c));

  const finalCost = Math.max(1, baseCost - (sameColorDiscount ? 1 : 0));

  return {
    baseCost,
    finalCost,
    cardsNeeded: baseCost,
    sameColorDiscount,
    facesAcesBonus,
    effectBonus: facesAcesBonus ? 1 : 0,
    validationErrors: errors
  };
};

export interface NGHAdvancementSpendResult {
  cards: string[];
  hand: string[];
  amount: number;
  effectBonus: number;
  sameColorDiscount: boolean;
  keptCard: string | null;
}

export const spendCardsForAdvancement = async (
  cards: string[],
  type: NGHAdvancementType,
  currentRank: number,
  newSkillsAlreadyBought = 0,
  userId: string = game.user?.id ?? ""
): Promise<NGHAdvancementSpendResult> => {
  if (!userId) throw new Error(t("NGH.Error.MissingBurnUserId", "Missing userId for card burn"));

  const cost = computeAdvancementCost(type, cards, currentRank, newSkillsAlreadyBought);
  for (const err of cost.validationErrors) {
    throw new Error(t(err, err));
  }
  if (cards.length < cost.cardsNeeded) {
    throw new Error(tf("NGH.Error.AdvancementCardsRequired", { required: cost.cardsNeeded }, `Advancement requires ${cost.cardsNeeded} cards`));
  }

  assertCardsInHand(cards.slice(0, cost.cardsNeeded), userId);

  const toSpend = cards.slice(0, cost.finalCost);
  const keptCard = cost.sameColorDiscount ? cards[cost.cardsNeeded - 1] : null;

  const result = await discardFromHand(toSpend, userId);

  return {
    cards: toSpend,
    hand: result.hand,
    amount: toSpend.length,
    effectBonus: cost.effectBonus,
    sameColorDiscount: cost.sameColorDiscount,
    keptCard
  };
};
