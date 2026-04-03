const NGH_SYSTEM_ID = "nghrpg";

let panelInstance: NGHGMToolsPanel | null = null;

export const openGMToolsPanel = (): void => {
  if (!game.user?.isGM) {
    ui.notifications?.warn(
      game.i18n?.localize("NGH.Error.GMOnlyGMToolsPanel") ??
        "Only the GM can open GM Tools."
    );
    return;
  }

  panelInstance ??= new NGHGMToolsPanel();
  void panelInstance.render(true as any);
};

export class NGHGMToolsPanel extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  private t(key: string, fallback: string): string {
    const localized = game.i18n?.localize(key);
    return localized && localized !== key ? localized : fallback;
  }

  static override DEFAULT_OPTIONS = {
    classes: ["ngh", "gm-tools-panel-app"],
    tag: "section",
    position: { width: 760, height: 820 },
    window: { title: "GameMaster Tools", resizable: true },
  };

  static override PARTS = {
    body: {
      template: "systems/nghrpg/templates/gm-tools-panel.html",
    },
  };

  async _prepareContext(): Promise<any> {
    const actors = Array.from(((game as any).actors?.contents ?? []) as any[])
      .filter((actor: any) => actor?.type === "character")
      .map((actor: any) => ({
        name: String(actor.name ?? this.t("NGH.Common.Unknown", "Unknown")),
        corruption: Number(actor.system?.corruption ?? 0),
      }))
      .sort((a, b) => b.corruption - a.corruption || a.name.localeCompare(b.name));

    return {
      cssClass: "ngh",
      panelTitle: this.t("NGH.GMTools.PanelTitle", "GameMaster Tools"),
      subtitle: this.t(
        "NGH.GMTools.Subtitle",
        "Session-facing quick references and checklists for Never Going Home."
      ),
      corruptionActors: actors,
      corruptionTriggers: [
        this.t("NGH.GMTools.CorruptionTriggers.BlackJoker", "Black Joker played/revealed"),
        this.t("NGH.GMTools.CorruptionTriggers.Burns", "Black Joker burned (+One / Whisper / Healing)"),
        this.t("NGH.GMTools.CorruptionTriggers.WhisperRank", "Whisper path advanced to rank 3/4/5"),
        this.t("NGH.GMTools.CorruptionTriggers.ElementalRitual", "Elemental Ritual with empty hand and black top-deck card"),
        this.t("NGH.GMTools.CorruptionTriggers.StarsHolyDay", "Stars / Holy Day when ally black card is used"),
        this.t("NGH.GMTools.CorruptionTriggers.Officer", "Officer card-sharing action"),
        this.t("NGH.GMTools.CorruptionTriggers.Incident", "GM-triggered incident"),
      ],
      journeyFlow: [
        this.t("NGH.GMTools.JourneyFlow.Configure", "1. Configure requirements + bonus/penalty"),
        this.t("NGH.GMTools.JourneyFlow.Collect", "2. Collect cards (players + blind cards + corruption cards)"),
        this.t("NGH.GMTools.JourneyFlow.Deal", "3. Shuffle and deal journey cards"),
        this.t("NGH.GMTools.JourneyFlow.Reveal", "4. Reveal cards with suit motif narration"),
        this.t("NGH.GMTools.JourneyFlow.Resolve", "5. Resolve requirement outcome and finish"),
      ],
      combatFlow: [
        this.t("NGH.GMTools.CombatFlow.New", "1. New Combat: load actors and enemy groups"),
        this.t("NGH.GMTools.CombatFlow.Initiative", "2. Initiative: assign cards, resolve ties"),
        this.t("NGH.GMTools.CombatFlow.Start", "3. Start: highest initiative chooses first actor"),
        this.t("NGH.GMTools.CombatFlow.Pass", "4. Active round: each actor passes turn onward"),
        this.t("NGH.GMTools.CombatFlow.EndRound", "5. End round: last actor picks next round starter"),
      ],
      quickReference: [
        this.t("NGH.GMTools.QuickRef.PT", "Attack PT = max(Krzepa, Armor)"),
        this.t("NGH.GMTools.QuickRef.Defense", "Defend with cards: 1 card prevents 1 incoming damage"),
        this.t("NGH.GMTools.QuickRef.Hand", "Standard hand limit: 7 cards"),
        this.t("NGH.GMTools.QuickRef.Corruption34", "Corruption 3 -> +1 journey card; Corruption 4 -> +2 journey cards"),
        this.t("NGH.GMTools.QuickRef.Corruption5", "Corruption 5: final mission state"),
      ],
      sessionChecklist: [
        this.t("NGH.GMTools.SessionChecklist.OpenPanels", "Open Journey / Combat / GM Tools panels"),
        this.t("NGH.GMTools.SessionChecklist.ReviewCorruption", "Review corruption track for all characters"),
        this.t("NGH.GMTools.SessionChecklist.VerifyDeck", "Verify deck/discard and reshuffle status"),
        this.t("NGH.GMTools.SessionChecklist.CheckMission", "Set mission requirements before journey starts"),
      ],
      hasCorruptionActors: actors.length > 0,
    };
  }
}
