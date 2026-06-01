import {
  resolveInitiativeOrder,
  getNextRoundStarterOptions,
  resolveTieBreaker,
  type NGHInitiativeEntry,
} from "../module/mechanics/combat.js";

const NGH_SYSTEM_ID = "nghrpg";
const COMBAT_STATE_SETTING = "combatState";

interface NGHCombatEntry {
  id: string;
  label: string;
  kind: "character" | "enemy-group";
  card: string | null;
  tieBreakerCard: string | null;
  score: number;
  tied: boolean;
  acted: boolean;
  groupSize: number;
  groupAttackBonus: number;
}

interface NGHCombatState {
  round: number;
  phase: "idle" | "initiative" | "active";
  entries: NGHCombatEntry[];
  activeActorId: string | null;
  lastActorId: string | null;
}

const DEFAULT_STATE: NGHCombatState = {
  round: 0,
  phase: "idle",
  entries: [],
  activeActorId: null,
  lastActorId: null,
};

const parseEnemyGroupLine = (line: string): { label: string; groupSize: number; groupAttackBonus: number } => {
  const normalized = line.trim();
  const sizeMatch = normalized.match(/\bx\s*(\d+)\b/i) ?? normalized.match(/\b(\d+)\s*(?:szt|osob|units?)\b/i);
  const bonusMatch = normalized.match(/\b(?:atk|attack|at)\s*([+-]?\d+)\b/i);
  const groupSize = Math.max(1, Number(sizeMatch?.[1] ?? 1));
  const groupAttackBonus = Number.isFinite(Number(bonusMatch?.[1])) ? Number(bonusMatch?.[1]) : 0;
  const cleanLabel = normalized
    .replace(/\bx\s*\d+\b/gi, "")
    .replace(/\b\d+\s*(?:szt|osob|units?)\b/gi, "")
    .replace(/\b(?:atk|attack|at)\s*[+-]?\d+\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return {
    label: cleanLabel || line.trim() || game.i18n?.localize("NGH.Combat.Kind.EnemyGroup") || "Enemy Group",
    groupSize,
    groupAttackBonus
  };
};

export const registerCombatPanelSettings = (): void => {
  (game as any).settings?.register(NGH_SYSTEM_ID, COMBAT_STATE_SETTING, {
    name: "Combat State",
    scope: "world",
    config: false,
    type: String,
    default: JSON.stringify(DEFAULT_STATE),
  });
};

const getCombatState = (): NGHCombatState => {
  try {
    return JSON.parse(
      (game as any).settings?.get(NGH_SYSTEM_ID, COMBAT_STATE_SETTING) as string
    ) as NGHCombatState;
  } catch {
    return { ...DEFAULT_STATE, entries: [] };
  }
};

const setCombatState = async (state: NGHCombatState): Promise<void> => {
  await (game as any).settings?.set(
    NGH_SYSTEM_ID,
    COMBAT_STATE_SETTING,
    JSON.stringify(state)
  );
};

let panelInstance: NGHCombatPanel | null = null;

export const openCombatPanel = (): void => {
  if (!game.user?.isGM) {
    ui.notifications?.warn(
      game.i18n?.localize("NGH.Error.GMOnlyCombatPanel") ??
        "Only the GM can open Combat Control."
    );
    return;
  }
  panelInstance ??= new NGHCombatPanel();
  void panelInstance.render(true as any);
};

export class NGHCombatPanel extends foundry.applications.api.HandlebarsApplicationMixin(
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
    classes: ["ngh", "combat-panel-app"],
    tag: "section",
    position: { width: 580, height: 660 },
    window: { resizable: true },
  };

  override get title(): string {
    return game.i18n?.localize("NGH.Combat.PanelTitle") ?? "Combat Control";
  }

  static override PARTS = {
    body: {
      template: "systems/nghrpg/templates/combat-panel.html",
    },
  };

  async _prepareContext(): Promise<any> {
    const state = getCombatState();
    const { round, phase, entries, activeActorId } = state;

    const unacted = entries.filter((e) => !e.acted);
    const acted = entries.filter((e) => e.acted);
    const activeEntry = entries.find((e) => e.id === activeActorId) ?? null;
    const isLastToAct =
      unacted.length === 0 ||
      (unacted.length === 1 && unacted[0]?.id === activeActorId);

    const entriesWithFlags = entries.map((e) => ({
      ...e,
      isCurrentActor: e.id === activeActorId,
      card: e.card ?? "",
      tieBreakerCard: e.tieBreakerCard ?? "",
      isEnemyGroup: e.kind === "enemy-group",
      kindLabel:
        e.kind === "enemy-group"
          ? this.t("NGH.Combat.Kind.EnemyGroup", "Enemy group")
          : this.t("NGH.Combat.Kind.Character", "Character"),
      groupInfo:
        e.kind === "enemy-group"
          ? this.tf(
              "NGH.Combat.GroupInfo",
              { size: e.groupSize, bonus: e.groupAttackBonus },
              `size ${e.groupSize}, atk ${e.groupAttackBonus >= 0 ? `+${e.groupAttackBonus}` : e.groupAttackBonus}`
            )
          : ""
    }));

    const unactedWithFlags = unacted.map((e) => ({
      ...e,
      isCurrentActor: e.id === activeActorId,
    }));

    return {
      cssClass: "ngh",
      round,
      phase,
      entries: entriesWithFlags,
      activeEntry,
      activeActorId,
      unacted: unactedWithFlags,
      acted,
      isLastToAct,
      isIdle: phase === "idle",
      isInitiative: phase === "initiative",
      isActive: phase === "active",
      canEnemyGroupAttack: phase === "active" && activeEntry?.kind === "enemy-group",
      hasTies: entries.some((e) => e.tied),
      canStartCombat:
        phase === "initiative" &&
        entries.length > 0 &&
        !entries.some((e) => e.tied),
      panelTitle: this.t("NGH.Combat.PanelTitle", "Combat Control"),
      roundLabel: this.t("NGH.Combat.Round", "Round"),
    };
  }

  protected override _onRender(
    _context: Record<string, unknown>,
    _options: Record<string, unknown>
  ): void {
    const root = this.element;
    const run = (action: () => Promise<void>): void => {
      void action().catch((error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : this.t("NGH.Error.ActionFailed", "Action failed");
        console.error("nghrpg | Combat panel action failed", error);
        ui.notifications?.error(message);
      });
    };

    root
      .querySelector("[data-action='combat-new']")
      ?.addEventListener("click", () => {
        run(() => this._doNewCombat());
      });

    root
      .querySelector("[data-action='combat-resolve-order']")
      ?.addEventListener("click", () => {
        run(() => this._doResolveOrder());
      });

    root
      .querySelector("[data-action='combat-start']")
      ?.addEventListener("click", () => {
        run(() => this._doStartCombat());
      });

    root
      .querySelector("[data-action='combat-pass-turn']")
      ?.addEventListener("click", () => {
        run(() => this._doPassTurn());
      });

    root
      .querySelector("[data-action='combat-end-round']")
      ?.addEventListener("click", () => {
        run(() => this._doEndRound());
      });

    root
      .querySelector("[data-action='combat-group-attack']")
      ?.addEventListener("click", () => {
        run(() => this._doEnemyGroupAttack());
      });

    root
      .querySelector("[data-action='combat-reset']")
      ?.addEventListener("click", () => {
        run(() => this._doReset());
      });
  }

  private getDialogRoot(dialog: unknown): HTMLElement | null {
    if (dialog instanceof HTMLElement) return dialog;
    if ((dialog as any)?.element instanceof HTMLElement)
      return (dialog as any).element;
    if ((dialog as any)?.element?.[0] instanceof HTMLElement)
      return (dialog as any).element[0];
    return null;
  }

  private async _doNewCombat(): Promise<void> {
    const actors = Array.from(
      ((game as any).actors?.contents ?? []) as any[]
    )
      .filter((actor: any) => actor?.type === "character")
      .map(
        (actor: any): NGHCombatEntry => ({
          id: String(actor.id),
          label: String(actor.name ?? actor.id),
          kind: "character",
          card: null,
          tieBreakerCard: null,
          score: 0,
          tied: false,
          acted: false,
          groupSize: 1,
          groupAttackBonus: 0,
        })
      );

    const enemyInput = (await foundry.applications.api.DialogV2.prompt({
      window: {
        title: this.t("NGH.Combat.EnemyGroups.Title", "Enemy Groups"),
      } as any,
      content: `<form class="ngh-dialog"><p>${this.t(
        "NGH.Combat.EnemyGroups.Prompt",
        "Enter enemy groups, one per line:"
      )}</p><textarea name="enemies" style="width:100%;height:80px;"></textarea></form>`,
      ok: {
        label: this.t("NGH.Action.Confirm", "OK"),
        callback: (_event: any, _button: any, dialog: any) => {
          const root = this.getDialogRoot(dialog);
          return (
            root?.querySelector<HTMLTextAreaElement>("textarea[name='enemies']")
              ?.value ?? ""
          );
        },
      },
      rejectClose: false,
    } as any)) as string | null;

    const enemyEntries: NGHCombatEntry[] = (enemyInput ?? "")
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)
      .map((name: string, index: number): NGHCombatEntry => {
        const parsed = parseEnemyGroupLine(name);
        return {
          id: `enemy-${index}`,
          label: parsed.label,
          kind: "enemy-group",
          card: null,
          tieBreakerCard: null,
          score: 0,
          tied: false,
          acted: false,
          groupSize: parsed.groupSize,
          groupAttackBonus: parsed.groupAttackBonus,
        };
      });

    const state: NGHCombatState = {
      round: 0,
      phase: "initiative",
      entries: [...actors, ...enemyEntries],
      activeActorId: null,
      lastActorId: null,
    };

    await setCombatState(state);
    void this.render(true as any);
  }

  private async _doResolveOrder(): Promise<void> {
    const state = getCombatState();
    const root = this.element;

    const updatedEntries: NGHCombatEntry[] = state.entries.map((entry) => {
      const cardInput = root.querySelector<HTMLInputElement>(
        `input[name="card-${entry.id}"]`
      );
      const tbInput = root.querySelector<HTMLInputElement>(
        `input[name="tb-${entry.id}"]`
      );
      return {
        ...entry,
        card: cardInput?.value?.trim() || null,
        tieBreakerCard: tbInput?.value?.trim() || null,
      };
    });

    const initiativeEntries: NGHInitiativeEntry[] = updatedEntries.map((e) => ({
      id: e.id,
      label: e.label,
      card: e.card ?? undefined,
    }));

    const resolved = resolveInitiativeOrder(initiativeEntries);

    const newEntries: NGHCombatEntry[] = resolved.map((r) => {
      const orig = updatedEntries.find((e) => e.id === r.id)!;
      return {
        ...orig,
        score: r.score,
        tied: r.tied,
      };
    });

    // Apply tie-breaker cards — bubble sort so 3+ tied entries are all resolved.
    let swapped = true;
    while (swapped) {
      swapped = false;
      for (let i = 0; i < newEntries.length - 1; i++) {
        if (
          newEntries[i].tied &&
          newEntries[i + 1].tied &&
          (newEntries[i].tieBreakerCard || newEntries[i + 1].tieBreakerCard)
        ) {
          const tbScore = resolveTieBreaker(
            newEntries[i].tieBreakerCard,
            newEntries[i + 1].tieBreakerCard
          );
          if (tbScore < 0) {
            [newEntries[i], newEntries[i + 1]] = [
              newEntries[i + 1],
              newEntries[i],
            ];
            swapped = true;
          }
          if (tbScore !== 0) {
            newEntries[i].tied = false;
            newEntries[i + 1].tied = false;
          }
        }
      }
    }

    await setCombatState({ ...state, entries: newEntries });
    void this.render(true as any);
  }

  private async _doStartCombat(): Promise<void> {
    const state = getCombatState();

    const options = state.entries
      .map(
        (e) =>
          `<option value="${e.id}">${e.label} (${this.t(
            "NGH.Combat.Score",
            "Score"
          )}: ${e.score})</option>`
      )
      .join("");

    const firstActorId = (await foundry.applications.api.DialogV2.prompt({
      window: {
        title: this.t("NGH.Combat.ChooseFirst.Title", "Who Goes First?"),
      } as any,
      content: `<form class="ngh-dialog"><p>${this.t(
        "NGH.Combat.ChooseFirst.Prompt",
        "The actor with highest initiative chooses who acts first:"
      )}</p><select name="first" style="width:100%">${options}</select></form>`,
      ok: {
        label: this.t("NGH.Action.Confirm", "OK"),
        callback: (_event: any, _button: any, dialog: any) => {
          const root = this.getDialogRoot(dialog);
          return (
            root?.querySelector<HTMLSelectElement>("select[name='first']")
              ?.value ?? ""
          );
        },
      },
      rejectClose: false,
    } as any)) as string | null;

    if (!firstActorId) return;

    await setCombatState({
      ...state,
      round: 1,
      phase: "active",
      activeActorId: firstActorId,
      lastActorId: null,
      entries: state.entries.map((e) => ({ ...e, acted: false })),
    });

    const firstLabel =
      state.entries.find((e) => e.id === firstActorId)?.label ?? firstActorId;
    await this.createChatMessage(
      this.t("NGH.Chat.Combat.StartTitle", "Combat Started"),
      [
        this.tf("NGH.Chat.Combat.Round", { round: 1 }, "Round 1"),
        this.tf(
          "NGH.Chat.Combat.FirstActor",
          { actor: firstLabel },
          `First actor: ${firstLabel}`
        ),
      ]
    );

    void this.render(true as any);
  }

  private async _doPassTurn(): Promise<void> {
    const state = getCombatState();
    const { entries, activeActorId } = state;

    const newEntries = entries.map((e) =>
      e.id === activeActorId ? { ...e, acted: true } : e
    );
    const remaining = newEntries.filter((e) => !e.acted);

    if (remaining.length === 0) {
      await setCombatState({
        ...state,
        entries: newEntries,
        lastActorId: activeActorId,
      });
      void this.render(true as any);
      return;
    }

    const options = remaining
      .map((e) => `<option value="${e.id}">${e.label}</option>`)
      .join("");

    const nextActorId = (await foundry.applications.api.DialogV2.prompt({
      window: {
        title: this.t("NGH.Combat.ChooseNext.Title", "Who Acts Next?"),
      } as any,
      content: `<form class="ngh-dialog"><p>${this.t(
        "NGH.Combat.ChooseNext.Prompt",
        "Choose who acts next:"
      )}</p><select name="next" style="width:100%">${options}</select></form>`,
      ok: {
        label: this.t("NGH.Action.Confirm", "OK"),
        callback: (_event: any, _button: any, dialog: any) => {
          const root = this.getDialogRoot(dialog);
          return (
            root?.querySelector<HTMLSelectElement>("select[name='next']")
              ?.value ?? ""
          );
        },
      },
      rejectClose: false,
    } as any)) as string | null;

    if (!nextActorId) return;

    const nextLabel =
      remaining.find((e) => e.id === nextActorId)?.label ?? nextActorId;

    await this.createChatMessage(
      this.t("NGH.Chat.Combat.PassTitle", "Initiative Passed"),
      [
        this.tf(
          "NGH.Chat.Combat.NextActor",
          { actor: nextLabel },
          `Next: ${nextLabel}`
        ),
      ]
    );

    await setCombatState({
      ...state,
      entries: newEntries,
      activeActorId: nextActorId,
      lastActorId: activeActorId,
    });
    void this.render(true as any);
  }

  private async _doEndRound(): Promise<void> {
    const state = getCombatState();
    const { entries, activeActorId } = state;

    const allActed = entries.map((e) =>
      e.id === activeActorId ? { ...e, acted: true } : e
    );
    const lastActorId = activeActorId ?? "";

    const eligibleIds = getNextRoundStarterOptions(
      entries.map((e) => e.id),
      lastActorId
    );
    const eligible = eligibleIds
      .map((id) => entries.find((e) => e.id === id))
      .filter((e): e is NGHCombatEntry => Boolean(e));

    if (eligible.length === 0) {
      ui.notifications?.warn(
        this.t(
          "NGH.Combat.NoEligibleStarter",
          "No eligible starter for the next round."
        )
      );
      return;
    }

    const options = eligible
      .map((e) => `<option value="${e.id}">${e.label}</option>`)
      .join("");

    const starterActorId = (await foundry.applications.api.DialogV2.prompt({
      window: {
        title: this.t(
          "NGH.Combat.ChooseStarter.Title",
          "Next Round Starter"
        ),
      } as any,
      content: `<form class="ngh-dialog"><p>${this.t(
        "NGH.Combat.ChooseStarter.Prompt",
        "The last actor chooses who starts the next round (not themselves):"
      )}</p><select name="starter" style="width:100%">${options}</select></form>`,
      ok: {
        label: this.t("NGH.Action.Confirm", "OK"),
        callback: (_event: any, _button: any, dialog: any) => {
          const root = this.getDialogRoot(dialog);
          return (
            root?.querySelector<HTMLSelectElement>("select[name='starter']")
              ?.value ?? ""
          );
        },
      },
      rejectClose: false,
    } as any)) as string | null;

    if (!starterActorId) return;

    const newRound = state.round + 1;
    const starterLabel =
      eligible.find((e) => e.id === starterActorId)?.label ?? starterActorId;

    await setCombatState({
      ...state,
      round: newRound,
      entries: allActed.map((e) => ({ ...e, acted: false })),
      activeActorId: starterActorId,
      lastActorId: lastActorId,
    });

    await this.createChatMessage(
      this.t("NGH.Chat.Combat.NewRoundTitle", "New Round"),
      [
        this.tf(
          "NGH.Chat.Combat.Round",
          { round: newRound },
          `Round ${newRound}`
        ),
        this.tf(
          "NGH.Chat.Combat.FirstActor",
          { actor: starterLabel },
          `First actor: ${starterLabel}`
        ),
      ]
    );
    void this.render(true as any);
  }

  private async _doReset(): Promise<void> {
    await setCombatState({ ...DEFAULT_STATE });
    void this.render(true as any);
  }

  private async _doEnemyGroupAttack(): Promise<void> {
    const state = getCombatState();
    const active = state.entries.find((entry) => entry.id === state.activeActorId);
    if (!active || active.kind !== "enemy-group") {
      ui.notifications?.warn(this.t("NGH.Combat.GroupAttack.NotEnemyTurn", "Group attack is available only on enemy group turn."));
      return;
    }

    const diceCount = Math.max(1, active.groupSize + active.groupAttackBonus);
    const rolls = Array.from({ length: diceCount }, () => Math.floor(Math.random() * 6) + 1);
    const successes = rolls.filter((roll) => roll >= 5).length;

    await this.createChatMessage(
      this.t("NGH.Chat.Combat.GroupAttack.Title", "Enemy Group Attack"),
      [
        this.tf("NGH.Chat.Combat.GroupAttack.Group", { group: active.label }, `Group: ${active.label}`),
        this.tf("NGH.Chat.Combat.GroupAttack.Dice", { dice: diceCount }, `Dice: ${diceCount}`),
        this.tf("NGH.Chat.Combat.GroupAttack.Rolls", { rolls: rolls.join(", ") }, `Rolls: ${rolls.join(", ")}`),
        this.tf("NGH.Chat.Combat.GroupAttack.Successes", { successes }, `Successes: ${successes}`)
      ]
    );
  }

  private async createChatMessage(
    title: string,
    lines: string[]
  ): Promise<void> {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({
        alias: this.t("NGH.Combat.PanelTitle", "Combat Control"),
      } as any),
      content: [
        `<h3>${title}</h3>`,
        ...lines.map((line) => `<p>${line}</p>`),
      ].join(""),
    });
  }
}
