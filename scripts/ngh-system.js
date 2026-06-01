import { NGHActorDataModels, NGHItemDataModels } from "./module/data-models.js";
import { NGHActor, NGHItem } from "./module/documents.js";
import { applyAttributeDamage, getActorDefenseValue, healAttributeDamage, isActorDead, preventDamageWithCards } from "./module/mechanics/attribute-tracks.js";
import { computeAttackPT, getNextRoundStarterOptions, getWeaponProfile, NGH_WEAPON_PROFILES, resolveTieBreaker, resolveInitiativeOrder, resolveWeaponAttack } from "./module/mechanics/combat.js";
import { executeSkillTest, getSkillAttribute, rollChallenge } from "./module/mechanics/skill-tests.js";
import { burnCardForPlusOne, burnCardForWhisper, burnCardsForHealing, burnForElementalRitual, drawForCorruptionRisk, getAdvancementCardCost, parseCard, spendCardsForAdvancement, useInitiativeCard, useJourneyCard } from "./module/mechanics/card-usage.js";
import { discardFromHand, drawFromSharedDeck, drawJourneyHand, drawTopDeckCard, drawTopDeckCards, getJourneyHand, getMaxHandSize, getMaxJourneyHandSize, getSharedDeckState, getUserHand, hasCardInHand, initializeSharedDeck, isJoker, registerSharedDeckSettings, resetSharedDeck, reshuffleDiscardsIntoDrawPile, returnDiscardedJokersToDeck, returnCardsFromHandToDeck, returnJourneyCardsToDeck, shuffleAndDealJourneyCards } from "./module/mechanics/shared-deck.js";
import { openJourneyPanel, registerJourneyPanelSettings, handleJourneySocketMessage, handleJourneySocketMessageAsGM } from "./apps/journey-panel.js";
import { openCombatPanel, registerCombatPanelSettings } from "./apps/combat-panel.js";
import { openGMToolsPanel } from "./apps/gm-tools-panel.js";
import { NGHActorSheet } from "./sheets/actor-sheet.js";
import { NGHNPCSheet } from "./sheets/npc-sheet.js";
const NGH_SYSTEM_ID = "nghrpg";
const getRenderableRoot = (html) => {
    if (html instanceof HTMLElement)
        return html;
    if (html?.[0] instanceof HTMLElement)
        return html[0];
    return null;
};
const injectGMPanelButtons = (root) => {
    const anchor = root.querySelector(".settings-actions") ??
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
    CONFIG.Actor.documentClass = NGHActor;
    CONFIG.Item.documentClass = NGHItem;
    registerSharedDeckSettings();
    registerJourneyPanelSettings();
    registerCombatPanelSettings();
    CONFIG.Actor.dataModels = NGHActorDataModels;
    CONFIG.Item.dataModels = NGHItemDataModels;
    CONFIG.Actor.typeLabels = {
        ...CONFIG.Actor.typeLabels,
        character: "NGH.Actor.Type.Character",
        npc: "NGH.Actor.Type.NPC"
    };
    CONFIG.Item.typeLabels = {
        ...CONFIG.Item.typeLabels,
        burden: "NGH.Item.Type.Burden",
        equipment: "NGH.Item.Type.Equipment",
        scar: "NGH.Item.Type.Scar"
    };
    CONFIG.Actor.trackableAttributes = {
        character: {
            bar: ["attributes.krzepa", "attributes.spryt", "attributes.hart"],
            value: ["corruption", "armor"]
        }
    };
    const DocumentSheetConfig = foundry?.applications?.apps?.DocumentSheetConfig ??
        globalThis.DocumentSheetConfig;
    if (DocumentSheetConfig?.unregisterSheet) {
        DocumentSheetConfig.unregisterSheet(Actor, "core", foundry.appv1?.sheets?.ActorSheet ?? globalThis.ActorSheet);
        DocumentSheetConfig.registerSheet(Actor, NGH_SYSTEM_ID, NGHActorSheet, {
            types: ["character"],
            makeDefault: true,
        });
        DocumentSheetConfig.registerSheet(Actor, NGH_SYSTEM_ID, NGHNPCSheet, {
            types: ["npc"],
            makeDefault: true,
        });
    }
    else {
        // v12 fallback
        Actors.unregisterSheet("core", globalThis.ActorSheet);
        Actors.registerSheet(NGH_SYSTEM_ID, NGHActorSheet, {
            types: ["character"],
            makeDefault: true,
        });
        Actors.registerSheet(NGH_SYSTEM_ID, NGHNPCSheet, {
            types: ["npc"],
            makeDefault: true,
        });
    }
    const localizedWeapons = Object.fromEntries(Object.keys(NGH_WEAPON_PROFILES).map((weaponId) => [weaponId, getWeaponProfile(weaponId)]));
    const gameWithApi = game;
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
                discardJourney: (cards, userId) => discardFromHand(cards, userId, "journey"),
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
    Hooks.on("renderSidebarTab", (app, html) => {
        if (!game.user?.isGM)
            return;
        const tabName = app?.tabName ?? app?.options?.id ?? app?.id;
        if (tabName !== "settings")
            return;
        const root = getRenderableRoot(html);
        if (!root)
            return;
        injectGMPanelButtons(root);
    });
    Hooks.on("renderSettings", (_app, html) => {
        if (!game.user?.isGM)
            return;
        const root = getRenderableRoot(html);
        if (!root)
            return;
        injectGMPanelButtons(root);
    });
});
Hooks.once("ready", async () => {
    await initializeSharedDeck();
    // Register socket listener for journey phase sync
    game.socket?.on(`system.${NGH_SYSTEM_ID}`, async (data) => {
        if (game.user?.isGM) {
            await handleJourneySocketMessageAsGM(data);
        }
        else {
            handleJourneySocketMessage(data);
        }
    });
});
