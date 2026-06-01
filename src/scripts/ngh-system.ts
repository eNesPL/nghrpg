import { NGHActorDataModels, NGHItemDataModels } from "./module/data-models.js";
import { NGHActor, NGHItem } from "./module/documents.js";
import {
  applyAttributeDamage,
  getActorDefenseValue,
  healAttributeDamage,
  isActorDead,
  preventDamageWithCards
} from "./module/mechanics/attribute-tracks.js";
import {
  computeAttackPT,
  getNextRoundStarterOptions,
  getWeaponProfile,
  NGH_WEAPON_PROFILES,
  resolveTieBreaker,
  resolveInitiativeOrder,
  resolveWeaponAttack
} from "./module/mechanics/combat.js";
import { executeSkillTest, getSkillAttribute, rollChallenge } from "./module/mechanics/skill-tests.js";
import {
  burnCardForPlusOne,
  burnCardForWhisper,
  burnCardsForHealing,
  burnForElementalRitual,
  drawForCorruptionRisk,
  getAdvancementCardCost,
  parseCard,
  spendCardsForAdvancement,
  useInitiativeCard,
  useJourneyCard
} from "./module/mechanics/card-usage.js";
import {
  discardFromHand,
  drawFromSharedDeck,
  drawJourneyHand,
  drawTopDeckCard,
  drawTopDeckCards,
  getJourneyHand,
  getMaxHandSize,
  getMaxJourneyHandSize,
  getSharedDeckState,
  getUserHand,
  hasCardInHand,
  initializeSharedDeck,
  isJoker,
  registerSharedDeckSettings,
  resetSharedDeck,
  reshuffleDiscardsIntoDrawPile,
  returnDiscardedJokersToDeck,
  returnCardsFromHandToDeck,
  returnJourneyCardsToDeck,
  shuffleAndDealJourneyCards
} from "./module/mechanics/shared-deck.js";
import { NGHJourneyPanel, openJourneyPanel, registerJourneyPanelSettings, handleJourneySocketMessage } from "./apps/journey-panel.js";
import { openCombatPanel, registerCombatPanelSettings } from "./apps/combat-panel.js";
import { openGMToolsPanel } from "./apps/gm-tools-panel.js";
import { NGHActorSheet } from "./sheets/actor-sheet.js";
import { NGHNPCSheet } from "./sheets/npc-sheet.js";

const NGH_SYSTEM_ID = "nghrpg";

type NGHGameApi = {
  mechanics: {
    executeSkillTest: typeof executeSkillTest;
    rollChallenge: typeof rollChallenge;
    getSkillAttribute: typeof getSkillAttribute;
    attributes: {
      getDefenseValue: typeof getActorDefenseValue;
      applyDamage: typeof applyAttributeDamage;
      healDamage: typeof healAttributeDamage;
      preventDamageWithCards: typeof preventDamageWithCards;
      isDead: typeof isActorDead;
    };
    combat: {
      weapons: typeof NGH_WEAPON_PROFILES;
      getWeaponProfile: typeof getWeaponProfile;
      resolveWeaponAttack: typeof resolveWeaponAttack;
      resolveInitiativeOrder: typeof resolveInitiativeOrder;
      computeAttackPT: typeof computeAttackPT;
      resolveTieBreaker: typeof resolveTieBreaker;
      getNextRoundStarterOptions: typeof getNextRoundStarterOptions;
    };
    cards: {
      getState: typeof getSharedDeckState;
      getHand: typeof getUserHand;
      getJourneyHand: typeof getJourneyHand;
      hasInHand: typeof hasCardInHand;
      isJoker: typeof isJoker;
      draw: typeof drawFromSharedDeck;
      drawJourney: typeof drawJourneyHand;
      drawTop: typeof drawTopDeckCard;
      drawTopCards: typeof drawTopDeckCards;
      discard: typeof discardFromHand;
      discardJourney: (cards: string[], userId?: string) => Promise<any>;
      returnToDeck: typeof returnCardsFromHandToDeck;
      returnJourneyToDeck: typeof returnJourneyCardsToDeck;
      returnDiscardedJokersToDeck: typeof returnDiscardedJokersToDeck;
      reset: typeof resetSharedDeck;
      reshuffle: typeof reshuffleDiscardsIntoDrawPile;
      maxHandSize: typeof getMaxHandSize;
      maxJourneyHandSize: typeof getMaxJourneyHandSize;
      parse: typeof parseCard;
      useJourney: typeof useJourneyCard;
      useInitiative: typeof useInitiativeCard;
      burnForPlusOne: typeof burnCardForPlusOne;
      burnForWhisper: typeof burnCardForWhisper;
      burnForHealing: typeof burnCardsForHealing;
      advancementCost: typeof getAdvancementCardCost;
      spendForAdvancement: typeof spendCardsForAdvancement;
      drawForCorruptionRisk: typeof drawForCorruptionRisk;
      burnForElementalRitual: typeof burnForElementalRitual;
      shuffleAndDealJourneyCards: typeof shuffleAndDealJourneyCards;
    };
  };
};

const getRenderableRoot = (html: unknown): HTMLElement | null => {
  if (html instanceof HTMLElement) return html;
  if ((html as any)?.[0] instanceof HTMLElement) return (html as any)[0];
  return null;
};

const injectGMPanelButtons = (root: HTMLElement): void => {
  const anchor =
    root.querySelector(".settings-actions") ??
    root.querySelector("footer") ??
    root.querySelector(".directory-footer") ??
    root;

  if (!root.querySelector("[data-action='open-ngh-journey-panel']")) {
    const journeyBtn = document.createElement("button");
    journeyBtn.type = "button";
    journeyBtn.className = "ngh-journey-launch";
    journeyBtn.dataset.action = "open-ngh-journey-panel";
    journeyBtn.textContent =
      game.i18n?.localize("NGH.Action.OpenJourneyPanel") ?? "Journey Control";
    journeyBtn.addEventListener("click", () => openJourneyPanel());
    anchor.appendChild(journeyBtn);
  }

  if (!root.querySelector("[data-action='open-ngh-combat-panel']")) {
    const combatBtn = document.createElement("button");
    combatBtn.type = "button";
    combatBtn.className = "ngh-journey-launch";
    combatBtn.dataset.action = "open-ngh-combat-panel";
    combatBtn.textContent =
      game.i18n?.localize("NGH.Action.OpenCombatPanel") ?? "Combat Control";
    combatBtn.addEventListener("click", () => openCombatPanel());
    anchor.appendChild(combatBtn);
  }

  if (!root.querySelector("[data-action='open-ngh-gm-tools-panel']")) {
    const gmToolsBtn = document.createElement("button");
    gmToolsBtn.type = "button";
    gmToolsBtn.className = "ngh-journey-launch";
    gmToolsBtn.dataset.action = "open-ngh-gm-tools-panel";
    gmToolsBtn.textContent =
      game.i18n?.localize("NGH.Action.OpenGMToolsPanel") ?? "GM Tools";
    gmToolsBtn.addEventListener("click", () => openGMToolsPanel());
    anchor.appendChild(gmToolsBtn);
  }
};

Hooks.once("init", () => {
  const initMessage = game?.i18n?.localize("NGH.System.Init") ?? "Initializing Never Going Home system";
  const version = game.system?.version ?? "unknown";
  console.log(`${NGH_SYSTEM_ID} | ${initMessage} | v${version}`);

  CONFIG.Actor.documentClass = NGHActor as unknown as typeof Actor;
  CONFIG.Item.documentClass = NGHItem as unknown as typeof Item;

  registerSharedDeckSettings();
  registerJourneyPanelSettings();
  registerCombatPanelSettings();

  (CONFIG.Actor as any).dataModels = NGHActorDataModels;
  (CONFIG.Item as any).dataModels = NGHItemDataModels;

  (CONFIG.Actor as { typeLabels: Record<string, string> }).typeLabels = {
    ...(CONFIG.Actor.typeLabels as Record<string, string>),
    character: "NGH.Actor.Type.Character",
    npc: "NGH.Actor.Type.NPC"
  };
  (CONFIG.Item as { typeLabels: Record<string, string> }).typeLabels = {
    ...(CONFIG.Item.typeLabels as Record<string, string>),
    burden: "NGH.Item.Type.Burden",
    equipment: "NGH.Item.Type.Equipment",
    scar: "NGH.Item.Type.Scar"
  };

  CONFIG.Actor.trackableAttributes = {
    character: {
      bar: ["attributes.krzepa", "attributes.spryt", "attributes.hart"],
      value: ["corruption", "armor"]
    }
  } as any;

  const DocumentSheetConfig: any =
    (foundry as any)?.applications?.apps?.DocumentSheetConfig ??
    (globalThis as any).DocumentSheetConfig;

  if (DocumentSheetConfig?.unregisterSheet) {
    DocumentSheetConfig.unregisterSheet(Actor as any, "core", (foundry as any).appv1?.sheets?.ActorSheet ?? (globalThis as any).ActorSheet);
    DocumentSheetConfig.registerSheet(Actor as any, NGH_SYSTEM_ID, NGHActorSheet, {
      types: ["character"],
      makeDefault: true,
    });
    DocumentSheetConfig.registerSheet(Actor as any, NGH_SYSTEM_ID, NGHNPCSheet, {
      types: ["npc"],
      makeDefault: true,
    });
  } else {
    // v12 fallback
    (Actors as any).unregisterSheet("core", (globalThis as any).ActorSheet);
    (Actors as any).registerSheet(NGH_SYSTEM_ID, NGHActorSheet, {
      types: ["character"],
      makeDefault: true,
    });
    (Actors as any).registerSheet(NGH_SYSTEM_ID, NGHNPCSheet, {
      types: ["npc"],
      makeDefault: true,
    });
  }

  const localizedWeapons = Object.fromEntries(
    Object.keys(NGH_WEAPON_PROFILES).map((weaponId) => [weaponId, getWeaponProfile(weaponId)])
  ) as typeof NGH_WEAPON_PROFILES;

  const gameWithApi = game as typeof game & { ngh?: NGHGameApi };
  gameWithApi.ngh = {
    mechanics: {
      executeSkillTest,
      rollChallenge,
      getSkillAttribute,
      attributes: {
        getDefenseValue: getActorDefenseValue,
        applyDamage: applyAttributeDamage,
        healDamage: healAttributeDamage,
        preventDamageWithCards,
        isDead: isActorDead
      },
      combat: {
        weapons: localizedWeapons,
        getWeaponProfile,
        resolveWeaponAttack,
        resolveInitiativeOrder,
        computeAttackPT,
        resolveTieBreaker,
        getNextRoundStarterOptions
      },
      cards: {
        getState: getSharedDeckState,
        getHand: getUserHand,
        getJourneyHand,
        hasInHand: hasCardInHand,
        isJoker,
        draw: drawFromSharedDeck,
        drawJourney: drawJourneyHand,
        drawTop: drawTopDeckCard,
        drawTopCards: drawTopDeckCards,
        discard: discardFromHand,
        discardJourney: (cards: string[], userId?: string) => discardFromHand(cards, userId, "journey"),
        returnToDeck: returnCardsFromHandToDeck,
        returnJourneyToDeck: returnJourneyCardsToDeck,
        returnDiscardedJokersToDeck,
        reset: resetSharedDeck,
        reshuffle: reshuffleDiscardsIntoDrawPile,
        maxHandSize: getMaxHandSize,
        maxJourneyHandSize: getMaxJourneyHandSize,
        parse: parseCard,
        useJourney: useJourneyCard,
        useInitiative: useInitiativeCard,
        burnForPlusOne: burnCardForPlusOne,
        burnForWhisper: burnCardForWhisper,
        burnForHealing: burnCardsForHealing,
        advancementCost: getAdvancementCardCost,
        spendForAdvancement: spendCardsForAdvancement,
        drawForCorruptionRisk,
        burnForElementalRitual,
        shuffleAndDealJourneyCards
      }
    }
  };

  Hooks.on("renderSidebarTab", (app: any, html: unknown) => {
    if (!game.user?.isGM) return;
    const tabName = app?.tabName ?? app?.options?.id ?? app?.id;
    if (tabName !== "settings") return;
    const root = getRenderableRoot(html);
    if (!root) return;
    injectGMPanelButtons(root);
  });

  Hooks.on("renderSettings", (_app: any, html: unknown) => {
    if (!game.user?.isGM) return;
    const root = getRenderableRoot(html);
    if (!root) return;
    injectGMPanelButtons(root);
  });
});

Hooks.once("ready", async () => {
  await initializeSharedDeck();

  // Register socket listener for journey phase sync (non-GM clients re-render)
  (game as any).socket?.on(`system.${NGH_SYSTEM_ID}`, (data: unknown) => {
    if (!game.user?.isGM) {
      handleJourneySocketMessage(data);
    }
  });
});
