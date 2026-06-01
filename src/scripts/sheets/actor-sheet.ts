const NGH_SYSTEM_ID = "nghrpg";
const JOURNEY_PHASE_SETTING = "journeyPhase";
const JOURNEY_POOL_SETTING = "journeyPoolCards";
const JOURNEY_PLAYED_USERS_SETTING = "journeyPlayedUsers";

type NGHApi = {
  mechanics: {
    executeSkillTest: (options: Record<string, unknown>, rng?: () => number) => any;
    rollChallenge: (participants: Array<{ id: string; label: string; skillLevel: number; attributeValue: number }>, skill: string, difficulty: number, attributeOverride?: string) => { skill: string; difficulty: number; totalSuccesses: number; passed: boolean; participants: Array<{ id: string; label: string; successes: number; rolls: number[] }> };
    getSkillAttribute: (skill: string, attributeOverride?: string) => string;
    combat: {
      weapons: Record<string, { id: string; label: string; skill: string }>;
      getWeaponProfile: (weaponId: string) => { id: string; label: string; skill: string };
      resolveWeaponAttack: (options: Record<string, unknown>) => any;
      computeAttackPT: (targetKrzepa: number, targetArmor: number) => number;
    };
    cards: {
      getHand: (userId?: string) => string[];
      getJourneyHand: (userId?: string) => string[];
      maxHandSize: () => number;
      maxJourneyHandSize: () => number;
      parse: (card: string) => { code: string; label: string; suit: string; rank: string; score: number };
      draw: (userId?: string, count?: number) => Promise<any>;
      drawJourney: (userId?: string, count?: number) => Promise<any>;
      discard: (cards: string[], userId?: string) => Promise<any>;
      useJourney: (userId?: string, card?: string) => Promise<any>;
      useInitiative: (userId?: string, card?: string) => Promise<any>;
      burnForPlusOne: (card: string, userId?: string) => Promise<any>;
      burnForWhisper: (card: string, userId?: string) => Promise<any>;
      burnForHealing: (cards: string[], userId?: string) => Promise<any>;
      drawForCorruptionRisk: () => Promise<{ drewCard: string; isBlack: boolean; jokersSkipped: string[] }>;
      burnForElementalRitual: (userId?: string, card?: string) => Promise<{ source: "hand" | "top-deck"; card: string; isBlack: boolean; triggersCorruptionRisk: boolean }>;
      spendForAdvancement: (
        cards: string[],
        type: "attribute" | "skill-die" | "new-skill",
        currentRank: number,
        newSkillsAlreadyBought?: number,
        userId?: string,
        keptCard?: string
      ) => Promise<{ cards: string[]; hand: string[]; amount: number; effectBonus: number; sameColorDiscount: boolean; keptCard: string | null; triggersCorruptionRisk: boolean }>;
    };
  };
};

export class NGHActorSheet extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2
) {
  private _formSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private _scrollAbortController: AbortController | null = null;

  private t(key: string, fallback: string): string {
    const localized = game.i18n?.localize(key);
    return localized && localized !== key ? localized : fallback;
  }

  private tf(key: string, data: Record<string, unknown>, fallback: string): string {
    const localized = game.i18n?.format(key, data);
    return localized && localized !== key ? localized : fallback;
  }

  static override DEFAULT_OPTIONS = {
    classes: ["ngh", "sheet", "actor"],
    position: { width: 900, height: 980 },
    window: { resizable: true },
  };

  static override PARTS = {
    body: {
      template: "systems/nghrpg/templates/actor-sheet.html",
      scrollable: ["form.ngh"],
      forms: {
        "form.ngh": {
          handler: NGHActorSheet._onSubmitForm as any,
          submitOnChange: true,
          closeOnSubmit: false,
        },
      },
    },
  };

  protected static async _onSubmitForm(
    this: NGHActorSheet,
    event: SubmitEvent | Event,
    form: HTMLFormElement,
    formData: FormDataExtended
  ): Promise<void> {
    const updateData = foundry.utils.expandObject(formData.object);
    await this.actor.update(updateData);
  }

  override async close(options?: Record<string, unknown>): Promise<this> {
    if (this._formSaveTimer) {
      clearTimeout(this._formSaveTimer);
      this._formSaveTimer = null;
    }

    this._scrollAbortController?.abort();
    this._scrollAbortController = null;

    if (this.isEditable) {
      try {
        await this._persistOpenForm();
      } catch (error) {
        console.error("nghrpg | Failed to submit actor sheet before close", error);
      }
    }

    return super.close(options as any);
  }

  private async _persistOpenForm(): Promise<void> {
    const form = this.element.querySelector("form.ngh") as HTMLFormElement | null;
    if (!form) return;

    const formData = new FormDataExtended(form);
    const updateData = foundry.utils.expandObject(formData.object);
    await this.actor.update(updateData);
  }

  private _scheduleFormPersist(delayMs = 180): void {
    if (!this.isEditable) return;

    if (this._formSaveTimer) clearTimeout(this._formSaveTimer);
    this._formSaveTimer = setTimeout(() => {
      this._formSaveTimer = null;
      void this._persistOpenForm().catch((error: unknown) => {
        console.error("nghrpg | Failed to auto-save actor sheet form", error);
      });
    }, delayMs);
  }

  async _prepareContext(_options: any): Promise<any> {
    const api = (game as typeof game & { ngh?: NGHApi }).ngh;
    const userId = game.user?.id ?? "";
    const hand = api?.mechanics.cards.getHand(userId) ?? [];
    const journeyHand = api?.mechanics.cards.getJourneyHand(userId) ?? [];
    const parsedHand = hand.map(
      (card) => {
        const parsed = api?.mechanics.cards.parse(card) ?? { code: card, label: card, suit: "", rank: "", score: 0 };
        const isRed = parsed.suit === "H" || parsed.suit === "D" || parsed.suit === "R";
        return { ...parsed, suitColor: isRed ? "red" : "black" };
      }
    );
    const parsedJourneyHand = journeyHand.map(
      (card) => api?.mechanics.cards.parse(card) ?? { code: card, label: card, suit: "", rank: "", score: 0 }
    );
    const weaponProfiles = Object.values(api?.mechanics.combat.weapons ?? {});
    const journeyPhase = String((game as any).settings?.get(NGH_SYSTEM_ID, JOURNEY_PHASE_SETTING) ?? "configure");
    const canPlayJourneyCards = journeyPhase === "collect";
    const hasContributedToJourney = this.getJourneyPlayedUserIds().includes(userId);

    return {
      actor: this.actor,
      system: this.actor.system,
      cssClass: this.isEditable ? "editable" : "locked",
      systemId: NGH_SYSTEM_ID,
      canViewCorruption: game.user?.isGM ?? false,
      canTriggerCorruptionIncident: game.user?.isGM ?? false,
      playerHand: parsedHand,
      journeyHand: parsedJourneyHand,
      maxHandSize: api?.mechanics.cards.maxHandSize() ?? 7,
      maxJourneyHandSize: api?.mechanics.cards.maxJourneyHandSize() ?? 7,
      canPlayJourneyCards,
      canPlayBlindJourney: canPlayJourneyCards && hand.length === 0 && !hasContributedToJourney,
      weaponProfiles,
    };
  }

  protected override _onRender(_context: Record<string, unknown>, _options: Record<string, unknown>): void {
    const root = this.element;
    const form = root.querySelector("form.ngh") as HTMLFormElement | null;
    if (form) {
      form.addEventListener("input", () => this._scheduleFormPersist());
      form.addEventListener("change", () => this._scheduleFormPersist(0));
    }

    // Keyboard scroll support (PageUp/PageDown/arrows). Attach only once per open.
    if (!this._scrollAbortController) {
      this._scrollAbortController = new AbortController();
      const { signal } = this._scrollAbortController;

      root.addEventListener("keydown", (e: KeyboardEvent) => {
        const focused = document.activeElement;
        // Don't intercept when typing in an input, textarea, or select
        if (focused && (focused.tagName === "INPUT" || focused.tagName === "TEXTAREA" || focused.tagName === "SELECT")) return;
        // Only act when focus is inside this sheet
        if (focused && !root.contains(focused)) return;
        const scroller = root.querySelector("form.ngh") as HTMLElement | null;
        if (!scroller) return;
        const step = 72;
        const page = scroller.clientHeight * 0.85;
        switch (e.key) {
          case "ArrowDown": scroller.scrollBy({ top: step, behavior: "smooth" }); e.preventDefault(); break;
          case "ArrowUp":   scroller.scrollBy({ top: -step, behavior: "smooth" }); e.preventDefault(); break;
          case "PageDown":  scroller.scrollBy({ top: page, behavior: "smooth" }); e.preventDefault(); break;
          case "PageUp":    scroller.scrollBy({ top: -page, behavior: "smooth" }); e.preventDefault(); break;
          case "Home":      scroller.scrollTo({ top: 0, behavior: "smooth" }); e.preventDefault(); break;
          case "End":       scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" }); e.preventDefault(); break;
        }
      }, { signal });
    }

    const run = (action: () => Promise<void>): void => {
      void action().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : this.t("NGH.Error.ActionFailed", "Action failed");
        console.error("nghrpg | Actor sheet action failed", error);
        ui.notifications?.error(message);
      });
    };

    root.querySelector("[data-action='draw-card']")?.addEventListener("click", () => {
      run(() => this._doDrawCard());
    });

    root.querySelector("[data-action='draw-journey-card']")?.addEventListener("click", () => {
      run(() => this._doDrawJourneyCard());
    });

    root.querySelector("[data-action='play-blind-journey']")?.addEventListener("click", () => {
      run(() => this._doJourneyCard());
    });

    root.querySelectorAll("[data-action='discard-card']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const card = (e.currentTarget as HTMLElement).dataset.card ?? "";
        run(() => this._doDiscardCard(card));
      });
    });

    root.querySelectorAll("[data-action='initiative-card']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const card = (e.currentTarget as HTMLElement).dataset.card ?? "";
        run(() => this._doInitiativeCard(card));
      });
    });

    root.querySelectorAll("[data-action='journey-card']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const card = (e.currentTarget as HTMLElement).dataset.card ?? "";
        run(() => this._doJourneyCard(card));
      });
    });

    root.querySelectorAll("[data-action='burn-plus-one']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const card = (e.currentTarget as HTMLElement).dataset.card ?? "";
        run(() => this._doBurnCard(card, "plus-one"));
      });
    });

    root.querySelectorAll("[data-action='burn-whisper']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const card = (e.currentTarget as HTMLElement).dataset.card ?? "";
        run(() => this._doBurnCard(card, "whisper"));
      });
    });

    root.querySelectorAll("[data-action='heal-card']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const card = (e.currentTarget as HTMLElement).dataset.card ?? "";
        run(() => this._doHealCard(card));
      });
    });

    root.querySelectorAll("[data-action='defend-card']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const card = (e.currentTarget as HTMLElement).dataset.card ?? "";
        run(() => this._doDefendCard(card));
      });
    });

    root.querySelectorAll("[data-action='skill-test']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const skill = (e.currentTarget as HTMLElement).dataset.skill ?? "";
        run(() => this._doSkillTest(skill));
      });
    });

    root.querySelectorAll("[data-action='challenge-test']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const skill = (e.currentTarget as HTMLElement).dataset.skill ?? "";
        run(() => this._doChallengeTest(skill));
      });
    });

    root.querySelector("[data-action='weapon-attack']")?.addEventListener("click", () => {
      run(() => this._doWeaponAttack());
    });

    root.querySelector("[data-action='elemental-ritual']")?.addEventListener("click", () => {
      run(() => this._doElementalRitual());
    });

    root.querySelector("[data-action='officer-share']")?.addEventListener("click", () => {
      run(() => this._doOfficerShareCards());
    });

    root.querySelector("[data-action='ally-black-card-corruption']")?.addEventListener("click", () => {
      run(() => this._doAllyBlackCardCorruption());
    });

    root.querySelector("[data-action='grove-corruption']")?.addEventListener("click", () => {
      run(() => this._doGroveCorruption());
    });

    root.querySelector("[data-action='gm-corruption-incident']")?.addEventListener("click", () => {
      run(() => this._doGMCorruptionIncident());
    });

    root.querySelectorAll("[data-action='advance-attribute']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const attribute = (e.currentTarget as HTMLElement).dataset.attribute ?? "";
        run(() => this._doAdvanceAttribute(attribute));
      });
    });

    root.querySelectorAll("[data-action='advance-skill']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const skill = (e.currentTarget as HTMLElement).dataset.skill ?? "";
        run(() => this._doAdvanceSkill(skill));
      });
    });

    root.querySelectorAll("[data-action='advance-whisper']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const whisper = (e.currentTarget as HTMLElement).dataset.whisper ?? "";
        run(() => this._doAdvanceWhisper(whisper));
      });
    });

    root.querySelectorAll("[data-action='cast-whisper']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const whisper = (e.currentTarget as HTMLElement).dataset.whisper ?? "";
        run(() => this._doCastWhisper(whisper));
      });
    });
  }

  private get api(): NGHApi {
    const api = (game as typeof game & { ngh?: NGHApi }).ngh;
    if (!api) throw new Error(this.t("NGH.Error.ApiUnavailable", "NGH API is not available"));
    return api;
  }

  private get userId(): string {
    const userId = game.user?.id ?? "";
    if (!userId) throw new Error(this.t("NGH.Error.MissingActiveUser", "Missing active user"));
    return userId;
  }

  private getJourneyPlayedUserIds(): string[] {
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

  private getCorruptionWhisperRecipients(): string[] {
    return this.getPrivateWhisperRecipients();
  }

  private getPrivateWhisperRecipients(userId: string = game.user?.id ?? ""): string[] {
    const recipients = new Set<string>();
    const gmRecipients = ((ChatMessage as any).getWhisperRecipients?.("GM") ?? []) as Array<{ id?: string }>;
    for (const recipient of gmRecipients) {
      if (recipient?.id) recipients.add(String(recipient.id));
    }
    if (userId) recipients.add(userId);
    return [...recipients];
  }

  private async createChatMessage(title: string, lines: string[], options: { whisper?: string[] } = {}): Promise<void> {
    const messageData: Record<string, unknown> = {
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: [`<h3>${title}</h3>`, ...lines.map((line) => `<p>${line}</p>`)].join(""),
    };
    if (options.whisper?.length) messageData.whisper = options.whisper;
    await ChatMessage.create(messageData as any);
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  private async promptNumber(message: string, fallback: number): Promise<number | null> {
    const value = await this.promptText(message, String(fallback));
    if (value === null) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private async promptText(message: string, fallback = ""): Promise<string | null> {
    const safeMessage = this.escapeHtml(message).replace(/\n/g, "<br />");
    const safeFallback = this.escapeHtml(fallback);
    const result = await foundry.applications.api.DialogV2.prompt({
      window: { title: this.t("NGH.Dialog.InputTitle", "Input") } as any,
      content: `<form class="ngh-dialog"><p>${safeMessage}</p><input type="text" name="value" value="${safeFallback}" /></form>`,
      ok: {
        label: game.i18n?.localize("OK") ?? "OK",
        callback: (_event, _button, dialog) => {
          const dialogRoot = this.getDialogRoot(dialog);
          const input = dialogRoot?.querySelector("input[name='value']") as HTMLInputElement | null;
          return input?.value ?? "";
        },
      },
      rejectClose: false,
    });

    if (result === null) return null;
    return String(result);
  }

  private getDialogRoot(dialog: unknown): HTMLElement | null {
    if (dialog instanceof HTMLElement) return dialog;
    if ((dialog as any)?.element instanceof HTMLElement) return (dialog as any).element;
    if ((dialog as any)?.element?.[0] instanceof HTMLElement) return (dialog as any).element[0];
    return null;
  }

  private async promptConfirm(message: string): Promise<boolean> {
    const safeMessage = this.escapeHtml(message).replace(/\n/g, "<br />");
    const result = await foundry.applications.api.DialogV2.confirm({
      window: { title: this.t("NGH.Dialog.ConfirmTitle", "Confirm") } as any,
      content: `<p>${safeMessage}</p>`,
      yes: { action: "yes", label: game.i18n?.localize("Yes") ?? "Yes", default: true },
      no: { action: "no", label: game.i18n?.localize("No") ?? "No" },
      rejectClose: false,
    });
    return result === true;
  }

  private async promptPostRollModifiers(
    rolls: number[],
    budgetRemaining: number
  ): Promise<{ rerollIndices: number[]; increaseIndices: number[] }> {
    if (rolls.length < 1) {
      await foundry.applications.api.DialogV2.prompt({
        window: { title: this.t("NGH.Dialog.PostRollTitle", "Post-roll modifiers") } as any,
        content: `<p>${this.t("NGH.PostRoll.NoDice", "No dice in test. Post-roll modifiers cannot be applied.")}</p>`,
        ok: { label: game.i18n?.localize("OK") ?? "OK" },
        rejectClose: false,
      });
      return { rerollIndices: [], increaseIndices: [] };
    }

    if (budgetRemaining < 1) {
      await foundry.applications.api.DialogV2.prompt({
        window: { title: this.t("NGH.Dialog.PostRollTitle", "Post-roll modifiers") } as any,
        content: `<p>${this.t("NGH.PostRoll.NoBudget", "No post-roll budget (0). Reroll and +1 are unavailable.")}</p>`,
        ok: { label: game.i18n?.localize("OK") ?? "OK" },
        rejectClose: false,
      });
      return { rerollIndices: [], increaseIndices: [] };
    }

    const rows = rolls
      .map((value, idx) => {
        return `<tr>
          <td style="padding:4px 8px; text-align:center;">${idx}</td>
          <td style="padding:4px 8px; text-align:center;"><strong>${value}</strong></td>
          <td style="padding:4px 8px; text-align:center;"><input type="checkbox" name="reroll" value="${idx}" /></td>
          <td style="padding:4px 8px; text-align:center;"><input type="checkbox" name="increase" value="${idx}" /></td>
        </tr>`;
      })
      .join("");

    const result = await foundry.applications.api.DialogV2.prompt({
      window: { title: this.t("NGH.Dialog.PostRollTitle", "Post-roll modifiers") } as any,
      content: `<form class="ngh-dialog">
        <p><strong>${this.t("NGH.PostRoll.BudgetLabel", "Post-roll budget")}:</strong> ${budgetRemaining}</p>
        <p>${this.t("NGH.PostRoll.Help", "Reroll costs 1 total. +1 costs 1 per selected die.")}</p>
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr>
              <th style="padding:4px 8px; text-align:center;">${this.t("NGH.PostRoll.Table.Index", "Index")}</th>
              <th style="padding:4px 8px; text-align:center;">${this.t("NGH.PostRoll.Table.Roll", "Roll")}</th>
              <th style="padding:4px 8px; text-align:center;">${this.t("NGH.PostRoll.Table.Reroll", "Reroll")}</th>
              <th style="padding:4px 8px; text-align:center;">${this.t("NGH.PostRoll.Table.IncreaseBonus", "+1")}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </form>`,
      ok: {
        label: game.i18n?.localize("OK") ?? "OK",
        callback: (_event, _button, dialog) => {
          const root = this.getDialogRoot(dialog);
          const reroll = Array.from(root?.querySelectorAll("input[name='reroll']:checked") ?? [])
            .map((input) => Number.parseInt((input as HTMLInputElement).value, 10))
            .filter((value) => Number.isFinite(value));
          const increase = Array.from(root?.querySelectorAll("input[name='increase']:checked") ?? [])
            .map((input) => Number.parseInt((input as HTMLInputElement).value, 10))
            .filter((value) => Number.isFinite(value));

          return {
            rerollIndices: [...new Set(reroll)],
            increaseIndices: [...new Set(increase)]
          };
        },
      },
      rejectClose: false,
    });

    const rerollIndices = Array.isArray(result?.rerollIndices) ? result.rerollIndices : [];
    const increaseIndicesRaw = Array.isArray(result?.increaseIndices) ? result.increaseIndices : [];

    const rerollCost = rerollIndices.length > 0 ? 1 : 0;
    const increaseBudget = Math.max(0, budgetRemaining - rerollCost);
    const increaseIndices = increaseIndicesRaw.slice(0, increaseBudget);
    if (increaseIndicesRaw.length > increaseIndices.length) {
      ui.notifications?.warn(this.t("NGH.PostRoll.TrimmedWarning", "+1 selections were reduced to fit available post-roll budget."));
    }

    return { rerollIndices, increaseIndices };
  }

  private createReplayRng(initialRolls: number[]): () => number {
    let idx = 0;
    return () => {
      if (idx < initialRolls.length) {
        const roll = Math.max(1, Math.min(6, Math.floor(initialRolls[idx])));
        idx += 1;
        return (roll - 0.5) / 6;
      }

      return Math.random();
    };
  }

  private async promptCardSelection(title: string, hint: string, hand: string[]): Promise<string[] | null> {
    if (hand.length === 0) {
      await foundry.applications.api.DialogV2.prompt({
        window: { title } as any,
        content: `<p>${this.t("NGH.Advancement.NoCardsInHand", "No cards in hand.")}</p>`,
        ok: { label: game.i18n?.localize("OK") ?? "OK" },
        rejectClose: false,
      });
      return null;
    }

    const rows = hand
      .map((card) => {
        const parsed = this.api.mechanics.cards.parse(card);
        const isRed = parsed.suit === "H" || parsed.suit === "D" || parsed.suit === "R";
        const color = isRed ? "#aa2222" : "#222";
        return `<tr>
          <td style="padding:4px 8px;"><input type="checkbox" name="card" value="${card}" /></td>
          <td style="padding:4px 8px; color:${color};">${parsed.label}</td>
        </tr>`;
      })
      .join("");

    const result = await foundry.applications.api.DialogV2.prompt({
      window: { title } as any,
      content: `<form class="ngh-dialog">
        <p>${hint}</p>
        <table style="width:100%; border-collapse:collapse;">
          <thead><tr>
            <th style="padding:4px 8px;">${this.t("NGH.Advancement.Select", "Select")}</th>
            <th style="padding:4px 8px;">${this.t("NGH.Advancement.Card", "Card")}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </form>`,
      ok: {
        label: game.i18n?.localize("OK") ?? "OK",
        callback: (_event, _button, dialog) => {
          const root = this.getDialogRoot(dialog);
          return Array.from(root?.querySelectorAll("input[name='card']:checked") ?? [])
            .map((input) => (input as HTMLInputElement).value);
        },
      },
      rejectClose: false,
    });

    if (!result || !Array.isArray(result) || result.length === 0) return null;
    return result as string[];
  }

  private async _promptKeepCard(cards: string[]): Promise<string | null> {
    const rows = cards
      .map((card) => {
        const parsed = this.api.mechanics.cards.parse(card);
        const isRed = parsed.suit === "H" || parsed.suit === "D" || parsed.suit === "R";
        const color = isRed ? "#aa2222" : "#222";
        return `<tr>
          <td style="padding:4px 8px;"><input type="radio" name="card" value="${card}" ${card === cards[0] ? "checked" : ""} /></td>
          <td style="padding:4px 8px; color:${color};">${parsed.label}</td>
        </tr>`;
      })
      .join("");

    const result = await foundry.applications.api.DialogV2.prompt({
      window: { title: this.t("NGH.Advancement.ChooseCardToKeep", "Choose card to keep") } as any,
      content: `<form class="ngh-dialog">
        <p>${this.t("NGH.Advancement.ChooseCardToKeepHint", "All selected cards are the same color — choose which card to keep (it will not be spent):")}</p>
        <table style="width:100%; border-collapse:collapse;">
          <thead><tr>
            <th style="padding:4px 8px;">${this.t("NGH.Advancement.Keep", "Keep")}</th>
            <th style="padding:4px 8px;">${this.t("NGH.Advancement.Card", "Card")}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </form>`,
      ok: {
        label: game.i18n?.localize("OK") ?? "OK",
        callback: (_event, _button, dialog) => {
          const root = this.getDialogRoot(dialog);
          const checked = root?.querySelector("input[name='card']:checked") as HTMLInputElement | null;
          return checked?.value ?? null;
        },
      },
      rejectClose: false,
    });

    if (!result || typeof result !== "string") return null;
    return result;
  }

  private _wouldGetSameColorDiscount(cards: string[], baseCost: number): boolean {
    if (cards.length < baseCost) return false;
    const getColor = (card: string): "red" | "black" => {
      if (card === "RJ") return "red";
      if (card === "BJ") return "black";
      const suit = card.slice(-1);
      return suit === "H" || suit === "D" ? "red" : "black";
    };
    const firstBatch = cards.slice(0, baseCost);
    const color = getColor(firstBatch[0]);
    return firstBatch.every((c) => getColor(c) === color);
  }

  private async _doAdvanceAttribute(attributeKey: string): Promise<void> {
    const system = this.actor.system as any;
    const attr = system.attributes?.[attributeKey];
    if (!attr) throw new Error(this.t("NGH.Error.CardCodeRequired", "Unknown attribute"));
    const currentMax = Number(attr.max ?? 1);
    if (currentMax >= 10) {
      ui.notifications?.warn(this.t("NGH.Advancement.AtMaximum", "Already at maximum."));
      return;
    }

    const baseCost = (currentMax + 1) + 1;
    const hand = this.api.mechanics.cards.getHand(this.userId);
    const hint = this.tf("NGH.Advancement.AttributeHint", {
      attr: attributeKey, current: currentMax, next: currentMax + 1, cost: baseCost
    }, `Advance ${attributeKey}: ${currentMax} → ${currentMax + 1}. Cost: ${baseCost} red cards. Same color (all red): keep 1 back. All faces/aces: +1 extra.`);

    const selectedCards = await this.promptCardSelection(
      this.t("NGH.Advancement.AdvanceAttribute", "Advance Attribute"), hint, hand
    );
    if (!selectedCards) return;

    let keptCard: string | undefined;
    if (this._wouldGetSameColorDiscount(selectedCards, baseCost)) {
      const chosen = await this._promptKeepCard(selectedCards.slice(0, baseCost));
      if (!chosen) return;
      keptCard = chosen;
    }

    const result = await this.api.mechanics.cards.spendForAdvancement(selectedCards, "attribute", currentMax, 0, this.userId, keptCard);
    const newMax = currentMax + 1 + result.effectBonus;
    await (this.actor as any).update({ [`system.attributes.${attributeKey}.max`]: newMax });
    void this.render();

    await this.createChatMessage(this.t("NGH.Chat.Advancement.Title", "Advancement"), [
      this.tf("NGH.Chat.Advancement.Attribute", { attr: attributeKey, from: currentMax, to: newMax }, `${attributeKey}: ${currentMax} → ${newMax}`),
      this.tf("NGH.Chat.Advancement.Spent", { cards: result.cards.join(", ") }, `Spent: ${result.cards.join(", ")}`),
      result.sameColorDiscount && result.keptCard ? this.tf("NGH.Chat.Advancement.SameColorKept", { card: result.keptCard }, `Same color — kept: ${result.keptCard}`) : "",
      result.effectBonus > 0 ? this.t("NGH.Chat.Advancement.FacesBonus", "All faces/aces — effect +1!") : "",
    ].filter(Boolean), { whisper: this.getPrivateWhisperRecipients(this.userId) });
    if (result.triggersCorruptionRisk) {
      await this._doCorruptionRiskCheck(this.t("NGH.CorruptionRisk.Reason.BlackJokerAdvancement", "Black Joker — Advancement"));
    }
  }

  private async _doAdvanceSkill(skillKey: string): Promise<void> {
    const system = this.actor.system as any;
    const skill = system.skills?.[skillKey];
    if (!skill) throw new Error(this.t("NGH.Error.SkillKeyRequired", "Unknown skill"));

    if (!skill.trained) {
      const alreadyBought = await this.promptNumber(
        this.t("NGH.Prompt.NewSkillsAlreadyBought", "New skills bought this session (before this one)?"), 0
      );
      if (alreadyBought === null) return;

      const baseCost = 1 + (alreadyBought + 1);
      const hand = this.api.mechanics.cards.getHand(this.userId);
      const hint = this.tf("NGH.Advancement.NewSkillHint", { skill: skillKey, cost: baseCost },
        `Acquire ${skillKey}. Cost: ${baseCost} cards. All faces/aces: starts at rank 1.`);
      const selectedCards = await this.promptCardSelection(
        this.t("NGH.Advancement.AcquireSkill", "Acquire Skill"), hint, hand
      );
      if (!selectedCards) return;

      let keptCard: string | undefined;
      if (this._wouldGetSameColorDiscount(selectedCards, baseCost)) {
        const chosen = await this._promptKeepCard(selectedCards.slice(0, baseCost));
        if (!chosen) return;
        keptCard = chosen;
      }

      const result = await this.api.mechanics.cards.spendForAdvancement(selectedCards, "new-skill", 0, alreadyBought, this.userId, keptCard);
      const newRank = result.effectBonus;
      await (this.actor as any).update({ [`system.skills.${skillKey}.trained`]: true, [`system.skills.${skillKey}.rank`]: newRank });
      void this.render();

      await this.createChatMessage(this.t("NGH.Chat.Advancement.Title", "Advancement"), [
        this.tf("NGH.Chat.Advancement.NewSkill", { skill: skillKey, rank: newRank }, `New skill: ${skillKey} (rank ${newRank})`),
        this.tf("NGH.Chat.Advancement.Spent", { cards: result.cards.join(", ") }, `Spent: ${result.cards.join(", ")}`),
        result.sameColorDiscount && result.keptCard ? this.tf("NGH.Chat.Advancement.SameColorKept", { card: result.keptCard }, `Same color — kept: ${result.keptCard}`) : "",
        result.effectBonus > 0 ? this.t("NGH.Chat.Advancement.FacesBonus", "Faces/aces — starts at rank 1!") : "",
      ].filter(Boolean), { whisper: this.getPrivateWhisperRecipients(this.userId) });
      if (result.triggersCorruptionRisk) {
        await this._doCorruptionRiskCheck(this.t("NGH.CorruptionRisk.Reason.BlackJokerAdvancement", "Black Joker — Advancement"));
      }
      return;
    }

    const currentRank = Number(skill.rank ?? 0);
    if (currentRank >= 5) {
      ui.notifications?.warn(this.t("NGH.Advancement.AtMaximum", "Already at maximum."));
      return;
    }

    const baseCost = (currentRank + 1) + 1;
    const hand = this.api.mechanics.cards.getHand(this.userId);
    const hint = this.tf("NGH.Advancement.SkillDieHint", { skill: skillKey, current: currentRank, next: currentRank + 1, cost: baseCost },
      `Advance ${skillKey}: rank ${currentRank} → ${currentRank + 1}. Cost: ${baseCost} cards.`);
    const selectedCards = await this.promptCardSelection(
      this.t("NGH.Advancement.AdvanceSkill", "Advance Skill"), hint, hand
    );
    if (!selectedCards) return;

    let keptCard: string | undefined;
    if (this._wouldGetSameColorDiscount(selectedCards, baseCost)) {
      const chosen = await this._promptKeepCard(selectedCards.slice(0, baseCost));
      if (!chosen) return;
      keptCard = chosen;
    }

    const result = await this.api.mechanics.cards.spendForAdvancement(selectedCards, "skill-die", currentRank, 0, this.userId, keptCard);
    const newRank = Math.min(5, currentRank + 1 + result.effectBonus);
    await (this.actor as any).update({ [`system.skills.${skillKey}.rank`]: newRank });
    void this.render();

    await this.createChatMessage(this.t("NGH.Chat.Advancement.Title", "Advancement"), [
      this.tf("NGH.Chat.Advancement.Skill", { skill: skillKey, from: currentRank, to: newRank }, `${skillKey}: rank ${currentRank} → ${newRank}`),
      this.tf("NGH.Chat.Advancement.Spent", { cards: result.cards.join(", ") }, `Spent: ${result.cards.join(", ")}`),
      result.sameColorDiscount && result.keptCard ? this.tf("NGH.Chat.Advancement.SameColorKept", { card: result.keptCard }, `Same color — kept: ${result.keptCard}`) : "",
      result.effectBonus > 0 ? this.t("NGH.Chat.Advancement.FacesBonus", "All faces/aces — effect +1!") : "",
    ].filter(Boolean), { whisper: this.getPrivateWhisperRecipients(this.userId) });
    if (result.triggersCorruptionRisk) {
      await this._doCorruptionRiskCheck(this.t("NGH.CorruptionRisk.Reason.BlackJokerAdvancement", "Black Joker — Advancement"));
    }
  }

  private async _doAdvanceWhisper(whisperKey: string): Promise<void> {
    const system = this.actor.system as any;
    const whisper = system.whispers?.[whisperKey];
    if (!whisper) throw new Error(this.t("NGH.Error.CardCodeRequired", "Unknown whisper path"));

    const currentRank = Number(whisper.rank ?? 0);
    if (currentRank >= 5) {
      ui.notifications?.warn(this.t("NGH.Advancement.AtMaximum", "Already at maximum."));
      return;
    }

    const baseCost = (currentRank + 1) + 1;
    const hand = this.api.mechanics.cards.getHand(this.userId);
    const pathName = String(whisper.name || whisperKey);
    const hint = this.tf("NGH.Advancement.WhisperHint", { path: pathName, current: currentRank, next: currentRank + 1, cost: baseCost },
      `Advance whisper ${pathName}: rank ${currentRank} → ${currentRank + 1}. Cost: ${baseCost} cards.`);
    const selectedCards = await this.promptCardSelection(
      this.t("NGH.Advancement.AdvanceWhisper", "Advance Whisper Path"), hint, hand
    );
    if (!selectedCards) return;

    let keptCard: string | undefined;
    if (this._wouldGetSameColorDiscount(selectedCards, baseCost)) {
      const chosen = await this._promptKeepCard(selectedCards.slice(0, baseCost));
      if (!chosen) return;
      keptCard = chosen;
    }

    const result = await this.api.mechanics.cards.spendForAdvancement(selectedCards, "skill-die", currentRank, 0, this.userId, keptCard);
    const newRank = Math.min(5, currentRank + 1 + result.effectBonus);
    await (this.actor as any).update({ [`system.whispers.${whisperKey}.rank`]: newRank });
    void this.render();

    await this.createChatMessage(this.t("NGH.Chat.Advancement.Title", "Advancement"), [
      this.tf("NGH.Chat.Advancement.Whisper", { path: pathName, from: currentRank, to: newRank }, `Whisper ${pathName}: rank ${currentRank} → ${newRank}`),
      this.tf("NGH.Chat.Advancement.Spent", { cards: result.cards.join(", ") }, `Spent: ${result.cards.join(", ")}`),
      result.sameColorDiscount && result.keptCard ? this.tf("NGH.Chat.Advancement.SameColorKept", { card: result.keptCard }, `Same color — kept: ${result.keptCard}`) : "",
      result.effectBonus > 0 ? this.t("NGH.Chat.Advancement.FacesBonus", "All faces/aces — effect +1!") : "",
    ].filter(Boolean), { whisper: this.getPrivateWhisperRecipients(this.userId) });

    if (result.triggersCorruptionRisk) {
      await this._doCorruptionRiskCheck(this.t("NGH.CorruptionRisk.Reason.BlackJokerAdvancement", "Black Joker — Advancement"));
    }

    if (newRank >= 3) {
      await this._doCorruptionRiskCheck(
        this.tf("NGH.CorruptionRisk.Reason.WhisperAdvancement", { path: pathName, rank: newRank }, `Whisper ${pathName} advanced to rank ${newRank}`)
      );
    }
  }

  private async _doCastWhisper(whisperKey: string): Promise<void> {
    const system = this.actor.system as any;
    const whisper = system.whispers?.[whisperKey];
    if (!whisper) throw new Error(this.t("NGH.Error.CardCodeRequired", "Unknown whisper path"));

    const rank = Number(whisper.rank ?? 0);
    if (rank < 1) {
      ui.notifications?.warn(this.t("NGH.Whisper.Cast.NotLearned", "This whisper path has not been learned yet."));
      return;
    }

    const pathName = String(whisper.name || whisperKey);
    const pathAttribute = String(whisper.attribute || "spryt").toLowerCase();

    // Step 1+2: Prompt spell name and select cost card from hand
    const hand = this.api.mechanics.cards.getHand(this.userId);
    const spellName = await this.promptText(
      this.tf("NGH.Whisper.Cast.SpellPrompt", { path: pathName },
        `Spell name for path "${pathName}" (leave blank to skip narrative step):`),
      ""
    );
    if (spellName === null) return;

    const costCards = await this.promptCardSelection(
      this.t("NGH.Whisper.Cast.CostTitle", "Pay Whisper Cost"),
      this.tf("NGH.Whisper.Cast.CostHint", { path: pathName },
        `Select 1 card from hand to burn as whisper casting cost for path "${pathName}".`),
      hand
    );
    if (!costCards || costCards.length < 1) return;

    const costCard = costCards[0];
    const burnResult = await this.api.mechanics.cards.burnForWhisper(costCard, this.userId);
    void this.render();

    // Step 3: Whisper skill test
    const difficulty = await this.promptNumber(this.t("NGH.Prompt.Difficulty", "Difficulty (PT)"), 2);
    if (difficulty === null) return;

    const bonusDice = await this.promptNumber(this.t("NGH.Prompt.BonusDice", "Bonus dice to buy before roll"), 0);
    if (bonusDice === null) return;

    const attributeKey = this.api.mechanics.getSkillAttribute("szepty", pathAttribute);
    const attributeValue = Number(system.attributes?.[attributeKey]?.value ?? 0);
    const szeptySkill = system.skills?.szepty;

    const baseOptions = {
      skill: "szepty",
      difficulty,
      skillLevel: Number(szeptySkill?.rank ?? 0),
      attributeValue,
      attributeOverride: pathAttribute,
      bonusDice,
      temporaryTraining: false,
    };

    const preview = this.api.mechanics.executeSkillTest(baseOptions);
    const post = await this.promptPostRollModifiers(preview.rollsBeforePost, preview.modifiers.remaining);
    const result = this.api.mechanics.executeSkillTest(
      { ...baseOptions, rerollIndices: post.rerollIndices, increaseIndices: post.increaseIndices },
      this.createReplayRng(preview.rollsBeforePost)
    );

    const sacrificeNote = await this.promptText(
      this.t("NGH.Whisper.Cast.SacrificePrompt", "Additional sacrifice or path-specific cost notes (leave blank if none):"),
      ""
    );
    if (sacrificeNote === null) return;

    const effectNote = await this.promptText(
      this.t("NGH.Whisper.Cast.EffectPrompt", "Manual effect / outcome notes (leave blank if not resolved now):"),
      ""
    );
    if (effectNote === null) return;

    // Steps 4+5: Post combined chat message
    const chatLines: string[] = [
      this.tf("NGH.Chat.WhisperCast.Path", { path: pathName }, `Path: ${pathName}`),
    ];
    if (spellName.trim()) {
      chatLines.push(this.tf("NGH.Chat.WhisperCast.Spell", { spell: spellName.trim() }, `Spell: ${spellName.trim()}`));
    }
    chatLines.push(
      this.t("NGH.Chat.WhisperCast.CostPaidHidden", "Card cost paid privately."),
      burnResult.triggersCorruptionRisk
        ? this.t("NGH.Chat.WhisperCast.CorruptionRiskPrivate", "Corruption risk resolved privately.")
        : "",
      this.tf("NGH.Chat.SkillTest.Attribute", { attribute: attributeKey }, `Attribute: ${attributeKey}`),
      this.tf("NGH.Chat.SkillTest.RollsFinal", { rolls: result.rollsAfterPost.join(", ") }, `Rolls: ${result.rollsAfterPost.join(", ")}`),
      this.tf("NGH.Chat.SkillTest.Successes", { successes: result.successes, difficulty }, `Successes: ${result.successes}/${difficulty}`),
      result.passed
        ? this.t("NGH.Chat.Result.Success", "Result: success")
        : this.t("NGH.Chat.WhisperCast.Failed", "Result: failure — consider additional sacrifice (path-specific)."),
      sacrificeNote.trim()
        ? this.tf("NGH.Chat.WhisperCast.Sacrifice", { sacrifice: sacrificeNote.trim() }, `Additional sacrifice: ${sacrificeNote.trim()}`)
        : this.t("NGH.Chat.WhisperCast.SacrificeNone", "Additional sacrifice: none recorded."),
      effectNote.trim()
        ? this.tf("NGH.Chat.WhisperCast.ManualEffect", { effect: effectNote.trim() }, `Manual effect: ${effectNote.trim()}`)
        : this.t("NGH.Chat.WhisperCast.ManualEffectPending", "Manual effect: resolve from path text / GM ruling."),
    );

    await this.createChatMessage(
      this.t("NGH.Chat.WhisperCast.Title", "Whisper Cast"),
      chatLines.filter(Boolean)
    );

    if (burnResult.triggersCorruptionRisk) {
      await this._doCorruptionRiskCheck(
        this.tf("NGH.CorruptionRisk.Reason.WhisperBurn", { path: pathName }, `Whisper burn — Black Joker (${pathName})`)
      );
    }
  }

  private async _doCorruptionRiskCheck(reason: string): Promise<void> {
    const riskResult = await this.api.mechanics.cards.drawForCorruptionRisk();

    if (riskResult.isBlack) {
      const system = this.actor.system as any;
      const current = Number(system.corruption ?? 0);
      await (this.actor as any).update({ "system.corruption": Math.min(5, current + 1) });
    }

    const lines: string[] = [
      this.tf("NGH.Chat.CorruptionRisk.Reason", { reason }, `Reason: ${reason}`),
      ...riskResult.jokersSkipped.map((joker) =>
        this.tf("NGH.Chat.CorruptionRisk.JokerSkipped", { joker }, `Joker skipped: ${joker}`)
      ),
      this.tf("NGH.Chat.CorruptionRisk.Card", { card: riskResult.drewCard || "?" }, `Card drawn: ${riskResult.drewCard || "?"}`),
      riskResult.isBlack
        ? this.t("NGH.Chat.CorruptionRisk.Black", "Black card — Corruption +1")
        : this.t("NGH.Chat.CorruptionRisk.Red", "Red card — no corruption."),
    ];

    await this.createChatMessage(this.t("NGH.Chat.CorruptionRisk.Title", "Corruption Risk"), lines, {
      whisper: this.getCorruptionWhisperRecipients()
    });
    void this.render();
  }

  private async _doElementalRitual(): Promise<void> {
    const hand = this.api.mechanics.cards.getHand(this.userId);
    let selectedCard: string | undefined;

    if (hand.length > 0) {
      const selected = await this.promptCardSelection(
        this.t("NGH.Action.ElementalRitual", "Elemental Ritual"),
        this.t("NGH.ElementalRitual.SelectCostCard", "Select a card to pay Elemental Ritual cost."),
        hand
      );
      if (!selected || selected.length < 1) return;
      selectedCard = selected[0];
    }

    const result = await this.api.mechanics.cards.burnForElementalRitual(this.userId, selectedCard);
    const lines: string[] = [
      result.card
        ? this.tf(
            result.source === "top-deck" ? "NGH.Chat.ElementalRitual.Drew" : "NGH.Chat.ElementalRitual.Paid",
            { card: result.card },
            result.source === "top-deck" ? `Drew from deck: ${result.card}` : `Discarded from hand: ${result.card}`
          )
        : this.t("NGH.Chat.ElementalRitual.NoDraw", "No card available in deck."),
    ];
    if (result.card) {
      lines.push(
        result.source === "top-deck"
          ? (
              result.isBlack
                ? this.t("NGH.Chat.ElementalRitual.Black", "Black card — Corruption Risk triggered.")
                : this.t("NGH.Chat.ElementalRitual.Red", "Red card — no corruption risk.")
            )
          : this.t("NGH.Chat.ElementalRitual.FromHand", "Cost paid from hand.")
      );
    }
    await this.createChatMessage(this.t("NGH.Chat.ElementalRitual.Title", "Elemental Ritual"), lines, {
      whisper: this.getPrivateWhisperRecipients(this.userId)
    });
    if (result.triggersCorruptionRisk) {
      await this._doCorruptionRiskCheck(
        result.source === "hand" && result.card === "BJ"
          ? this.t("NGH.CorruptionRisk.Reason.BlackJokerElementalRitual", "Black Joker — Elemental Ritual")
          : this.t("NGH.CorruptionRisk.Reason.ElementalRitual", "Elemental Ritual — no cards in hand")
      );
    }
    void this.render();
  }

  private async _doOfficerShareCards(): Promise<void> {
    const players = Array.from(((game as any).users?.contents ?? []) as any[])
      .filter((u: any) => u?.id && !u.isGM && u.active)
      .map((u: any) => ({ id: String(u.id), name: String(u.name ?? u.id) }));

    if (players.length === 0) {
      ui.notifications?.warn(this.t("NGH.Officer.NoActivePlayers", "No active players found."));
      return;
    }

    const playerList = players.map((player) => player.name).join(", ");
    const confirmed = await this.promptConfirm(
      this.t(
        "NGH.Officer.DialogHint",
        "You will risk Corruption, then draw 4 cards from the deck and assign each to a player."
      )
    );
    if (!confirmed) return;

    await this._doCorruptionRiskCheck(this.t("NGH.CorruptionRisk.Reason.OfficerShare", "Officer — sharing cards with squad"));

    const selections: string[] = [];
    for (let i = 1; i <= 4; i += 1) {
      const value = await this.promptText(
        this.tf(
          "NGH.Officer.CardPrompt",
          { n: i, players: playerList },
          `Card ${i} recipient (${playerList})`
        ),
        players[(i - 1) % players.length]?.name ?? ""
      );
      if (value === null) return;

      const normalized = value.trim().toLowerCase();
      const match = players.find((player) => player.name.trim().toLowerCase() === normalized)
        ?? players.find((player) => player.id.trim().toLowerCase() === normalized)
        ?? players[(i - 1) % players.length];
      selections.push(match.id);
    }

    const drawn: { userId: string; card: string; userName: string }[] = [];
    for (const userId of selections) {
      const drawResult = await this.api.mechanics.cards.draw(userId, 1);
      const card = drawResult?.drawn?.[0] ?? null;
      if (card) {
        const userName = players.find((p) => p.id === userId)?.name ?? userId;
        drawn.push({ userId, card, userName });
      }
    }

    await this.createChatMessage(
      this.t("NGH.Chat.OfficerShare.Title", "Officer — Cards Shared"),
      drawn.length > 0
        ? drawn.map(({ userName, card }) => this.tf("NGH.Chat.OfficerShare.Card", { user: userName, card }, `${userName}: ${card}`))
        : [this.t("NGH.Chat.OfficerShare.NoneDrawn", "No cards could be drawn from the deck.")],
      { whisper: this.getPrivateWhisperRecipients(this.userId) }
    );
    void this.render();
  }

  private async _doAllyBlackCardCorruption(): Promise<void> {
    await this._doCorruptionRiskCheck(
      this.t("NGH.CorruptionRisk.Reason.StarsHolyDay", "Stars / Holy Day — ally black card")
    );
  }

  private async _doGroveCorruption(): Promise<void> {
    await this._doCorruptionRiskCheck(
      this.t("NGH.CorruptionRisk.Reason.Grove", "Grove — cards left on the table")
    );
  }

  private async _doGMCorruptionIncident(): Promise<void> {
    if (!game.user?.isGM) {
      throw new Error(this.t("NGH.Error.GMOnlyCorruptionIncident", "Only the GM can trigger a corruption incident."));
    }

    const detail = await this.promptText(
      this.t("NGH.Prompt.CorruptionIncident", "Corruption incident reason (optional)"),
      ""
    );
    if (detail === null) return;

    const trimmed = detail.trim();
    const reason = trimmed
      ? this.tf("NGH.CorruptionRisk.Reason.ManualIncidentDetail", { detail: trimmed }, `Incident: ${trimmed}`)
      : this.t("NGH.CorruptionRisk.Reason.ManualIncident", "GM corruption incident");

    await this._doCorruptionRiskCheck(reason);
  }

  private async _doDrawCard(): Promise<void> {
    const result = await this.api.mechanics.cards.draw(this.userId, 1);
    void this.render();
    await this.createChatMessage(this.t("NGH.Chat.DrawCard.Title", "Draw Card"), [
      this.tf(
        "NGH.Chat.DrawCard.Drawn",
        { drawn: result.drawn.join(", ") || this.t("NGH.Common.None", "none") },
        `Drawn: ${result.drawn.join(", ") || "none"}`
      ),
      this.tf(
        "NGH.Chat.DrawCard.Hand",
        { current: result.hand.length, max: this.api.mechanics.cards.maxHandSize() },
        `Hand: ${result.hand.length}/${this.api.mechanics.cards.maxHandSize()}`
      ),
    ], { whisper: this.getPrivateWhisperRecipients(this.userId) });
  }

  private async _doDrawJourneyCard(): Promise<void> {
    const result = await this.api.mechanics.cards.drawJourney(this.userId, 1);
    void this.render();
    await this.createChatMessage(this.t("NGH.Chat.DrawJourneyCard.Title", "Draw Journey Card"), [
      this.tf(
        "NGH.Chat.DrawJourneyCard.Drawn",
        { drawn: result.drawn.join(", ") || this.t("NGH.Common.None", "none") },
        `Drawn: ${result.drawn.join(", ") || "none"}`
      ),
      this.tf(
        "NGH.Chat.DrawJourneyCard.Hand",
        { current: result.hand.length, max: this.api.mechanics.cards.maxJourneyHandSize() },
        `Journey hand: ${result.hand.length}/${this.api.mechanics.cards.maxJourneyHandSize()}`
      ),
    ], { whisper: this.getPrivateWhisperRecipients(this.userId) });
  }

  private async _doDiscardCard(card: string): Promise<void> {
    if (!card) throw new Error(this.t("NGH.Error.CardCodeRequired", "Card action requires a card code"));
    const result = await this.api.mechanics.cards.discard([card], this.userId);
    void this.render();
    await this.createChatMessage(this.t("NGH.Chat.DiscardCard.Title", "Discard Card"), [
      this.tf("NGH.Chat.DiscardCard.Discarded", { card }, `Discarded: ${card}`),
      this.tf("NGH.Chat.DiscardCard.HandLeft", { count: result.hand.length }, `Cards left in hand: ${result.hand.length}`),
    ], { whisper: this.getPrivateWhisperRecipients(this.userId) });
  }

  private async _doInitiativeCard(card: string): Promise<void> {
    if (!card) throw new Error(this.t("NGH.Error.CardCodeRequired", "Card action requires a card code"));
    const result = await this.api.mechanics.cards.useInitiative(this.userId, card);
    await this.createChatMessage(this.t("NGH.Chat.Initiative.Title", "Initiative"), [
      this.tf("NGH.Chat.Initiative.Card", { card: result.card ?? this.t("NGH.Common.None", "none") }, `Card: ${result.card ?? "none"}`),
      this.tf("NGH.Chat.Initiative.Score", { score: result.score ?? 0 }, `Score: ${result.score ?? 0}`),
      result.keptInHand
        ? this.t("NGH.Chat.Initiative.Kept", "Card remains in hand.")
        : this.t("NGH.Chat.Initiative.Resolved", "Card was resolved from the deck or reshuffled."),
    ]);
    void this.render();

    if (result.triggersCorruptionRisk) {
      await this._doCorruptionRiskCheck(this.t("NGH.CorruptionRisk.Reason.BlackJokerInitiative", "Black Joker — Initiative"));
    }
  }

  private async _doJourneyCard(card?: string): Promise<void> {
    if (!card && this.getJourneyPlayedUserIds().includes(this.userId)) {
      throw new Error(this.t(
        "NGH.Error.JourneyBlindAlreadyContributed",
        "You already contributed to this Journey. Extra blind cards must be added from the Journey panel."
      ));
    }

    const result = await this.api.mechanics.cards.useJourney(this.userId, card);

    const played = (result.playedCards ?? []).filter((value: unknown): value is string => typeof value === "string");
    if (played.length > 0) {
      // World-scoped settings can only be updated by GM.
      // Ask GM to record the contribution via socket relay.
      (game as any).socket?.emit(`system.${NGH_SYSTEM_ID}`, {
        type: "journeyContribute",
        userId: this.userId,
        cards: played
      });
    }

    await this.createChatMessage(this.t("NGH.Chat.Journey.Title", "Journey"), [
      result.source === "top-deck"
        ? this.t("NGH.Chat.Journey.DrewBlindHidden", "A blind card was added to the Journey.")
        : this.t("NGH.Chat.Journey.PlayedHidden", "A card was added to the Journey."),
    ]);
    void this.render();
  }

  private async _doBurnCard(card: string, reason: "plus-one" | "whisper"): Promise<void> {
    if (!card) throw new Error(this.t("NGH.Error.CardCodeRequired", "Card action requires a card code"));
    const result =
      reason === "plus-one"
        ? await this.api.mechanics.cards.burnForPlusOne(card, this.userId)
        : await this.api.mechanics.cards.burnForWhisper(card, this.userId);

    await this.createChatMessage(
      reason === "plus-one"
        ? this.t("NGH.Chat.BurnPlusOne.Title", "Burn Card for +One")
        : this.t("NGH.Chat.BurnWhisper.Title", "Burn Card for Whisper"),
      [
      this.tf("NGH.Chat.BurnCard.Burned", { cards: result.cards.join(", ") }, `Burned: ${result.cards.join(", ")}`),
      this.tf("NGH.Chat.BurnCard.HandRemaining", { count: result.hand.length }, `Remaining hand: ${result.hand.length}`),
      ],
      { whisper: this.getPrivateWhisperRecipients(this.userId) }
    );
    void this.render();

    if (result.triggersCorruptionRisk) {
      await this._doCorruptionRiskCheck(
        reason === "plus-one"
          ? this.t("NGH.CorruptionRisk.Reason.BlackJokerBurnPlusOne", "Black Joker — Burn for +One")
          : this.t("NGH.CorruptionRisk.Reason.BlackJokerBurnWhisper", "Black Joker — Burn for Whisper")
      );
    }
  }

  private async _doHealCard(card: string): Promise<void> {
    if (!card) throw new Error(this.t("NGH.Error.CardCodeRequired", "Card action requires a card code"));
    const attribute = await this.promptText(this.t("NGH.Prompt.HealAttribute", "Heal which attribute? krzepa / spryt / hart"), "krzepa");
    if (!attribute) return;

    const burnResult = await this.api.mechanics.cards.burnForHealing([card], this.userId);
    const result = await (this.actor as any).healAttributeDamage(attribute, 1);
    await this.createChatMessage(this.t("NGH.Chat.Heal.Title", "Heal Attribute"), [
      this.tf("NGH.Chat.Heal.Burned", { card }, `Burned: ${card}`),
      this.tf("NGH.Chat.Heal.Recovered", { attribute, current: result.current, max: result.max }, `Recovered ${attribute} to ${result.current}/${result.max}`),
    ], { whisper: this.getPrivateWhisperRecipients(this.userId) });
    void this.render();

    if (burnResult.triggersCorruptionRisk) {
      await this._doCorruptionRiskCheck(this.t("NGH.CorruptionRisk.Reason.BlackJokerBurnHeal", "Black Joker — Burn for Healing"));
    }
  }

  private async _doDefendCard(card: string): Promise<void> {
    if (!card) throw new Error(this.t("NGH.Error.CardCodeRequired", "Card action requires a card code"));

    const attributeInput = await this.promptText(this.t("NGH.Prompt.DefenseAttribute", "Defend which attribute? krzepa / spryt / hart"), "krzepa");
    if (!attributeInput) return;
    const attribute = attributeInput as "krzepa" | "spryt" | "hart";

    const incomingDamage = await this.promptNumber(this.t("NGH.Prompt.IncomingDamage", "Incoming damage"), 1);
    if (incomingDamage === null) return;

    const result = await (this.actor as any).preventDamageWithCards(attribute, incomingDamage, [card], this.userId);
    await this.createChatMessage(this.t("NGH.Chat.Defend.Title", "Defend with Card"), [
      this.tf("NGH.Chat.Defend.Card", { card }, `Card: ${card}`),
      this.tf("NGH.Chat.Defend.Attribute", { attribute }, `Attribute: ${attribute}`),
      this.tf("NGH.Chat.Defend.Incoming", { incoming: incomingDamage }, `Incoming: ${incomingDamage}`),
      this.tf("NGH.Chat.Defend.Prevented", { prevented: result.preventedDamage }, `Prevented: ${result.preventedDamage}`),
      this.tf("NGH.Chat.Defend.Applied", { applied: result.appliedDamage }, `Applied: ${result.appliedDamage}`),
      this.tf("NGH.Chat.Defend.Current", { current: result.current, max: result.max }, `Current: ${result.current}/${result.max}`),
    ], { whisper: this.getPrivateWhisperRecipients(this.userId) });
    void this.render();
    if (result.triggersCorruptionRisk) {
      await this._doCorruptionRiskCheck(this.t("NGH.CorruptionRisk.Reason.BlackJokerDefense", "Black Joker — Defense"));
    }
  }

  private async _doSkillTest(skill: string): Promise<void> {
    if (!skill) throw new Error(this.t("NGH.Error.SkillKeyRequired", "Skill test action requires a skill key"));

    const system = this.actor.system as any;
    const skillData = system.skills?.[skill];
    const difficulty = await this.promptNumber(this.t("NGH.Prompt.Difficulty", "Difficulty (PT)"), 2);
    if (difficulty === null) return;

    const bonusDice = await this.promptNumber(this.t("NGH.Prompt.BonusDice", "Bonus dice to buy before roll"), 0);
    if (bonusDice === null) return;

    let attributeOverride: string | undefined;
    if (skill === "szepty") {
      attributeOverride = (await this.promptText(this.t("NGH.Prompt.WhisperAttribute", "Whisper attribute: krzepa / spryt / hart"), "spryt")) ?? undefined;
      if (!attributeOverride) return;
    }

    const attributeKey = this.api.mechanics.getSkillAttribute(skill, attributeOverride);
    const attributeValue = Number(system.attributes?.[attributeKey]?.value ?? 0);
    const temporaryTraining = !skillData?.trained && (await this.promptConfirm(this.t("NGH.Prompt.TempTrainingTest", "Use temporary training for this test?")));

    const baseOptions = {
      skill,
      difficulty,
      skillLevel: Number(skillData?.rank ?? 0),
      attributeValue,
      attributeOverride,
      bonusDice,
      temporaryTraining,
    };

    const preview = this.api.mechanics.executeSkillTest(baseOptions);
    const post = await this.promptPostRollModifiers(preview.rollsBeforePost, preview.modifiers.remaining);
    const result = this.api.mechanics.executeSkillTest({
      ...baseOptions,
      rerollIndices: post.rerollIndices,
      increaseIndices: post.increaseIndices,
    }, this.createReplayRng(preview.rollsBeforePost));

    await this.createChatMessage(this.t("NGH.Chat.SkillTest.Title", "Skill Test"), [
      this.tf("NGH.Chat.SkillTest.Skill", { skill }, `Skill: ${skill}`),
      this.tf("NGH.Chat.SkillTest.Attribute", { attribute: result.attribute }, `Attribute: ${result.attribute}`),
      this.tf("NGH.Chat.SkillTest.RollsBefore", { rolls: result.rollsBeforePost.join(", ") }, `Rolls before post-roll: ${result.rollsBeforePost.join(", ")}`),
      this.tf("NGH.Chat.SkillTest.PostChoices", {
        reroll: post.rerollIndices.join(", ") || this.t("NGH.Common.None", "none"),
        increase: post.increaseIndices.join(", ") || this.t("NGH.Common.None", "none")
      }, `Post-roll choices: reroll [${post.rerollIndices.join(", ") || "none"}], +1 [${post.increaseIndices.join(", ") || "none"}]`),
      this.tf("NGH.Chat.SkillTest.RollsFinal", { rolls: result.rollsAfterPost.join(", ") }, `Rolls final: ${result.rollsAfterPost.join(", ")}`),
      this.tf("NGH.Chat.SkillTest.Successes", { successes: result.successes, difficulty }, `Successes: ${result.successes}/${difficulty}`),
      result.passed ? this.t("NGH.Chat.Result.Success", "Result: success") : this.t("NGH.Chat.Result.Failure", "Result: failure"),
    ]);
  }

  private async _doChallengeTest(skill: string): Promise<void> {
    if (!skill) throw new Error(this.t("NGH.Error.SkillKeyRequired", "Skill test action requires a skill key"));

    const difficulty = await this.promptNumber(this.t("NGH.Prompt.Difficulty", "Difficulty (PT)"), 2);
    if (difficulty === null) return;

    let attributeOverride: string | undefined;
    if (skill === "szepty") {
      attributeOverride = (await this.promptText(this.t("NGH.Prompt.WhisperAttribute", "Whisper attribute: krzepa / spryt / hart"), "spryt")) ?? undefined;
      if (!attributeOverride) return;
    }

    const actors = Array.from(((game as any).actors?.contents ?? (game as any).actors ?? []) as any[])
      .filter((actor) => actor?.type === "character");

    const available = actors.map((actor) => String(actor.name ?? actor.id)).join(", ");
    const participantsRaw = await this.promptText(
      this.tf("NGH.Prompt.ChallengeParticipants", { available }, `Challenge participants (comma-separated actor IDs or names). Available: ${available}`),
      String(this.actor.name ?? this.actor.id)
    );
    if (!participantsRaw) return;

    const tokens = participantsRaw.split(",").map((value) => value.trim()).filter(Boolean);
    const selectedActors = tokens
      .map((token) =>
        actors.find((actor) => String(actor.id) === token) ??
        actors.find((actor) => String(actor.name ?? "").toLocaleLowerCase() === token.toLocaleLowerCase())
      )
      .filter((actor, index, list): actor is any => Boolean(actor) && list.indexOf(actor) === index);

    if (selectedActors.length < 1) {
      ui.notifications?.warn(this.t("NGH.Challenge.NoParticipants", "No valid challenge participants selected."));
      return;
    }

    const participants = selectedActors.map((actor) => {
      const system = actor.system as any;
      const skillData = system.skills?.[skill];
      const attributeKey = this.api.mechanics.getSkillAttribute(skill, attributeOverride);
      return {
        id: String(actor.id),
        label: String(actor.name ?? actor.id),
        skillLevel: Number(skillData?.rank ?? 0),
        attributeValue: Number(system.attributes?.[attributeKey]?.value ?? 0),
      };
    });

    const result = this.api.mechanics.rollChallenge(participants, skill, difficulty, attributeOverride);

    await this.createChatMessage(this.t("NGH.Chat.Challenge.Title", "Group Challenge"), [
      this.tf("NGH.Chat.Challenge.Skill", { skill }, `Skill: ${skill}`),
      this.tf("NGH.Chat.Challenge.Difficulty", { difficulty: result.difficulty }, `Difficulty: ${result.difficulty}`),
      this.tf("NGH.Chat.Challenge.Total", { successes: result.totalSuccesses }, `Total successes: ${result.totalSuccesses}`),
      result.passed ? this.t("NGH.Chat.Result.Success", "Result: success") : this.t("NGH.Chat.Result.Failure", "Result: failure"),
      ...result.participants.map((entry) =>
        this.tf(
          "NGH.Chat.Challenge.Participant",
          { participant: entry.label, successes: entry.successes, rolls: entry.rolls.join(", ") },
          `${entry.label}: ${entry.successes} success(es) [${entry.rolls.join(", ")}]`
        )
      )
    ]);
  }

  private async _doWeaponAttack(): Promise<void> {
    const weaponChoices = Object.values(this.api.mechanics.combat.weapons)
      .map((weapon) => `${weapon.id}: ${weapon.label}`)
      .join("\n");
    const weaponId = await this.promptText(this.tf("NGH.Prompt.ChooseWeapon", { choices: weaponChoices }, `Choose weapon id:\n${weaponChoices}`), "rifle");
    if (!weaponId) return;

    const weapon = this.api.mechanics.combat.getWeaponProfile(weaponId);
    const system = this.actor.system as any;
    const skillData = system.skills?.[weapon.skill];
    const targetKrzepa = await this.promptNumber(this.t("NGH.Prompt.TargetKrzepa", "Target Krzepa"), 2);
    if (targetKrzepa === null) return;
    const targetArmor = await this.promptNumber(this.t("NGH.Prompt.TargetArmor", "Target armor"), 0);
    if (targetArmor === null) return;
    const defense = this.api.mechanics.combat.computeAttackPT(targetKrzepa, targetArmor);

    const bonusDice = await this.promptNumber(this.t("NGH.Prompt.BonusDiceAttack", "Bonus dice before attack"), 0);
    if (bonusDice === null) return;

    const attributeKey = this.api.mechanics.getSkillAttribute(weapon.skill);
    const attributeValue = Number(system.attributes?.[attributeKey]?.value ?? 0);
    const baseOptions = {
      skill: weapon.skill,
      difficulty: defense,
      skillLevel: Number(skillData?.rank ?? 0),
      attributeValue,
      bonusDice,
      temporaryTraining: !skillData?.trained && (await this.promptConfirm(this.t("NGH.Prompt.TempTrainingAttack", "Use temporary training for this attack?"))),
    };

    const previewTest = this.api.mechanics.executeSkillTest(baseOptions);
    const post = await this.promptPostRollModifiers(previewTest.rollsBeforePost, previewTest.modifiers.remaining);
    const testResult = this.api.mechanics.executeSkillTest({
      ...baseOptions,
      rerollIndices: post.rerollIndices,
      increaseIndices: post.increaseIndices,
    }, this.createReplayRng(previewTest.rollsBeforePost));

    const preview = this.api.mechanics.combat.resolveWeaponAttack({
      weaponId,
      successes: testResult.successes,
      defense,
    });

    let selectedEffects: string[] = [];
    if (preview.availableEffects.length > 0) {
      const effectInput = await this.promptText(
        this.tf("NGH.Prompt.AvailableEffects", { effects: preview.availableEffects.map((effect: any) => `${effect.key} (${effect.cost})`).join(", ") }, `Available effects: ${preview.availableEffects.map((effect: any) => `${effect.key} (${effect.cost})`).join(", ")}\nType comma-separated effect keys to apply, or leave blank.`),
        ""
      );
      selectedEffects = effectInput ? effectInput.split(",").map((value) => value.trim()).filter(Boolean) : [];
    }

    const attackResult = this.api.mechanics.combat.resolveWeaponAttack({
      weaponId,
      successes: testResult.successes,
      defense,
      selectedEffects,
    });

    await this.createChatMessage(this.t("NGH.Chat.WeaponAttack.Title", "Weapon Attack"), [
      this.tf("NGH.Chat.WeaponAttack.Weapon", { weapon: weapon.label }, `Weapon: ${weapon.label}`),
      this.tf("NGH.Chat.WeaponAttack.RollsBefore", { rolls: testResult.rollsBeforePost.join(", ") }, `Rolls before post-roll: ${testResult.rollsBeforePost.join(", ")}`),
      this.tf("NGH.Chat.WeaponAttack.PostChoices", {
        reroll: post.rerollIndices.join(", ") || this.t("NGH.Common.None", "none"),
        increase: post.increaseIndices.join(", ") || this.t("NGH.Common.None", "none")
      }, `Post-roll choices: reroll [${post.rerollIndices.join(", ") || "none"}], +1 [${post.increaseIndices.join(", ") || "none"}]`),
      this.tf("NGH.Chat.WeaponAttack.RollsFinal", { rolls: testResult.rollsAfterPost.join(", ") }, `Rolls final: ${testResult.rollsAfterPost.join(", ")}`),
      this.tf("NGH.Chat.WeaponAttack.Successes", { successes: testResult.successes }, `Successes: ${testResult.successes}`),
      attackResult.hit ? this.tf("NGH.Chat.WeaponAttack.Hit", { damage: attackResult.totalDamage }, `Hit for ${attackResult.totalDamage} damage.`) : this.t("NGH.Chat.WeaponAttack.Miss", "Miss."),
      attackResult.selectedEffects.length > 0
        ? this.tf("NGH.Chat.WeaponAttack.Effects", { effects: attackResult.selectedEffects.map((effect: any) => effect.label).join(", ") }, `Effects: ${attackResult.selectedEffects.map((effect: any) => effect.label).join(", ")}`)
        : this.t("NGH.Chat.WeaponAttack.EffectsNone", "Effects: none"),
    ]);
  }
}
