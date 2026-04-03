const NGH_SYSTEM_ID = "nghrpg";
const NGH_SOCKET_NAME = `system.${NGH_SYSTEM_ID}`;
const JOURNEY_PHASE_SETTING = "journeyPhase";
const JOURNEY_REQUIREMENTS_SETTING = "journeyRequirements";
const JOURNEY_POOL_SETTING = "journeyPoolCards";
const JOURNEY_BONUS_SETTING = "journeyBonus";
const JOURNEY_PENALTY_SETTING = "journeyPenalty";
const JOURNEY_REVEALED_SETTING = "journeyRevealedCards";
const JOURNEY_RESULT_SETTING = "journeyRequirementResult";
const JOURNEY_PLAYED_USERS_SETTING = "journeyPlayedUsers";
const JOURNEY_EXTRA_BLIND_COUNT_SETTING = "journeyExtraBlindCount";

const broadcastJourneyUpdate = (event: "update" | "reveal" | "resolve" = "update"): void => {
  (game as any).socket?.emit(NGH_SOCKET_NAME, { type: "journeyUpdate", event });
};

type JourneyRequirementStatus = "met" | "failed" | "unknown";

type JourneyRequirementResult = {
  status: JourneyRequirementStatus;
  checks: string[];
  outcomeText: string;
};

type JourneyRevealSlot = {
  revealKey: string;
  userId: string;
  userName: string;
  card: string;
};

const normalizeRequirementText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();

const getCardSuit = (card: string): "C" | "D" | "H" | "S" | "RJ" | "BJ" | "" => {
  if (card === "RJ" || card === "BJ") return card;
  const suit = card.slice(-1);
  return suit === "C" || suit === "D" || suit === "H" || suit === "S" ? suit : "";
};

const getCardRank = (card: string): string => {
  if (card === "RJ" || card === "BJ") return card;
  return card.slice(0, -1);
};

const getCardColor = (card: string): "red" | "black" | "" => {
  const suit = getCardSuit(card);
  if (suit === "RJ") return "red";
  if (suit === "BJ") return "black";
  if (suit === "H" || suit === "D") return "red";
  if (suit === "S" || suit === "C") return "black";
  return "";
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  jeden: 1,
  jedna: 1,
  jedno: 1,
  dwa: 2,
  dwie: 2,
  trzy: 3,
  cztery: 4,
  piec: 5,
  szesc: 6,
  siedem: 7,
  osiem: 8,
  dziewiec: 9,
  dziesiec: 10
};

const parseCount = (raw: string): number => {
  const trimmed = raw.trim();
  const direct = Number(trimmed);
  if (Number.isFinite(direct) && direct > 0) return Math.floor(direct);
  return NUMBER_WORDS[trimmed] ?? 0;
};

const evaluateJourneyRequirements = (requirementsText: string, cards: string[]): Omit<JourneyRequirementResult, "outcomeText"> => {
  const normalized = normalizeRequirementText(requirementsText);
  if (!normalized.trim()) {
    return { status: "unknown", checks: ["No structured requirement text provided."] };
  }

  const clauses = normalized
    .split(/[,;]+|\s+i\s+|\sand\s+/)
    .map((clause) => clause.trim())
    .filter(Boolean);

  const checks: string[] = [];
  const verdicts: boolean[] = [];
  let recognizedAny = false;

  for (const clause of clauses) {
    // Example: "brak szostek" / "no sixes"
    if (/(brak\s+szostek|bez\s+szostek|no\s+sixes|without\s+sixes|no\s+6)/.test(clause)) {
      recognizedAny = true;
      const met = cards.every((card) => getCardRank(card) !== "6");
      checks.push(met ? "No sixes: met" : "No sixes: failed");
      verdicts.push(met);
      continue;
    }

    // Example: "3 kiery" / "three hearts"
    const suitMatch = clause.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten|jeden|jedna|jedno|dwa|dwie|trzy|cztery|piec|szesc|siedem|osiem|dziewiec|dziesiec)\s+(kier|kiery|hearts?|pik|piki|spades?|trefl|trefle|clubs?|karo|diamonds?)/);
    if (suitMatch) {
      recognizedAny = true;
      const required = parseCount(suitMatch[1]);
      const suitWord = suitMatch[2];
      const requiredSuit = /kier|heart/.test(suitWord)
        ? "H"
        : /pik|spade/.test(suitWord)
          ? "S"
          : /trefl|club/.test(suitWord)
            ? "C"
            : "D";
      const count = cards.filter((card) => getCardSuit(card) === requiredSuit).length;
      const met = required > 0 && count >= required;
      checks.push(`${required} ${requiredSuit}: ${count} (${met ? "met" : "failed"})`);
      verdicts.push(met);
      continue;
    }

    // Example: "2 czarne karty" / "2 black cards"
    const colorMatch = clause.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten|jeden|jedna|jedno|dwa|dwie|trzy|cztery|piec|szesc|siedem|osiem|dziewiec|dziesiec)\s+(czarn\w*|black|czerwon\w*|red)\s+kart/);
    if (colorMatch) {
      recognizedAny = true;
      const required = parseCount(colorMatch[1]);
      const color = /czarn|black/.test(colorMatch[2]) ? "black" : "red";
      const count = cards.filter((card) => getCardColor(card) === color).length;
      const met = required > 0 && count >= required;
      checks.push(`${required} ${color} cards: ${count} (${met ? "met" : "failed"})`);
      verdicts.push(met);
      continue;
    }
  }

  if (!recognizedAny || verdicts.length < 1) {
    return {
      status: "unknown",
      checks: ["Could not auto-parse requirement text. Resolve manually in panel notes."]
    };
  }

  return {
    status: verdicts.every(Boolean) ? "met" : "failed",
    checks
  };
};

export const handleJourneySocketMessage = (data: unknown): void => {
  if (!data || typeof data !== "object" || (data as any).type !== "journeyUpdate") return;
  // Re-render open journey panel on non-GM clients
  if (panelInstance?.rendered) {
    void panelInstance.render();
  }
  // Re-render all open actor sheets so journey hand counts update
  for (const app of Object.values((ui as any).windows ?? {})) {
    if ((app as any)?.constructor?.name === "NGHActorSheet" && (app as any)?.rendered) {
      void (app as any).render();
    }
  }
};

type JourneyPhase = "configure" | "collect" | "deal" | "reveal" | "resolve";

type NGHJourneyApi = {
  mechanics: {
    cards: {
      getState: () => { journeyHands: Record<string, string[]>; discardPile: string[] };
      getJourneyHand: (userId?: string) => string[];
      discardJourney: (cards: string[], userId?: string) => Promise<{ discarded: string[]; hand: string[] }>;
      returnJourneyToDeck: (cards: string[], userId?: string) => Promise<{ returned: string[]; hand: string[] }>;
      isJoker: (card: string) => boolean;
      maxJourneyHandSize: () => number;
      parse: (card: string) => { code: string; label: string };
      drawJourney: (userId?: string, count?: number) => Promise<any>;
      useJourney: (userId?: string, card?: string) => Promise<any>;
      drawTopCards: (count?: number, discard?: boolean) => Promise<{ drawn: string[] }>;
      shuffleAndDealJourneyCards: (cardCodes: string[], userIds: string[]) => Promise<Record<string, string>>;
      drawForCorruptionRisk: () => Promise<{ drewCard: string; isBlack: boolean; jokersSkipped: string[] }>;
    };
  };
};

type NGHCorruptionRecommendation = {
  actorId: string;
  actorName: string;
  corruption: number;
  cards: number;
};

let panelInstance: NGHJourneyPanel | null = null;

export const registerJourneyPanelSettings = (): void => {
  (game as any).settings?.register(NGH_SYSTEM_ID, JOURNEY_PHASE_SETTING, {
    name: "Journey Phase",
    scope: "world",
    config: false,
    type: String,
    default: "configure"
  });
  (game as any).settings?.register(NGH_SYSTEM_ID, JOURNEY_REQUIREMENTS_SETTING, {
    name: "Journey Requirements",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
  (game as any).settings?.register(NGH_SYSTEM_ID, JOURNEY_POOL_SETTING, {
    name: "Journey Pool Cards",
    scope: "world",
    config: false,
    type: String,
    default: "[]"
  });
  (game as any).settings?.register(NGH_SYSTEM_ID, JOURNEY_BONUS_SETTING, {
    name: "Journey Bonus",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
  (game as any).settings?.register(NGH_SYSTEM_ID, JOURNEY_PENALTY_SETTING, {
    name: "Journey Penalty",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
  (game as any).settings?.register(NGH_SYSTEM_ID, JOURNEY_REVEALED_SETTING, {
    name: "Journey Revealed Cards",
    scope: "world",
    config: false,
    type: String,
    default: "{}"
  });
  (game as any).settings?.register(NGH_SYSTEM_ID, JOURNEY_RESULT_SETTING, {
    name: "Journey Requirement Result",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
  (game as any).settings?.register(NGH_SYSTEM_ID, JOURNEY_PLAYED_USERS_SETTING, {
    name: "Journey Played Users",
    scope: "world",
    config: false,
    type: String,
    default: "[]"
  });
  (game as any).settings?.register(NGH_SYSTEM_ID, JOURNEY_EXTRA_BLIND_COUNT_SETTING, {
    name: "Journey Extra Blind Count",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });
};

export const openJourneyPanel = (): void => {
  if (!game.user?.isGM) {
    ui.notifications?.warn(game.i18n?.localize("NGH.Error.GMOnlyJourneyPanel") ?? "Only the GM can open Journey control.");
    return;
  }

  panelInstance ??= new NGHJourneyPanel();
  void panelInstance.render(true as any);
};

export class NGHJourneyPanel extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  private t(key: string, fallback: string): string {
    const localized = game.i18n?.localize(key);
    return localized && localized !== key ? localized : fallback;
  }

  private tf(key: string, data: Record<string, unknown>, fallback: string): string {
    const localized = game.i18n?.format(key, data);
    return localized && localized !== key ? localized : fallback;
  }

  static override DEFAULT_OPTIONS = {
    classes: ["ngh", "journey-panel-app"],
    tag: "section",
    position: { width: 680, height: 860 },
    window: { title: "Journey Control", resizable: true },
  };

  static override PARTS = {
    body: {
      template: "systems/nghrpg/templates/journey-panel.html",
    },
  };

  async _prepareContext(): Promise<any> {
    const state = this.api.mechanics.cards.getState();
    const gmJourneyHand = this.api.mechanics.cards.getJourneyHand(this.userId).map((card) => this.api.mechanics.cards.parse(card));
    const users = Array.from(((game as any).users?.contents ?? (game as any).users ?? []) as any[])
      .filter((user) => user?.id && !user.isGM)
      .map((user) => ({
        userId: String(user.id),
        name: String(user.name ?? user.id),
        count: state.journeyHands[String(user.id)]?.length ?? 0,
      }));
    const corruptionRecommendations = this.getCorruptionRecommendations();
    const phase = this.getPhase();
    const requirements = this.getRequirements();
    const revealedCards = this.getRevealedCards();
    const requirementResult = this.getRequirementResult();

    const poolCards = this.getJourneyPoolCards();
    const revealSlots = this.getRevealSlots(state);
    const playedUserIds = this.getPlayedUserIds();
    const allPlayersContributed = users.every((user) => playedUserIds.includes(user.userId));
    const allJourneyCards = poolCards.map((card) => ({
      userId: "",
      userName: "",
      card,
      label: this.api.mechanics.cards.parse(card).label
    }));

    // Color motifs for reveal phase
    const suitMotifs: Record<string, string> = {
      S: this.t("NGH.Journey.Motif.Spades", "Knowledge — learning, growth, overcoming suffering"),
      C: this.t("NGH.Journey.Motif.Clubs", "Objects — overcoming obstacles, action, adventure"),
      H: this.t("NGH.Journey.Motif.Hearts", "Relationships — emotions and bonds"),
      D: this.t("NGH.Journey.Motif.Diamonds", "Self — ambition and hope"),
      RJ: this.t("NGH.Journey.Motif.RedJoker", "Wild — any motif of your choice"),
      BJ: this.t("NGH.Journey.Motif.BlackJoker", "Wild — any motif (Corruption risk)"),
    };

    const getMotif = (cardCode: string): string => {
      if (cardCode === "RJ" || cardCode === "BJ") return suitMotifs[cardCode] ?? "";
      const suit = cardCode.slice(-1);
      return suitMotifs[suit] ?? "";
    };

    const dealtCards = revealSlots.map((slot) => {
      const revealedCode = revealedCards[slot.revealKey] ?? null;
      const shouldReveal = phase === "resolve" || Boolean(revealedCode);
      const visibleCard = shouldReveal ? (revealedCode ?? slot.card) : null;
      return {
        userId: slot.userId,
        name: slot.userName,
        dealtCard: visibleCard ? this.api.mechanics.cards.parse(visibleCard).label : null,
        dealtCode: visibleCard,
        motif: visibleCard ? getMotif(visibleCard) : null,
        isRevealed: shouldReveal,
      };
    });

    const totalCollected = poolCards.length;

    return {
      cssClass: "ngh",
      gmJourneyHand,
      maxJourneyHandSize: this.api.mechanics.cards.maxJourneyHandSize(),
      playerJourneyCounts: users,
      corruptionRecommendations,
      totalCorruptionCards: corruptionRecommendations.reduce((sum, entry) => sum + entry.cards, 0),
      panelTitle: this.t("NGH.Journey.PanelTitle", "Journey Control"),
      // Phase data
      phase,
      requirements,
      allJourneyCards,
      totalCollected,
      dealtCards,
      isConfigure: phase === "configure",
      isCollect: phase === "collect",
      isDeal: phase === "deal",
      isReveal: phase === "reveal",
      isResolve: phase === "resolve",
      canDeal: phase === "deal" && totalCollected > 0 && allPlayersContributed,
      canDealFromCollect: phase === "collect" && totalCollected > 0 && allPlayersContributed,
      canRevealAll: phase === "reveal" && dealtCards.some((entry) => !entry.isRevealed),
      canAutoResolve: (phase === "reveal" || phase === "resolve") && dealtCards.length > 0 && dealtCards.every((entry) => entry.isRevealed),
      requirementResult,
      allPlayersContributed,
      bonus: this.getBonus(),
      penalty: this.getPenalty(),
      // Labels
      phaseLabel: this.t(`NGH.Journey.Phase.${phase}`, phase),
    };
  }

  protected override _onRender(_context: Record<string, unknown>, _options: Record<string, unknown>): void {
    const root = this.element;
    const run = (action: () => Promise<void>): void => {
      void action().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : this.t("NGH.Error.ActionFailed", "Action failed");
        console.error("nghrpg | Journey panel action failed", error);
        ui.notifications?.error(message);
      });
    };

    root.querySelector("[data-action='draw-journey-card']")?.addEventListener("click", () => {
      run(() => this._doDrawJourneyCard());
    });

    root.querySelector("[data-action='play-blind-journey']")?.addEventListener("click", () => {
      run(() => this._doJourneyCard());
    });

    root.querySelector("[data-action='apply-corruption-cards']")?.addEventListener("click", () => {
      run(() => this._doApplyCorruptionCards());
    });

    // Phase navigation
    root.querySelector("[data-action='journey-start-collect']")?.addEventListener("click", () => {
      run(() => this._doSetPhase("collect"));
    });
    root.querySelector("[data-action='journey-add-blind']")?.addEventListener("click", () => {
      run(() => this._doAddBlindCard());
    });
    root.querySelector("[data-action='journey-deal']")?.addEventListener("click", () => {
      run(() => this._doDealCards());
    });
    root.querySelector("[data-action='journey-resolve']")?.addEventListener("click", () => {
      run(() => this._doSetPhase("resolve"));
    });
    root.querySelector("[data-action='journey-reveal-all']")?.addEventListener("click", () => {
      run(() => this._doRevealAllCards());
    });

    // Per-slot reveal buttons
    root.querySelectorAll("[data-action='journey-reveal-slot']").forEach((button) => {
      button.addEventListener("click", (event) => {
        const slotIndex = Number((event.currentTarget as HTMLElement).dataset.slot);
        run(() => this._doRevealSlot(slotIndex));
      });
    });
    root.querySelector("[data-action='journey-auto-resolve']")?.addEventListener("click", () => {
      run(() => this._doAutoResolveRequirements());
    });
    root.querySelector("[data-action='journey-finish']")?.addEventListener("click", () => {
      run(() => this._doFinishJourney());
    });

    root.querySelector("[data-action='journey-end-mission']")?.addEventListener("click", () => {
      run(() => this._doEndMission());
    });

    root.querySelectorAll("[data-action='journey-card']").forEach((button) => {
      button.addEventListener("click", (event) => {
        const card = (event.currentTarget as HTMLElement).dataset.card ?? "";
        run(() => this._doJourneyCard(card));
      });
    });

    // Config textareas — save on blur
    const requirementsField = root.querySelector<HTMLTextAreaElement>("textarea[name='journey-requirements']");
    if (requirementsField) {
      requirementsField.addEventListener("blur", () => {
        void (game as any).settings?.set(NGH_SYSTEM_ID, JOURNEY_REQUIREMENTS_SETTING, requirementsField.value ?? "");
        broadcastJourneyUpdate();
      });
    }
    const bonusField = root.querySelector<HTMLTextAreaElement>("textarea[name='journey-bonus']");
    if (bonusField) {
      bonusField.addEventListener("blur", () => {
        void (game as any).settings?.set(NGH_SYSTEM_ID, JOURNEY_BONUS_SETTING, bonusField.value ?? "");
        broadcastJourneyUpdate();
      });
    }
    const penaltyField = root.querySelector<HTMLTextAreaElement>("textarea[name='journey-penalty']");
    if (penaltyField) {
      penaltyField.addEventListener("blur", () => {
        void (game as any).settings?.set(NGH_SYSTEM_ID, JOURNEY_PENALTY_SETTING, penaltyField.value ?? "");
        broadcastJourneyUpdate();
      });
    }
  }

  /**
   * Reveal a single journey card slot by index (in revealSlots order).
   */
  private async _doRevealSlot(slotIndex: number): Promise<void> {
    const state = this.api.mechanics.cards.getState();
    const slots = this.getRevealSlots(state);
    if (typeof slotIndex !== "number" || slotIndex < 0 || slotIndex >= slots.length) {
      ui.notifications?.warn(this.t("NGH.Journey.Reveal.InvalidSlot", "Invalid slot index."));
      return;
    }
    const slot = slots[slotIndex];
    const revealed = { ...this.getRevealedCards() };
    if (revealed[slot.revealKey]) {
      ui.notifications?.info(this.t("NGH.Journey.Reveal.AlreadyRevealed", "This card is already revealed."));
      return;
    }
    revealed[slot.revealKey] = slot.card;
    await this.setRevealedCards(revealed);
    await this.createChatMessage(
      this.t("NGH.Chat.Journey.RevealTitle", "Journey Reveal"),
      [this.tf("NGH.Chat.Journey.RevealedCard", { user: slot.userName, card: slot.card }, `${slot.userName}: ${slot.card}`)]
    );
    void this.render();
    broadcastJourneyUpdate("reveal");

    // A03: Handle Black Joker slot — trigger corruption risk if needed
    const BLACK_JOKER = "BJ";
    if (slot.card === BLACK_JOKER) {
      const isGMSlot = slot.revealKey.startsWith("gm:");
      if (isGMSlot) {
        await this.createChatMessage(
          this.t("NGH.Chat.Journey.BJGMSlotTitle", "Black Joker — Blind Slot"),
          [this.t("NGH.Chat.Journey.BJGMSlotWarning",
            "A Black Joker appeared in a blind/surplus journey slot. Assign corruption risk to the appropriate player manually.")]
        );
      } else {
        const user = ((game as any).users?.get(slot.userId)) as any;
        const actor = user?.character ?? null;
        const riskResult = await this.api.mechanics.cards.drawForCorruptionRisk();
        const riskLines: string[] = [
          this.tf("NGH.Chat.Journey.BJPlayerSlotAffected", { user: slot.userName },
            `Black Joker in ${slot.userName}'s journey slot — Corruption Risk:`),
          this.tf("NGH.Chat.CorruptionRisk.Card", { card: riskResult.drewCard || "?" },
            `Card drawn: ${riskResult.drewCard || "?"}`),
          riskResult.isBlack
            ? this.t("NGH.Chat.CorruptionRisk.Black", "Black card — Corruption +1")
            : this.t("NGH.Chat.CorruptionRisk.Red", "Red card — no corruption."),
        ];
        if (riskResult.isBlack && actor) {
          const current = Number(actor.system?.corruption ?? 0);
          await actor.update({ "system.corruption": Math.min(5, current + 1) });
          riskLines.push(this.tf("NGH.Chat.Journey.BJCorruptionApplied", { name: String(actor.name ?? slot.userName) },
            `Corruption applied to ${String(actor.name ?? slot.userName)}.`));
        } else if (riskResult.isBlack) {
          riskLines.push(this.tf("NGH.Chat.Journey.BJNoActorWarning", { user: slot.userName },
            `No linked character found for ${slot.userName} — apply Corruption +1 manually.`));
        }
        await this.createChatMessage(
          this.t("NGH.Chat.CorruptionRisk.Title", "Corruption Risk"),
          riskLines
        );
      }
    }
  }


  private get api(): NGHJourneyApi {
    const api = (game as typeof game & { ngh?: NGHJourneyApi }).ngh;
    if (!api) throw new Error(this.t("NGH.Error.ApiUnavailable", "NGH API is not available"));
    return api;
  }

  private get userId(): string {
    const userId = game.user?.id ?? "";
    if (!userId) throw new Error(this.t("NGH.Error.MissingActiveUser", "Missing active user"));
    return userId;
  }

  private getPhase(): JourneyPhase {
    const stored = (game as any).settings?.get(NGH_SYSTEM_ID, JOURNEY_PHASE_SETTING) as string | undefined;
    const valid: JourneyPhase[] = ["configure", "collect", "deal", "reveal", "resolve"];
    return valid.includes(stored as JourneyPhase) ? (stored as JourneyPhase) : "configure";
  }

  private getRequirements(): string {
    return String((game as any).settings?.get(NGH_SYSTEM_ID, JOURNEY_REQUIREMENTS_SETTING) ?? "");
  }

  private getBonus(): string {
    return String((game as any).settings?.get(NGH_SYSTEM_ID, JOURNEY_BONUS_SETTING) ?? "");
  }

  private getPenalty(): string {
    return String((game as any).settings?.get(NGH_SYSTEM_ID, JOURNEY_PENALTY_SETTING) ?? "");
  }

  private getJourneyPoolCards(): string[] {
    const raw = String((game as any).settings?.get(NGH_SYSTEM_ID, JOURNEY_POOL_SETTING) ?? "[]");
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : [];
    } catch {
      return [];
    }
  }

  private getPlayedUserIds(): string[] {
    const raw = String((game as any).settings?.get(NGH_SYSTEM_ID, JOURNEY_PLAYED_USERS_SETTING) ?? "[]");
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string" && value.length > 0)
        : [];
    } catch {
      return [];
    }
  }

  private getExtraBlindCount(): number {
    return Math.max(0, Number((game as any).settings?.get(NGH_SYSTEM_ID, JOURNEY_EXTRA_BLIND_COUNT_SETTING) ?? 0));
  }

  private async markUserPlayed(userId: string): Promise<void> {
    if (!userId) return;
    const current = this.getPlayedUserIds();
    if (current.includes(userId)) return;
    current.push(userId);
    await (game as any).settings?.set(NGH_SYSTEM_ID, JOURNEY_PLAYED_USERS_SETTING, JSON.stringify(current));
  }

  private async setExtraBlindCount(count: number): Promise<void> {
    await (game as any).settings?.set(NGH_SYSTEM_ID, JOURNEY_EXTRA_BLIND_COUNT_SETTING, Math.max(0, Math.floor(count)));
  }

  private async resetJourneyProgressTracking(): Promise<void> {
    await (game as any).settings?.set(NGH_SYSTEM_ID, JOURNEY_PLAYED_USERS_SETTING, "[]");
    await this.setExtraBlindCount(0);
  }

  private getRevealSlots(state = this.api.mechanics.cards.getState()): JourneyRevealSlot[] {
    const slots: JourneyRevealSlot[] = [];
    const users = Array.from(((game as any).users?.contents ?? (game as any).users ?? []) as any[])
      .filter((user) => user?.id && !user.isGM)
      .map((user) => ({ userId: String(user.id), userName: String(user.name ?? user.id) }));

    for (const user of users) {
      const card = state.journeyHands[user.userId]?.[0];
      if (card) {
        slots.push({
          revealKey: `user:${user.userId}`,
          userId: user.userId,
          userName: user.userName,
          card
        });
      }
    }

    const gmUserId = this.userId;
    const gmCards = state.journeyHands[gmUserId] ?? [];
    for (let i = 0; i < gmCards.length; i += 1) {
      slots.push({
        revealKey: `gm:${i}`,
        userId: gmUserId,
        userName: this.t("NGH.Journey.Narrator", "Narrator"),
        card: gmCards[i]
      });
    }

    return slots;
  }

  private getRevealedCards(): Record<string, string> {
    const raw = String((game as any).settings?.get(NGH_SYSTEM_ID, JOURNEY_REVEALED_SETTING) ?? "{}");
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return {};
      return Object.entries(parsed).reduce<Record<string, string>>((acc, [userId, card]) => {
        if (typeof userId === "string" && typeof card === "string" && card) {
          acc[userId] = card;
        }
        return acc;
      }, {});
    } catch {
      return {};
    }
  }

  private async setRevealedCards(cards: Record<string, string>): Promise<void> {
    await (game as any).settings?.set(NGH_SYSTEM_ID, JOURNEY_REVEALED_SETTING, JSON.stringify(cards));
  }

  private getRequirementResult(): JourneyRequirementResult | null {
    const raw = String((game as any).settings?.get(NGH_SYSTEM_ID, JOURNEY_RESULT_SETTING) ?? "");
    if (!raw.trim()) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      const status = parsed.status;
      const checks = Array.isArray(parsed.checks)
        ? (parsed.checks as unknown[]).filter((value): value is string => typeof value === "string")
        : [];
      const outcomeText = typeof parsed.outcomeText === "string" ? parsed.outcomeText : "";
      if (status !== "met" && status !== "failed" && status !== "unknown") return null;
      return { status, checks, outcomeText };
    } catch {
      return null;
    }
  }

  private async setRequirementResult(result: JourneyRequirementResult | null): Promise<void> {
    await (game as any).settings?.set(
      NGH_SYSTEM_ID,
      JOURNEY_RESULT_SETTING,
      result ? JSON.stringify(result) : ""
    );
  }

  private async setJourneyPoolCards(cards: string[]): Promise<void> {
    await (game as any).settings?.set(NGH_SYSTEM_ID, JOURNEY_POOL_SETTING, JSON.stringify(cards));
  }

  private async _doSetPhase(phase: JourneyPhase): Promise<void> {
    await (game as any).settings?.set(NGH_SYSTEM_ID, JOURNEY_PHASE_SETTING, phase);
    if (phase === "collect") {
      await this.setJourneyPoolCards([]);
      await this.setRevealedCards({});
      await this.setRequirementResult(null);
      await this.resetJourneyProgressTracking();
    }
    void this.render();
    broadcastJourneyUpdate("update");
    await this.createChatMessage(
      this.t("NGH.Journey.PhaseChange.Title", "Journey Phase"),
      [this.tf("NGH.Journey.PhaseChange.Now", { phase: this.t(`NGH.Journey.Phase.${phase}`, phase) }, `Phase: ${phase}`)]
    );
  }

  private async _doAddBlindCard(): Promise<void> {
    const playerIds = Array.from(((game as any).users?.contents ?? (game as any).users ?? []) as any[])
      .filter((user) => user?.id && !user.isGM)
      .map((user) => String(user.id));
    const extraBlindCount = this.getExtraBlindCount();
    if (extraBlindCount >= playerIds.length) {
      ui.notifications?.warn(this.t("NGH.Journey.BlindCard.MaxReached", "Maximum blind cards already added (one per player)."));
      return;
    }
    const result = await this.api.mechanics.cards.drawTopCards(1, true);
    if (result.drawn[0]) {
      const pool = this.getJourneyPoolCards();
      pool.push(result.drawn[0]);
      await this.setJourneyPoolCards(pool);
      await this.setExtraBlindCount(extraBlindCount + 1);
    }
    void this.render();
    broadcastJourneyUpdate();
    await this.createChatMessage(this.t("NGH.Chat.Journey.BlindCard", "Blind Journey Card"), [
      this.tf("NGH.Chat.Journey.BlindAdded", { card: result.drawn[0] ?? "?" }, `Blind card drawn: ${result.drawn[0] ?? "?"}`),
    ]);
  }

  private async _doDealCards(): Promise<void> {
    const poolCards = this.getJourneyPoolCards();

    const playerIds = Array.from(((game as any).users?.contents ?? (game as any).users ?? []) as any[])
      .filter((user) => user?.id && !user.isGM)
      .map((user) => String(user.id));
    const playedUserIds = this.getPlayedUserIds();
    const missingUsers = playerIds.filter((id) => !playedUserIds.includes(id));

    if (poolCards.length === 0) {
      ui.notifications?.warn(this.t("NGH.Journey.Deal.NoCards", "No collected journey cards to deal."));
      return;
    }

    if (missingUsers.length > 0) {
      const usersById = (game as any).users;
      const missingNames = missingUsers
        .map((id) => usersById?.get(id)?.name ?? id)
        .join(", ");
      ui.notifications?.warn(
        this.tf(
          "NGH.Journey.Deal.MissingPlayerCards",
          { users: missingNames },
          `Every player must contribute at least one journey card first: ${missingNames}`
        )
      );
      return;
    }

    // All registered player IDs (GM gets surplus)
    const recipientIds = [...playerIds];
    if (recipientIds.length === 0) {
      ui.notifications?.warn(this.t("NGH.Journey.Deal.NoPlayers", "No players to deal to."));
      return;
    }

    const dealt = await this.api.mechanics.cards.shuffleAndDealJourneyCards(poolCards, recipientIds);
    await this.setJourneyPoolCards([]);
    await this.setRevealedCards({});
    await this.setRequirementResult(null);
    await (game as any).settings?.set(NGH_SYSTEM_ID, JOURNEY_PHASE_SETTING, "reveal" as JourneyPhase);
    void this.render();
    broadcastJourneyUpdate("update");

    const dealtLines = Object.entries(dealt).map(([userId, card]) => {
      const userName = ((game as any).users?.get(userId))?.name ?? userId;
      return this.tf("NGH.Chat.Journey.DealtCard", { user: userName, card }, `${userName}: ${card}`);
    });
    await this.createChatMessage(this.t("NGH.Chat.Journey.DealTitle", "Journey Cards Dealt"), dealtLines);
  }

  private async _doFinishJourney(): Promise<void> {
    // Discard all remaining journey hands and reset phase
    const allUserIds = Array.from(((game as any).users?.contents ?? (game as any).users ?? []) as any[])
      .filter((user) => user?.id)
      .map((user) => String(user.id));

    for (const userId of allUserIds) {
      const hand = this.api.mechanics.cards.getJourneyHand(userId);
      if (hand.length > 0) {
        const jokers = hand.filter((card) => this.api.mechanics.cards.isJoker(card));
        const regularCards = hand.filter((card) => !this.api.mechanics.cards.isJoker(card));
        if (regularCards.length > 0) {
          await this.api.mechanics.cards.discardJourney(regularCards, userId);
        }
        if (jokers.length > 0) {
          await this.api.mechanics.cards.returnJourneyToDeck(jokers, userId);
        }
      }
    }

    await (game as any).settings?.set(NGH_SYSTEM_ID, JOURNEY_PHASE_SETTING, "configure" as JourneyPhase);
    await (game as any).settings?.set(NGH_SYSTEM_ID, JOURNEY_REQUIREMENTS_SETTING, "");
    await (game as any).settings?.set(NGH_SYSTEM_ID, JOURNEY_BONUS_SETTING, "");
    await (game as any).settings?.set(NGH_SYSTEM_ID, JOURNEY_PENALTY_SETTING, "");
    await this.setJourneyPoolCards([]);
    await this.setRevealedCards({});
    await this.setRequirementResult(null);
    await this.resetJourneyProgressTracking();
    void this.render();
    broadcastJourneyUpdate("update");
    await this.createChatMessage(
      this.t("NGH.Chat.Journey.FinishTitle", "Journey Complete"),
      [this.t("NGH.Chat.Journey.Finished", "The journey phase has ended. Cards resolved.")]
    );
  }

  private async _doEndMission(): Promise<void> {
    const confirmed = await this.promptConfirm(
      this.t("NGH.Journey.EndMission.Confirm", "End mission? This will restore all character attributes to full and reshuffle the discard pile.")
    );
    if (!confirmed) return;

    // Restore all character attributes to max
    const actors = Array.from(((game as any).actors?.contents ?? (game as any).actors ?? []) as any[])
      .filter((actor: any) => actor?.type === "character");

    for (const actor of actors) {
      const system = actor.system as any;
      const attrs = system?.attributes ?? {};
      const updateData: Record<string, number> = {};
      for (const key of Object.keys(attrs)) {
        const max = Number(attrs[key]?.max ?? 0);
        updateData[`system.attributes.${key}.value`] = max;
      }
      if (Object.keys(updateData).length > 0) {
        await actor.update(updateData);
      }
    }

    // Finish journey and reshuffle discard
    await this._doFinishJourney();

    const reshuffleState = this.api.mechanics.cards.getState();
    const discardCount = reshuffleState.discardPile.length;
    // Reshuffle is done automatically via the shared deck reshuffle helper exposed on the API
    const reshuffleApi = (game as typeof game & { ngh?: any }).ngh;
    if (reshuffleApi?.mechanics?.cards?.reshuffle) {
      await reshuffleApi.mechanics.cards.reshuffle();
    }

    await this.createChatMessage(
      this.t("NGH.Chat.Journey.EndMissionTitle", "Mission Complete"),
      [
        this.t("NGH.Chat.Journey.EndMissionAttributes", "All character attributes restored."),
        this.tf("NGH.Chat.Journey.EndMissionReshuffle", { count: discardCount }, `Reshuffled ${discardCount} cards into the draw pile.`),
      ]
    );

    // A07: Warn about Corruption 5 characters who must retire after this mission
    const corruption5 = actors
      .filter((actor: any) => Number(actor.system?.corruption ?? 0) >= 5)
      .map((actor: any) => String(actor.name ?? this.t("NGH.Common.Unknown", "Unknown")));

    if (corruption5.length > 0) {
      await this.createChatMessage(
        this.t("NGH.Chat.Journey.Corruption5Title", "Corruption 5 — Final Mission"),
        [
          this.t("NGH.Chat.Journey.Corruption5Warning",
            "The following characters have reached Corruption 5. This was their last mission — they must retire from the unit."),
          ...corruption5.map((name) =>
            this.tf("NGH.Chat.Journey.Corruption5Actor", { name }, `• ${name}`)
          ),
        ]
      );
    }
  }

  private getCorruptionRecommendations(): NGHCorruptionRecommendation[] {
    const actors = Array.from(((game as any).actors?.contents ?? (game as any).actors ?? []) as any[]);
    return actors
      .filter((actor) => actor?.type === "character")
      .map((actor) => {
        const corruption = Math.max(0, Number(actor.system?.corruption ?? 0));
        const cards = corruption >= 4 ? 2 : corruption >= 3 ? 1 : 0;
        return {
          actorId: String(actor.id ?? ""),
          actorName: String(actor.name ?? this.t("NGH.Common.Unknown", "Unknown")),
          corruption,
          cards,
        };
      })
      .filter((entry) => entry.cards > 0);
  }

  private async createChatMessage(title: string, lines: string[]): Promise<void> {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ alias: this.t("NGH.Journey.PanelTitle", "Journey Control") } as any),
      content: [`<h3>${title}</h3>`, ...lines.map((line) => `<p>${line}</p>`)].join(""),
    });
  }

  private async promptConfirm(message: string): Promise<boolean> {
    const safeMessage = message.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replace(/\n/g, "<br />");
    const result = await foundry.applications.api.DialogV2.confirm({
      window: { title: this.t("NGH.Dialog.ConfirmTitle", "Confirm") } as any,
      content: `<p>${safeMessage}</p>`,
      yes: { action: "yes", label: game.i18n?.localize("Yes") ?? "Yes", default: true },
      no: { action: "no", label: game.i18n?.localize("No") ?? "No" },
      rejectClose: false,
    });
    return result === true;
  }

  private async _doDrawJourneyCard(): Promise<void> {
    const result = await this.api.mechanics.cards.drawJourney(this.userId, 1);
    await this.createChatMessage(this.t("NGH.Chat.DrawJourneyCard.Title", "Draw Journey Card"), [
      this.tf("NGH.Chat.DrawJourneyCard.Drawn", { drawn: result.drawn.join(", ") || this.t("NGH.Common.None", "none") }, `Drawn: ${result.drawn.join(", ") || "none"}`),
      this.tf("NGH.Chat.DrawJourneyCard.Hand", { current: result.hand.length, max: this.api.mechanics.cards.maxJourneyHandSize() }, `Journey hand: ${result.hand.length}/${this.api.mechanics.cards.maxJourneyHandSize()}`),
    ]);
    void this.render();
    broadcastJourneyUpdate("update");
  }

  private async _doJourneyCard(card?: string): Promise<void> {
    const result = await this.api.mechanics.cards.useJourney(this.userId, card);
    const played = (result.playedCards ?? []).filter((value: unknown): value is string => typeof value === "string");
    if (played.length > 0) {
      const pool = this.getJourneyPoolCards();
      pool.push(...played);
      await this.setJourneyPoolCards(pool);
      await this.markUserPlayed(this.userId);
    }
    await this.createChatMessage(this.t("NGH.Chat.Journey.Title", "Journey"), [
      this.tf("NGH.Chat.Journey.Source", { source: result.source }, `Source: ${result.source}`),
      this.tf(result.source === "top-deck" ? "NGH.Chat.Journey.DrewBlind" : "NGH.Chat.Journey.Played", { card: result.playedCards[0] ?? this.t("NGH.Common.None", "none") }, `${result.source === "top-deck" ? "Drew blind" : "Played"}: ${result.playedCards[0] ?? "none"}`),
      this.tf("NGH.Chat.Journey.HandLeft", { count: result.hand.length }, `Journey hand left: ${result.hand.length}`),
    ]);
    void this.render();
    broadcastJourneyUpdate("update");
  }

  private async _doApplyCorruptionCards(): Promise<void> {
    const recommendations = this.getCorruptionRecommendations();
    const totalCards = recommendations.reduce((sum, entry) => sum + entry.cards, 0);
    if (totalCards < 1) {
      ui.notifications?.info(this.t("NGH.Info.NoCorruptionJourneyCards", "No corruption-based journey cards are currently recommended."));
      return;
    }

    const summary = recommendations
      .map((entry) => this.tf("NGH.Chat.CorruptionJourney.Entry", { actor: entry.actorName, corruption: entry.corruption, cards: entry.cards }, `${entry.actorName}: corruption ${entry.corruption}, cards ${entry.cards}`))
      .join("\n");
    const confirmed = await this.promptConfirm(
      this.tf("NGH.Prompt.ConfirmCorruptionJourney", { total: totalCards, summary }, `Apply ${totalCards} journey cards from corruption?\n${summary}`)
    );
    if (!confirmed) return;

    const result = await this.api.mechanics.cards.drawTopCards(totalCards, true);
    if (result.drawn.length > 0) {
      const pool = this.getJourneyPoolCards();
      pool.push(...result.drawn);
      await this.setJourneyPoolCards(pool);
    }
    await this.createChatMessage(this.t("NGH.Chat.CorruptionJourney.Title", "Corruption Journey Cards"), [
      this.tf("NGH.Chat.CorruptionJourney.Total", { total: result.drawn.length }, `Corruption cards resolved: ${result.drawn.length}`),
      this.tf("NGH.Chat.CorruptionJourney.Drawn", { cards: result.drawn.join(", ") || this.t("NGH.Common.None", "none") }, `Drawn: ${result.drawn.join(", ") || "none"}`),
      ...recommendations.map((entry) => this.tf("NGH.Chat.CorruptionJourney.Entry", { actor: entry.actorName, corruption: entry.corruption, cards: entry.cards }, `${entry.actorName}: corruption ${entry.corruption}, cards ${entry.cards}`)),
    ]);
    void this.render();
    broadcastJourneyUpdate("update");
  }

  private async _doRevealAllCards(): Promise<void> {
    const state = this.api.mechanics.cards.getState();
    const slots = this.getRevealSlots(state);
    const revealed: Record<string, string> = {};
    for (const slot of slots) {
      revealed[slot.revealKey] = slot.card;
    }

    await this.setRevealedCards(revealed);
    await this.createChatMessage(
      this.t("NGH.Chat.Journey.RevealTitle", "Journey Reveal"),
      slots.map((slot) => this.tf("NGH.Chat.Journey.RevealedCard", { user: slot.userName, card: slot.card }, `${slot.userName}: ${slot.card}`))
    );
    void this.render();
    broadcastJourneyUpdate("reveal");

    // A03: Handle Black Joker slots — trigger corruption risk per affected player
    const BLACK_JOKER = "BJ";
    const bjSlots = slots.filter((slot) => slot.card === BLACK_JOKER);
    for (const slot of bjSlots) {
      const isGMSlot = slot.revealKey.startsWith("gm:");
      if (isGMSlot) {
        // BJ in a blind/surplus slot — warn GM, no specific player
        await this.createChatMessage(
          this.t("NGH.Chat.Journey.BJGMSlotTitle", "Black Joker — Blind Slot"),
          [this.t("NGH.Chat.Journey.BJGMSlotWarning",
            "A Black Joker appeared in a blind/surplus journey slot. Assign corruption risk to the appropriate player manually.")]
        );
        continue;
      }

      // BJ in a player's dealt slot → trigger corruption risk
      const user = ((game as any).users?.get(slot.userId)) as any;
      const actor = user?.character ?? null;

      const riskResult = await this.api.mechanics.cards.drawForCorruptionRisk();
      const riskLines: string[] = [
        this.tf("NGH.Chat.Journey.BJPlayerSlotAffected", { user: slot.userName },
          `Black Joker in ${slot.userName}'s journey slot — Corruption Risk:`),
        this.tf("NGH.Chat.CorruptionRisk.Card", { card: riskResult.drewCard || "?" },
          `Card drawn: ${riskResult.drewCard || "?"}`),
        riskResult.isBlack
          ? this.t("NGH.Chat.CorruptionRisk.Black", "Black card — Corruption +1")
          : this.t("NGH.Chat.CorruptionRisk.Red", "Red card — no corruption."),
      ];

      if (riskResult.isBlack && actor) {
        const current = Number(actor.system?.corruption ?? 0);
        await actor.update({ "system.corruption": Math.min(5, current + 1) });
        riskLines.push(this.tf("NGH.Chat.Journey.BJCorruptionApplied", { name: String(actor.name ?? slot.userName) },
          `Corruption applied to ${String(actor.name ?? slot.userName)}.`));
      } else if (riskResult.isBlack) {
        riskLines.push(this.tf("NGH.Chat.Journey.BJNoActorWarning", { user: slot.userName },
          `No linked character found for ${slot.userName} — apply Corruption +1 manually.`));
      }

      await this.createChatMessage(
        this.t("NGH.Chat.CorruptionRisk.Title", "Corruption Risk"),
        riskLines
      );
    }
  }

  private async _doAutoResolveRequirements(): Promise<void> {
    const requirements = this.getRequirements();
    const revealed = this.getRevealedCards();
    const slots = this.getRevealSlots();
    const cards = slots
      .map((slot) => revealed[slot.revealKey] ?? "")
      .filter((card): card is string => Boolean(card));
    if (cards.length < 1 || cards.length < slots.length) {
      ui.notifications?.warn(this.t("NGH.Journey.Resolve.NoRevealedCards", "Reveal journey cards before resolving requirements."));
      return;
    }

    const evaluation = evaluateJourneyRequirements(requirements, cards);
    const bonus = this.getBonus();
    const penalty = this.getPenalty();
    const outcomeText =
      evaluation.status === "met"
        ? bonus
        : evaluation.status === "failed"
          ? penalty
          : this.t("NGH.Journey.Resolve.ManualRequired", "Manual resolution required (requirement text could not be parsed).");

    const result: JourneyRequirementResult = {
      status: evaluation.status,
      checks: evaluation.checks,
      outcomeText
    };
    await this.setRequirementResult(result);
    await (game as any).settings?.set(NGH_SYSTEM_ID, JOURNEY_PHASE_SETTING, "resolve" as JourneyPhase);

    const statusLabel =
      evaluation.status === "met"
        ? this.t("NGH.Journey.Resolve.StatusMet", "Requirements met")
        : evaluation.status === "failed"
          ? this.t("NGH.Journey.Resolve.StatusFailed", "Requirements failed")
          : this.t("NGH.Journey.Resolve.StatusUnknown", "Requirements unclear");

    await this.createChatMessage(
      this.t("NGH.Chat.Journey.ResolveTitle", "Journey Resolution"),
      [
        this.tf("NGH.Chat.Journey.ResolveStatus", { status: statusLabel }, `Status: ${statusLabel}`),
        ...evaluation.checks.map((line) => `- ${line}`),
        this.tf("NGH.Chat.Journey.ResolveOutcome", { outcome: outcomeText || this.t("NGH.Common.None", "none") }, `Outcome: ${outcomeText || "none"}`)
      ]
    );

    void this.render();
    broadcastJourneyUpdate("resolve");
  }
}