const SYSTEM_ID = "nghrpg";
const MAX_HAND_SIZE = 7;
const RED_JOKER = "RJ";
const BLACK_JOKER = "BJ";

const SUITS = ["C", "D", "H", "S"] as const;
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;
const JOKERS = [RED_JOKER, BLACK_JOKER] as const;

const STACK_ROLE_FLAG = "stackRole";
const HAND_USER_FLAG = "handUserId";
const HAND_KIND_FLAG = "handKind";

type NGHStackRole = "deck" | "discard" | "hand";
export type NGHHandKind = "standard" | "journey";

const t = (key: string, fallback: string): string => {
  const localized = game.i18n?.localize(key);
  return localized && localized !== key ? localized : fallback;
};

const tf = (key: string, data: Record<string, unknown>, fallback: string): string => {
  const localized = game.i18n?.format(key, data);
  return localized && localized !== key ? localized : fallback;
};

const getStackNames = () => ({
  deck: t("NGH.Deck.Name.Shared", "NGH Shared Deck"),
  discard: t("NGH.Deck.Name.Discard", "NGH Discard Pile")
});

const getHandKindSuffix = (handKind: NGHHandKind): string => {
  return handKind === "journey"
    ? t("NGH.Deck.Name.JourneyHandSuffix", "Journey")
    : t("NGH.Deck.Name.StandardHandSuffix", "Standard");
};

export interface NGHDeckState {
  drawPile: string[];
  discardPile: string[];
  hands: Record<string, string[]>;
  journeyHands: Record<string, string[]>;
  updatedAt: number;
}

export interface NGHDrawResult {
  userId: string;
  handKind: NGHHandKind;
  drawn: string[];
  hand: string[];
  drawPileCount: number;
  discardPileCount: number;
  remainingSlots: number;
}

export interface NGHDiscardResult {
  userId: string;
  handKind: NGHHandKind;
  discarded: string[];
  hand: string[];
  drawPileCount: number;
  discardPileCount: number;
}

export interface NGHTopDeckDrawResult {
  drawn: string | null;
  drawPileCount: number;
  discardPileCount: number;
}

export interface NGHTopDeckDrawManyResult {
  drawn: string[];
  drawPileCount: number;
  discardPileCount: number;
}

export interface NGHReturnToDeckResult {
  userId: string;
  handKind: NGHHandKind;
  returned: string[];
  hand: string[];
  drawPileCount: number;
  discardPileCount: number;
}

export interface NGHTransferBetweenHandsResult {
  fromUserId: string;
  toUserId: string;
  handKind: NGHHandKind;
  transferred: string[];
  fromHand: string[];
  toHand: string[];
  drawPileCount: number;
  discardPileCount: number;
}

const buildCanonicalDeck = (copies = 1): string[] => {
  const baseDeck: string[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      baseDeck.push(`${rank}${suit}`);
    }
  }

  const normalizedCopies = Math.max(1, Math.floor(copies));
  const deck: string[] = [];
  for (let index = 0; index < normalizedCopies; index += 1) {
    deck.push(...baseDeck, ...JOKERS);
  }
  return deck;
};

const getRequiredDeckCopies = (): number => {
  const nonGMPlayers = getUsers().filter((user) => user?.id && !user.isGM).length;
  return nonGMPlayers >= 6 ? 2 : 1;
};

const getCanonicalDeck = (): string[] => buildCanonicalDeck(getRequiredDeckCopies());

export const isJoker = (card: string): boolean => card === RED_JOKER || card === BLACK_JOKER;

export const isCardBlack = (card: string): boolean => {
  if (card === BLACK_JOKER) return true;
  if (card === RED_JOKER) return false;
  const suit = card.slice(-1);
  return suit === "S" || suit === "C";
};

export const returnJokerAfterCorruptionDraw = async (jokerCode: string): Promise<void> => {
  const { deck, discard } = getOrFailStacks();
  const jokerCards = findCardsByCode(discard, [jokerCode]);
  if (jokerCards.length > 0) {
    await jokerCards[0].recall({ chatNotification: false });
  }
  await deck.shuffle({ chatNotification: false });
};

const RANK_VALUES: Record<string, number> = {
  A: 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
  "8": 8, "9": 9, "10": 10, J: 11, Q: 12, K: 13
};

const SUIT_NAMES: Record<string, string> = { C: "clubs", D: "diamonds", H: "hearts", S: "spades" };

const parseCardCode = (code: string): { suit: string; value: number } => {
  if (isJoker(code)) return { suit: "joker", value: 0 };
  const rank = code.slice(0, -1);
  const suit = code.slice(-1);
  return { suit: SUIT_NAMES[suit] ?? suit, value: RANK_VALUES[rank] ?? 0 };
};

const getCardsCollection = (): any[] => {
  const collection = (game as any)?.cards;
  if (!collection) throw new Error(t("NGH.Error.FoundryCardsUnavailable", "Foundry Cards collection is not available"));
  if (Array.isArray(collection.contents)) return [...collection.contents];
  return Array.from(collection);
};

const getUsers = (): any[] => {
  const users = (game as any)?.users;
  if (!users) return [];
  if (Array.isArray(users.contents)) return [...users.contents];
  return Array.from(users);
};

const getFlag = (document: any, key: string): unknown => {
  return document?.getFlag?.(SYSTEM_ID, key) ?? document?.flags?.[SYSTEM_ID]?.[key];
};

const getEmbeddedCards = (stack: any): any[] => {
  const cards = stack?.cards;
  if (!cards) return [];
  if (Array.isArray(cards.contents)) return [...cards.contents];
  return Array.from(cards);
};

const getAvailableCards = (stack: any): any[] => {
  const available = stack?.availableCards;
  if (Array.isArray(available)) return [...available];
  if (Array.isArray(available?.contents)) return [...available.contents];
  return getEmbeddedCards(stack).filter((card) => !card?.drawn);
};

const getCardCode = (card: any): string => {
  const code = card?.name ?? "";
  return String(code);
};

const getOwnershipLevel = (key: "OWNER" | "NONE"): number => {
  return (CONST as any)?.DOCUMENT_OWNERSHIP_LEVELS?.[key] ?? (key === "OWNER" ? 3 : 0);
};

const getTopDrawMode = (): number => {
  const modes = (CONST as any)?.CARD_DRAW_MODES;
  return modes?.TOP ?? modes?.FIRST ?? 0;
};

const findStack = (predicate: (stack: any) => boolean): any | null => {
  return getCardsCollection().find(predicate) ?? null;
};

const findStackByRole = (role: NGHStackRole): any | null => {
  return findStack((stack) => getFlag(stack, STACK_ROLE_FLAG) === role);
};

const getHandName = (userId: string, handKind: NGHHandKind = "standard"): string => {
  const user = getUsers().find((candidate) => candidate.id === userId);
  return tf(
    "NGH.Deck.Name.Hand",
    { user: user?.name ?? userId, kind: getHandKindSuffix(handKind) },
    `NGH Hand - ${user?.name ?? userId} (${getHandKindSuffix(handKind)})`
  );
};

const getNormalizedHandKind = (value: unknown): NGHHandKind => {
  return value === "journey" ? "journey" : "standard";
};

const findUserHand = (userId: string, handKind: NGHHandKind = "standard"): any | null => {
  return (
    findStack(
      (stack) =>
        getFlag(stack, STACK_ROLE_FLAG) === "hand" &&
        getFlag(stack, HAND_USER_FLAG) === userId &&
        getNormalizedHandKind(getFlag(stack, HAND_KIND_FLAG)) === handKind
    ) ?? null
  );
};

const ensureGM = (): void => {
  if (!game.user?.isGM) {
    throw new Error(t("NGH.Error.GMOnlyDeckManagement", "Only the GM can manage the shared Foundry card stacks"));
  }
};

const ensureUserCanManageHand = (userId: string): void => {
  const activeUser = game.user;
  if (!activeUser) throw new Error(t("NGH.Error.MissingActiveUser", "No active user"));
  if (activeUser.isGM) return;
  if (activeUser.id === userId) return;
  throw new Error(t("NGH.Error.ManageOwnHandOnly", "You can only manage your own hand"));
};

const createStack = async (
  role: NGHStackRole,
  type: "deck" | "pile" | "hand",
  name: string,
  userId?: string,
  handKind: NGHHandKind = "standard"
): Promise<any> => {
  const ownership: Record<string, number> = { default: getOwnershipLevel("NONE") };
  if (userId) ownership[userId] = getOwnershipLevel("OWNER");

  const payload = {
    name,
    type,
    ownership,
    flags: {
      [SYSTEM_ID]: {
        [STACK_ROLE_FLAG]: role,
        ...(userId ? { [HAND_USER_FLAG]: userId, [HAND_KIND_FLAG]: handKind } : {})
      }
    }
  };

  return await (Cards as any).create(payload);
};

const createCardData = (code: string, index: number) => {
  const { suit, value } = parseCardCode(code);
  return {
    name: code,
    sort: index,
    drawn: false,
    faces: [
      {
        name: code,
        text: code,
        img: "icons/svg/card-joker.svg",
        suit,
        value
      }
    ],
    back: {
      name: "Back",
      text: "Back",
      img: "icons/svg/card-joker.svg"
    }
  };
};

const deleteAllEmbeddedCards = async (stack: any): Promise<void> => {
  const ids = getEmbeddedCards(stack).map((card) => card.id).filter(Boolean);
  if (ids.length < 1) return;
  await stack.deleteEmbeddedDocuments("Card", ids);
};

const rebuildDeck = async (deck: any): Promise<void> => {
  const discard = findStackByRole("discard");
  const hands = getCardsCollection().filter((stack) => getFlag(stack, STACK_ROLE_FLAG) === "hand");
  const canonicalDeck = getCanonicalDeck();

  if (discard) await deleteAllEmbeddedCards(discard);
  for (const hand of hands) {
    await deleteAllEmbeddedCards(hand);
  }

  await deleteAllEmbeddedCards(deck);
  await deck.createEmbeddedDocuments("Card", canonicalDeck.map((code, index) => createCardData(code, index)));
  await deck.shuffle({ chatNotification: false });
};

const ensureCanonicalDeck = async (deck: any): Promise<void> => {
  const deckCodes = getEmbeddedCards(deck).map(getCardCode).sort();
  const canonical = [...getCanonicalDeck()].sort();
  const isValid = deckCodes.length === canonical.length && deckCodes.every((code, index) => code === canonical[index]);
  if (isValid) return;
  await rebuildDeck(deck);
};

const ensureCoreStacks = async (): Promise<{ deck: any; discard: any }> => {
  const stackNames = getStackNames();
  let deck = findStackByRole("deck");
  let discard = findStackByRole("discard");

  if (!deck) {
    ensureGM();
    deck = await createStack("deck", "deck", stackNames.deck);
  }

  if (!discard) {
    ensureGM();
    discard = await createStack("discard", "pile", stackNames.discard);
  }

  return { deck, discard };
};

const ensureUserHand = async (userId: string, handKind: NGHHandKind = "standard"): Promise<any> => {
  const existing = findUserHand(userId, handKind);
  if (existing) return existing;

  ensureGM();
  return await createStack("hand", "hand", getHandName(userId, handKind), userId, handKind);
};

const ensureDeckInfrastructure = async (): Promise<{ deck: any; discard: any }> => {
  const stacks = await ensureCoreStacks();

  if (game.user?.isGM) {
    await ensureCanonicalDeck(stacks.deck);
    for (const user of getUsers()) {
      if (!user?.id) continue;
      await ensureUserHand(user.id, "standard");
      await ensureUserHand(user.id, "journey");
    }
  }

  return stacks;
};

const getOrFailStacks = (): { deck: any; discard: any } => {
  const deck = findStackByRole("deck");
  const discard = findStackByRole("discard");
  if (!deck || !discard) {
    throw new Error(t("NGH.Error.DeckNotInitialized", "NGH card stacks are not initialized yet. Let the GM finish loading the world first."));
  }

  return { deck, discard };
};

const recallDiscardIntoDeckIfNeeded = async (deck: any, discard: any): Promise<void> => {
  if (getAvailableCards(deck).length > 0) return;
  if (getEmbeddedCards(discard).length < 1) return;

  await discard.recall({ chatNotification: false });
  await deck.shuffle({ chatNotification: false });
};

const findCardsByCode = (stack: any, cards: string[]): any[] => {
  const embeddedCards = getEmbeddedCards(stack);
  const remaining = [...cards];
  const resolved: any[] = [];

  for (const card of embeddedCards) {
    const code = getCardCode(card);
    const index = remaining.indexOf(code);
    if (index < 0) continue;
    resolved.push(card);
    remaining.splice(index, 1);
  }

  return resolved;
};

const getHandsSnapshot = (handKind: NGHHandKind = "standard"): Record<string, string[]> => {
  const hands = getCardsCollection().filter((stack) => getFlag(stack, STACK_ROLE_FLAG) === "hand");
  return Object.fromEntries(
    hands
      .filter((hand) => getNormalizedHandKind(getFlag(hand, HAND_KIND_FLAG)) === handKind)
      .map((hand) => [String(getFlag(hand, HAND_USER_FLAG) ?? hand.id), getEmbeddedCards(hand).map(getCardCode)])
  );
};

const duplicateState = (state: NGHDeckState): NGHDeckState => ({
  drawPile: [...state.drawPile],
  discardPile: [...state.discardPile],
  hands: Object.fromEntries(Object.entries(state.hands).map(([userId, cards]) => [userId, [...cards]])),
  journeyHands: Object.fromEntries(Object.entries(state.journeyHands).map(([userId, cards]) => [userId, [...cards]])),
  updatedAt: state.updatedAt
});

export const registerSharedDeckSettings = (): void => {
  // Foundry native Cards documents are used instead of world settings.
};

export const initializeSharedDeck = async (): Promise<NGHDeckState> => {
  await ensureDeckInfrastructure();
  return getSharedDeckState();
};

export const getSharedDeckState = (): NGHDeckState => {
  const { deck, discard } = getOrFailStacks();
  return duplicateState({
    drawPile: getAvailableCards(deck).map(getCardCode),
    discardPile: getEmbeddedCards(discard).map(getCardCode),
    hands: getHandsSnapshot("standard"),
    journeyHands: getHandsSnapshot("journey"),
    updatedAt: Date.now()
  });
};

export const getUserHand = (userId: string = game.user?.id ?? "", handKind: NGHHandKind = "standard"): string[] => {
  if (!userId) return [];
  const hand = findUserHand(userId, handKind);
  if (!hand) return [];
  return getEmbeddedCards(hand).map(getCardCode);
};

export const getJourneyHand = (userId: string = game.user?.id ?? ""): string[] => {
  return getUserHand(userId, "journey");
};

export const hasCardInHand = (
  card: string,
  userId: string = game.user?.id ?? "",
  handKind: NGHHandKind = "standard"
): boolean => {
  return getUserHand(userId, handKind).includes(card);
};

export const drawFromSharedDeck = async (
  userId: string = game.user?.id ?? "",
  requestedCount = 1,
  handKind: NGHHandKind = "standard"
): Promise<NGHDrawResult> => {
  if (!userId) throw new Error(t("NGH.Error.MissingDrawUserId", "Missing userId for draw operation"));
  ensureUserCanManageHand(userId);

  const { deck, discard } = await ensureDeckInfrastructure();
  const hand = findUserHand(userId, handKind) ?? await ensureUserHand(userId, handKind);

  const currentHand = getEmbeddedCards(hand).map(getCardCode);
  const freeSlots = Math.max(0, MAX_HAND_SIZE - currentHand.length);
  const drawCount = Math.max(0, Math.min(Math.floor(requestedCount), freeSlots));

  if (drawCount > 0) {
    await recallDiscardIntoDeckIfNeeded(deck, discard);
    if (getAvailableCards(deck).length > 0) {
      await hand.draw(deck, drawCount, { how: getTopDrawMode(), updateData: { face: 0 } });
    }
  }

  const state = getSharedDeckState();
  const snapshot = handKind === "journey" ? state.journeyHands : state.hands;
  return {
    userId,
    handKind,
    drawn: (snapshot[userId] ?? []).slice(currentHand.length),
    hand: [...(snapshot[userId] ?? [])],
    drawPileCount: state.drawPile.length,
    discardPileCount: state.discardPile.length,
    remainingSlots: Math.max(0, MAX_HAND_SIZE - (snapshot[userId]?.length ?? 0))
  };
};

export const drawJourneyHand = async (
  userId: string = game.user?.id ?? "",
  requestedCount = 1
): Promise<NGHDrawResult> => {
  return drawFromSharedDeck(userId, requestedCount, "journey");
};

export const discardFromHand = async (
  cards: string[],
  userId: string = game.user?.id ?? "",
  handKind: NGHHandKind = "standard"
): Promise<NGHDiscardResult> => {
  if (!userId) throw new Error(t("NGH.Error.MissingDiscardUserId", "Missing userId for discard operation"));
  ensureUserCanManageHand(userId);

  const { discard } = await ensureDeckInfrastructure();
  const hand = findUserHand(userId, handKind);
  if (!hand) throw new Error(t("NGH.Error.UserHandMissing", "User hand does not exist"));

  const cardDocuments = findCardsByCode(hand, cards.filter((card): card is string => typeof card === "string"));
  if (cardDocuments.length > 0) {
    await hand.pass(discard, cardDocuments.map((card) => card.id), { chatNotification: false });
  }

  const state = getSharedDeckState();
  const snapshot = handKind === "journey" ? state.journeyHands : state.hands;
  return {
    userId,
    handKind,
    discarded: cardDocuments.map(getCardCode),
    hand: [...(snapshot[userId] ?? [])],
    drawPileCount: state.drawPile.length,
    discardPileCount: state.discardPile.length
  };
};

export const drawTopDeckCards = async (requestedCount = 1, discard = true): Promise<NGHTopDeckDrawManyResult> => {
  const { deck, discard: discardStack } = await ensureDeckInfrastructure();
  const drawn: string[] = [];
  const total = Math.max(0, Math.floor(requestedCount));

  for (let idx = 0; idx < total; idx += 1) {
    await recallDiscardIntoDeckIfNeeded(deck, discardStack);
    if (getAvailableCards(deck).length < 1) break;

    const targetStack = discard ? discardStack : deck;
    const drawnCards = await targetStack.draw(deck, 1, { how: getTopDrawMode(), updateData: { face: 0 } });
    if (drawnCards[0]) drawn.push(getCardCode(drawnCards[0]));
  }

  const state = getSharedDeckState();
  return {
    drawn,
    drawPileCount: state.drawPile.length,
    discardPileCount: state.discardPile.length
  };
};

export const drawTopDeckCard = async (discard = true): Promise<NGHTopDeckDrawResult> => {
  const result = await drawTopDeckCards(1, discard);
  return {
    drawn: result.drawn[0] ?? null,
    drawPileCount: result.drawPileCount,
    discardPileCount: result.discardPileCount
  };
};

export const returnCardsFromHandToDeck = async (
  cards: string[],
  userId: string = game.user?.id ?? "",
  handKind: NGHHandKind = "standard"
): Promise<NGHReturnToDeckResult> => {
  if (!userId) throw new Error(t("NGH.Error.MissingReturnUserId", "Missing userId for return-to-deck operation"));
  ensureUserCanManageHand(userId);

  const { deck } = await ensureDeckInfrastructure();
  const hand = findUserHand(userId, handKind);
  if (!hand) throw new Error(t("NGH.Error.UserHandMissing", "User hand does not exist"));

  const cardDocuments = findCardsByCode(hand, cards.filter((card): card is string => typeof card === "string"));
  for (const card of cardDocuments) {
    await card.recall({ chatNotification: false });
  }

  if (cardDocuments.length > 0) {
    await deck.shuffle({ chatNotification: false });
  }

  const state = getSharedDeckState();
  const snapshot = handKind === "journey" ? state.journeyHands : state.hands;
  return {
    userId,
    handKind,
    returned: cardDocuments.map(getCardCode),
    hand: [...(snapshot[userId] ?? [])],
    drawPileCount: state.drawPile.length,
    discardPileCount: state.discardPile.length
  };
};

export const returnJourneyCardsToDeck = async (
  cards: string[],
  userId: string = game.user?.id ?? ""
): Promise<NGHReturnToDeckResult> => {
  return returnCardsFromHandToDeck(cards, userId, "journey");
};

export const transferCardsBetweenHands = async (
  cards: string[],
  fromUserId: string,
  toUserId: string,
  handKind: NGHHandKind = "standard"
): Promise<NGHTransferBetweenHandsResult> => {
  if (!fromUserId || !toUserId) {
    throw new Error(t("NGH.Error.MissingTransferUserId", "Missing userId for card transfer"));
  }

  ensureUserCanManageHand(fromUserId);

  await ensureDeckInfrastructure();
  const fromHand = findUserHand(fromUserId, handKind);
  if (!fromHand) throw new Error(t("NGH.Error.UserHandMissing", "User hand does not exist"));

  const toHand = findUserHand(toUserId, handKind) ?? await ensureUserHand(toUserId, handKind);
  const targetCurrent = getEmbeddedCards(toHand).map(getCardCode);
  const freeSlots = Math.max(0, MAX_HAND_SIZE - targetCurrent.length);
  const requestedCards = cards.filter((card): card is string => typeof card === "string" && card.length > 0);
  const transferableCodes = requestedCards.slice(0, freeSlots);
  const cardDocuments = findCardsByCode(fromHand, transferableCodes);

  if (cardDocuments.length > 0) {
    await fromHand.pass(toHand, cardDocuments.map((card) => card.id), { chatNotification: false });
  }

  const state = getSharedDeckState();
  const snapshot = handKind === "journey" ? state.journeyHands : state.hands;
  return {
    fromUserId,
    toUserId,
    handKind,
    transferred: cardDocuments.map(getCardCode),
    fromHand: [...(snapshot[fromUserId] ?? [])],
    toHand: [...(snapshot[toUserId] ?? [])],
    drawPileCount: state.drawPile.length,
    discardPileCount: state.discardPile.length
  };
};

export const resetSharedDeck = async (): Promise<NGHDeckState> => {
  ensureGM();
  const { deck } = await ensureDeckInfrastructure();
  await deck.recall({ chatNotification: false });
  await ensureCanonicalDeck(deck);
  await deck.shuffle({ chatNotification: false });
  return getSharedDeckState();
};

export const reshuffleDiscardsIntoDrawPile = async (): Promise<NGHDeckState> => {
  ensureGM();
  const { deck, discard } = await ensureDeckInfrastructure();
  if (getEmbeddedCards(discard).length > 0) {
    await discard.recall({ chatNotification: false });
  }
  await deck.shuffle({ chatNotification: false });
  return getSharedDeckState();
};

export const getMaxHandSize = (): number => MAX_HAND_SIZE;

export const getMaxJourneyHandSize = (): number => MAX_HAND_SIZE;

/**
 * Takes a list of card codes already in the discard pile, shuffles them,
 * and deals one card per userId into each user's journey hand.
 * Any surplus cards (more cards than users) go to the GM's journey hand.
 * Returns a mapping userId → card dealt.
 */
export const shuffleAndDealJourneyCards = async (
  cardCodes: string[],
  userIds: string[]
): Promise<Record<string, string>> => {
  ensureGM();
  if (cardCodes.length === 0) return {};

  const { discard } = getOrFailStacks();

  // Fisher-Yates shuffle on a copy
  const shuffled = [...cardCodes];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const dealt: Record<string, string> = {};

  for (let i = 0; i < shuffled.length; i++) {
    const cardCode = shuffled[i];
    const targetUserId = i < userIds.length ? userIds[i] : (game.user?.id ?? "");

    const hand = findUserHand(targetUserId, "journey") ?? await ensureUserHand(targetUserId, "journey");
    const cardDocuments = findCardsByCode(discard, [cardCode]);
    if (cardDocuments.length > 0) {
      await discard.pass(hand, [cardDocuments[0].id], { chatNotification: false });
      dealt[targetUserId] = cardCode;
    }
  }

  return dealt;
};

