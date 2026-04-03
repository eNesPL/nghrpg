import { discardFromHand, drawFromSharedDeck, getUserHand, transferCardsBetweenHands } from "../module/mechanics/shared-deck.js";
const NGH_SYSTEM_ID = "nghrpg";
const normalizeRewardText = (value) => value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
const parseReward = (reward) => {
    const normalized = normalizeRewardText(reward);
    if (!normalized || normalized === "brak")
        return { kind: "none" };
    if (normalized === "jedna karta")
        return { kind: "slayer", cards: 1 };
    if (normalized === "jedna karta dla kazdego uczestnika walki")
        return { kind: "each-combatant", cards: 1 };
    if (normalized === "jedna karta dla oddzialu za kazda grupe")
        return { kind: "squad", mode: "per-group" };
    if (normalized === "jedna karta dla oddzialu za kazde trzy zabite/przepedzone") {
        return { kind: "squad", mode: "per-three-defeated" };
    }
    if (normalized === "kazda postac: dobierz 1 karte albo ulecz 1 spaczenia") {
        return { kind: "each-character-choice" };
    }
    if (normalized === "dobierz 2 karty, zachowaj 1") {
        return { kind: "draw-keep", drawCount: 2, keepCount: 1 };
    }
    if (normalized === "dobierz 2 karty; zachowaj 1, odrzuc 1") {
        return { kind: "draw-keep-discard", drawCount: 2, keepCount: 1, discardCount: 1 };
    }
    if (normalized === "dobierz 3 karty: 1 zachowaj, 1 oddaj, 1 odrzuc") {
        return { kind: "draw-keep-give-discard", drawCount: 3, keepCount: 1, giveCount: 1, discardCount: 1 };
    }
    const simpleDrawMatch = normalized.match(/^dobierz (\d+) karty?$/);
    if (simpleDrawMatch) {
        return { kind: "slayer", cards: Math.max(1, Number.parseInt(simpleDrawMatch[1], 10)) };
    }
    return { kind: "none" };
};
const removeOneCard = (cards, target) => {
    const next = [...cards];
    const index = next.indexOf(target);
    if (index >= 0)
        next.splice(index, 1);
    return next;
};
export class NGHNPCSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
    _formSaveTimer = null;
    t(key, fallback) {
        const localized = game.i18n?.localize(key);
        return localized && localized !== key ? localized : fallback;
    }
    tf(key, data, fallback) {
        const localized = game.i18n?.format(key, data);
        return localized && localized !== key ? localized : fallback;
    }
    escapeHtml(value) {
        return value
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }
    getDialogRoot(dialog) {
        if (dialog instanceof HTMLElement)
            return dialog;
        if (dialog?.element instanceof HTMLElement)
            return dialog.element;
        if (dialog?.element?.[0] instanceof HTMLElement)
            return dialog.element[0];
        return null;
    }
    getEligibleUsers() {
        return Array.from((game.users?.contents ?? []))
            .filter((user) => user?.id && user.active && !user.isGM)
            .map((user) => ({
            id: String(user.id),
            name: String(user.name ?? user.id),
            actor: user.character ?? null
        }));
    }
    async promptConfirm(message) {
        const safeMessage = this.escapeHtml(message).replace(/\n/g, "<br />");
        const result = await foundry.applications.api.DialogV2.confirm({
            window: { title: this.t("NGH.Dialog.ConfirmTitle", "Confirm") },
            content: `<p>${safeMessage}</p>`,
            yes: { action: "yes", label: game.i18n?.localize("Yes") ?? "Yes", default: true },
            no: { action: "no", label: game.i18n?.localize("No") ?? "No" },
            rejectClose: false,
        });
        return result === true;
    }
    async promptNumber(message, fallback) {
        const safeMessage = this.escapeHtml(message);
        const result = await foundry.applications.api.DialogV2.prompt({
            window: { title: this.t("NGH.Dialog.InputTitle", "Input") },
            content: `<form class="ngh-dialog"><p>${safeMessage}</p><input type="number" name="value" value="${fallback}" min="0" step="1" /></form>`,
            ok: {
                label: game.i18n?.localize("OK") ?? "OK",
                callback: (_event, _button, dialog) => {
                    const root = this.getDialogRoot(dialog);
                    const input = root?.querySelector("input[name='value']");
                    return input?.value ?? String(fallback);
                },
            },
            rejectClose: false,
        });
        if (result === null)
            return null;
        const parsed = Number.parseInt(String(result), 10);
        return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
    }
    async promptSingleRecipient(users, title, message, defaultUserId) {
        const options = users
            .map((user) => {
            const selected = user.id === defaultUserId ? " selected" : "";
            return `<option value="${this.escapeHtml(user.id)}"${selected}>${this.escapeHtml(user.name)}</option>`;
        })
            .join("");
        const result = await foundry.applications.api.DialogV2.prompt({
            window: { title },
            content: `<form class="ngh-dialog">
        <p>${this.escapeHtml(message)}</p>
        <select name="recipient" style="width:100%;">${options}</select>
      </form>`,
            ok: {
                label: this.t("NGH.Action.Confirm", "OK"),
                callback: (_event, _button, dialog) => {
                    const root = this.getDialogRoot(dialog);
                    const select = root?.querySelector("select[name='recipient']");
                    return select?.value ?? "";
                },
            },
            rejectClose: false,
        });
        return typeof result === "string" && result.length > 0 ? result : null;
    }
    async promptRecipients(users, count, reward) {
        const safeReward = this.escapeHtml(reward);
        const rows = Array.from({ length: count }, (_value, index) => {
            const options = users
                .map((user) => `<option value="${this.escapeHtml(user.id)}">${this.escapeHtml(user.name)}</option>`)
                .join("");
            return `
        <label style="display:block; margin:0 0 8px;">
          <span style="display:block; margin-bottom:4px;">${this.t("NGH.NPC.RewardGrant.CardRecipient", "Recipient")} ${index + 1}</span>
          <select name="recipient-${index}" style="width:100%;">${options}</select>
        </label>`;
        }).join("");
        const result = await foundry.applications.api.DialogV2.prompt({
            window: { title: this.t("NGH.NPC.RewardGrant.AssignTitle", "Assign Reward Cards") },
            content: `<form class="ngh-dialog">
        <p>${this.tf("NGH.NPC.RewardGrant.AssignPrompt", { count, reward: safeReward }, `Assign ${count} reward card(s) for: ${safeReward}`)}</p>
        <p>${this.t("NGH.NPC.RewardGrant.AssignHint", "A reward card belongs to the squad pool. Choose who receives each one.")}</p>
        ${rows}
      </form>`,
            ok: {
                label: this.t("NGH.Action.Confirm", "OK"),
                callback: (_event, _button, dialog) => {
                    const root = this.getDialogRoot(dialog);
                    const recipients = [];
                    for (let index = 0; index < count; index += 1) {
                        const select = root?.querySelector(`select[name='recipient-${index}']`);
                        if (select?.value)
                            recipients.push(select.value);
                    }
                    return recipients;
                },
            },
            rejectClose: false,
        });
        if (!Array.isArray(result) || result.length !== count)
            return null;
        return result.every((value) => typeof value === "string" && value.length > 0) ? result : null;
    }
    async promptParticipantSelection(users, reward) {
        const rows = users
            .map((user) => `
          <label style="display:block; margin:0 0 6px;">
            <input type="checkbox" name="participant" value="${this.escapeHtml(user.id)}" />
            ${this.escapeHtml(user.name)}
          </label>`)
            .join("");
        const result = await foundry.applications.api.DialogV2.prompt({
            window: { title: this.t("NGH.NPC.RewardGrant.CombatantsTitle", "Combat Participants") },
            content: `<form class="ngh-dialog">
        <p>${this.tf("NGH.NPC.RewardGrant.CombatantsPrompt", { reward: this.escapeHtml(reward) }, `Select combat participants for reward: ${this.escapeHtml(reward)}`)}</p>
        ${rows}
      </form>`,
            ok: {
                label: this.t("NGH.Action.Confirm", "OK"),
                callback: (_event, _button, dialog) => {
                    const root = this.getDialogRoot(dialog);
                    return Array.from(root?.querySelectorAll("input[name='participant']:checked") ?? [])
                        .map((input) => input.value)
                        .filter((value) => typeof value === "string" && value.length > 0);
                },
            },
            rejectClose: false,
        });
        return Array.isArray(result) ? result : null;
    }
    async promptCharacterRewardChoices(users, reward) {
        const rows = users
            .map((user) => {
            const options = user.actor
                ? `
            <option value="draw">${this.t("NGH.NPC.RewardGrant.ChoiceDraw", "Draw 1 card")}</option>
            <option value="heal">${this.t("NGH.NPC.RewardGrant.ChoiceHeal", "Heal 1 Corruption")}</option>`
                : `<option value="draw">${this.t("NGH.NPC.RewardGrant.ChoiceDraw", "Draw 1 card")}</option>`;
            return `
          <label style="display:block; margin:0 0 8px;">
            <span style="display:block; margin-bottom:4px;">${this.escapeHtml(user.name)}</span>
            <select name="choice-${this.escapeHtml(user.id)}" style="width:100%;">${options}</select>
          </label>`;
        })
            .join("");
        const result = await foundry.applications.api.DialogV2.prompt({
            window: { title: this.t("NGH.NPC.RewardGrant.CharacterChoiceTitle", "Resolve Character Rewards") },
            content: `<form class="ngh-dialog">
        <p>${this.tf("NGH.NPC.RewardGrant.CharacterChoicePrompt", { reward: this.escapeHtml(reward) }, `Resolve reward for each character: ${this.escapeHtml(reward)}`)}</p>
        ${rows}
      </form>`,
            ok: {
                label: this.t("NGH.Action.Confirm", "OK"),
                callback: (_event, _button, dialog) => {
                    const root = this.getDialogRoot(dialog);
                    const choices = {};
                    for (const user of users) {
                        const select = root?.querySelector(`select[name='choice-${CSS.escape(user.id)}']`);
                        const value = select?.value === "heal" ? "heal" : "draw";
                        choices[user.id] = value;
                    }
                    return choices;
                },
            },
            rejectClose: false,
        });
        if (!result || typeof result !== "object")
            return null;
        return result;
    }
    async promptCardChoice(title, message, cards, count = 1) {
        const rows = cards
            .map((card, index) => `
          <label style="display:block; margin:0 0 6px;">
            <input type="${count === 1 ? "radio" : "checkbox"}" name="card-choice" value="${index}" />
            ${this.escapeHtml(card)}
          </label>`)
            .join("");
        const result = await foundry.applications.api.DialogV2.prompt({
            window: { title },
            content: `<form class="ngh-dialog">
        <p>${this.escapeHtml(message)}</p>
        ${rows}
      </form>`,
            ok: {
                label: this.t("NGH.Action.Confirm", "OK"),
                callback: (_event, _button, dialog) => {
                    const root = this.getDialogRoot(dialog);
                    return Array.from(root?.querySelectorAll("input[name='card-choice']:checked") ?? [])
                        .map((input) => Number.parseInt(input.value, 10))
                        .filter((value) => Number.isFinite(value))
                        .map((index) => cards[index])
                        .filter((card) => typeof card === "string" && card.length > 0);
                },
            },
            rejectClose: false,
        });
        if (!Array.isArray(result) || result.length < 1)
            return null;
        return count === 1 ? [result[0]] : result.slice(0, count);
    }
    async createChatMessage(title, lines) {
        await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ alias: String(this.actor.name) }),
            content: [`<h3>${this.escapeHtml(title)}</h3>`, ...lines.map((line) => `<p>${this.escapeHtml(line)}</p>`)].join(""),
        });
    }
    async grantCardsToRecipients(users, recipients) {
        const results = [];
        for (const recipientId of recipients) {
            const user = users.find((candidate) => candidate.id === recipientId);
            if (!user) {
                results.push({ name: recipientId, drawn: 0, cards: [] });
                continue;
            }
            try {
                const result = await drawFromSharedDeck(user.id, 1);
                results.push({ name: user.name, drawn: result.drawn.length, cards: [...result.drawn] });
            }
            catch (error) {
                console.error("nghrpg | Failed to grant reward to", user.name, error);
                results.push({ name: user.name, drawn: 0, cards: [] });
            }
        }
        return results;
    }
    async resolveSlayerReward(users, reward, cards) {
        const recipientId = await this.promptSingleRecipient(users, this.t("NGH.NPC.RewardGrant.SlayerTitle", "Finishing Blow"), this.t("NGH.NPC.RewardGrant.SlayerPrompt", "Who dealt the finishing blow?"));
        if (!recipientId)
            return null;
        const recipient = users.find((user) => user.id === recipientId);
        if (!recipient)
            return null;
        const results = [];
        for (let index = 0; index < cards; index += 1) {
            const drawResult = await drawFromSharedDeck(recipient.id, 1);
            results.push({ name: recipient.name, drawn: drawResult.drawn.length, cards: [...drawResult.drawn] });
        }
        const total = results.reduce((sum, entry) => sum + entry.drawn, 0);
        return {
            title: this.t("NGH.NPC.RewardGrant.ChatTitle", "Enemy Reward"),
            lines: [
                reward,
                this.tf("NGH.NPC.RewardGrant.SlayerSummary", { name: recipient.name, count: total }, `${recipient.name} receives ${total} card(s).`),
                ...results.flatMap((entry) => entry.cards.map((card) => `${entry.name}: ${card}`))
            ]
        };
    }
    async resolveSquadReward(users, reward, mode) {
        const prompt = mode === "per-group"
            ? this.t("NGH.NPC.RewardGrant.GroupCountPrompt", "How many qualifying enemy groups were defeated?")
            : this.t("NGH.NPC.RewardGrant.DefeatedCountPrompt", "How many enemies were killed or driven off?");
        const rawCount = await this.promptNumber(prompt, 1);
        if (rawCount === null)
            return null;
        const cardCount = mode === "per-group" ? rawCount : Math.floor(rawCount / 3);
        if (cardCount < 1) {
            ui.notifications?.info(this.t("NGH.NPC.RewardGrant.NoCardsCalculated", "This result grants no reward cards."));
            return null;
        }
        const recipients = await this.promptRecipients(users, cardCount, reward);
        if (!recipients)
            return null;
        const results = await this.grantCardsToRecipients(users, recipients);
        return {
            title: this.t("NGH.NPC.RewardGrant.ChatTitle", "Enemy Reward"),
            lines: [
                reward,
                this.tf("NGH.NPC.RewardGrant.SquadSummary", { count: cardCount }, `Squad reward cards: ${cardCount}`),
                ...results.map((entry) => entry.drawn > 0
                    ? `${entry.name}: ${entry.cards.join(", ")}`
                    : `${entry.name}: ${this.t("NGH.Common.None", "none")}`)
            ]
        };
    }
    async resolveEachCombatantReward(users, reward, cards) {
        const participantIds = await this.promptParticipantSelection(users, reward);
        if (!participantIds || participantIds.length < 1)
            return null;
        const recipients = participantIds.flatMap((userId) => Array.from({ length: cards }, () => userId));
        const results = await this.grantCardsToRecipients(users, recipients);
        return {
            title: this.t("NGH.NPC.RewardGrant.ChatTitle", "Enemy Reward"),
            lines: [
                reward,
                ...results.map((entry) => entry.drawn > 0
                    ? `${entry.name}: ${entry.cards.join(", ")}`
                    : `${entry.name}: ${this.t("NGH.Common.None", "none")}`)
            ]
        };
    }
    async resolveEachCharacterChoice(users, reward) {
        const choices = await this.promptCharacterRewardChoices(users, reward);
        if (!choices)
            return null;
        const lines = [reward];
        for (const user of users) {
            const choice = choices[user.id] === "heal" ? "heal" : "draw";
            if (choice === "heal" && user.actor) {
                const current = Number(user.actor.system?.corruption ?? 0);
                const next = Math.max(0, current - 1);
                await user.actor.update({ "system.corruption": next });
                lines.push(`${user.name}: ${this.t("NGH.NPC.RewardGrant.HealedCorruption", "heals 1 Corruption")} (${current} -> ${next})`);
                continue;
            }
            const result = await drawFromSharedDeck(user.id, 1);
            lines.push(result.drawn.length > 0
                ? `${user.name}: ${result.drawn.join(", ")}`
                : `${user.name}: ${this.t("NGH.Common.None", "none")}`);
        }
        return {
            title: this.t("NGH.NPC.RewardGrant.ChatTitle", "Enemy Reward"),
            lines
        };
    }
    async resolveDrawKeepReward(users, reward, drawCount, keepCount, discardCount) {
        const recipientId = await this.promptSingleRecipient(users, this.t("NGH.NPC.RewardGrant.SlayerTitle", "Finishing Blow"), this.t("NGH.NPC.RewardGrant.SlayerPrompt", "Who dealt the finishing blow?"));
        if (!recipientId)
            return null;
        const recipient = users.find((user) => user.id === recipientId);
        if (!recipient)
            return null;
        const drawResult = await drawFromSharedDeck(recipient.id, drawCount);
        const drawnCards = [...drawResult.drawn];
        if (drawnCards.length < 1) {
            ui.notifications?.warn(this.t("NGH.NPC.RewardGrant.NoCardsDrawn", "No reward cards could be drawn."));
            return null;
        }
        const keptSelection = await this.promptCardChoice(this.t("NGH.NPC.RewardGrant.KeepCardTitle", "Keep Card"), this.tf("NGH.NPC.RewardGrant.KeepCardPrompt", { name: recipient.name }, `Choose which card ${recipient.name} keeps.`), drawnCards, keepCount);
        if (!keptSelection || keptSelection.length < 1)
            return null;
        let remainingCards = [...drawnCards];
        for (const card of keptSelection) {
            remainingCards = removeOneCard(remainingCards, card);
        }
        const toDiscard = remainingCards.slice(0, discardCount);
        if (toDiscard.length > 0) {
            await discardFromHand(toDiscard, recipient.id);
        }
        return {
            title: this.t("NGH.NPC.RewardGrant.ChatTitle", "Enemy Reward"),
            lines: [
                reward,
                this.tf("NGH.NPC.RewardGrant.DrawnCards", { name: recipient.name, cards: drawnCards.join(", ") }, `${recipient.name} drew: ${drawnCards.join(", ")}`),
                this.tf("NGH.NPC.RewardGrant.KeptCards", { name: recipient.name, cards: keptSelection.join(", ") }, `${recipient.name} kept: ${keptSelection.join(", ")}`),
                ...(toDiscard.length > 0
                    ? [this.tf("NGH.NPC.RewardGrant.DiscardedCards", { cards: toDiscard.join(", ") }, `Discarded: ${toDiscard.join(", ")}`)]
                    : [])
            ]
        };
    }
    async resolveDrawKeepGiveDiscardReward(users, reward, drawCount, keepCount, giveCount, discardCount) {
        const primaryRecipientId = await this.promptSingleRecipient(users, this.t("NGH.NPC.RewardGrant.SlayerTitle", "Finishing Blow"), this.t("NGH.NPC.RewardGrant.SlayerPrompt", "Who dealt the finishing blow?"));
        if (!primaryRecipientId)
            return null;
        const primaryRecipient = users.find((user) => user.id === primaryRecipientId);
        if (!primaryRecipient)
            return null;
        const giftCandidates = users.filter((user) => user.id !== primaryRecipientId);
        if (giftCandidates.length < 1) {
            ui.notifications?.warn(this.t("NGH.NPC.RewardGrant.NoGiftRecipient", "No other squad member is available to receive a gifted card."));
            return null;
        }
        const giftRecipientId = await this.promptSingleRecipient(giftCandidates, this.t("NGH.NPC.RewardGrant.GiftTitle", "Gift Card"), this.t("NGH.NPC.RewardGrant.GiftPrompt", "Who receives the gifted reward card?"));
        if (!giftRecipientId)
            return null;
        if (getUserHand(giftRecipientId).length >= 7) {
            ui.notifications?.warn(this.t("NGH.NPC.RewardGrant.RecipientHandFull", "The chosen recipient already has a full hand."));
            return null;
        }
        const giftRecipient = users.find((user) => user.id === giftRecipientId);
        if (!giftRecipient)
            return null;
        const drawResult = await drawFromSharedDeck(primaryRecipient.id, drawCount);
        const drawnCards = [...drawResult.drawn];
        if (drawnCards.length < 1) {
            ui.notifications?.warn(this.t("NGH.NPC.RewardGrant.NoCardsDrawn", "No reward cards could be drawn."));
            return null;
        }
        const keptSelection = await this.promptCardChoice(this.t("NGH.NPC.RewardGrant.KeepCardTitle", "Keep Card"), this.tf("NGH.NPC.RewardGrant.KeepCardPrompt", { name: primaryRecipient.name }, `Choose which card ${primaryRecipient.name} keeps.`), drawnCards, keepCount);
        if (!keptSelection || keptSelection.length < 1)
            return null;
        let remainingCards = [...drawnCards];
        for (const card of keptSelection) {
            remainingCards = removeOneCard(remainingCards, card);
        }
        const giftSelection = await this.promptCardChoice(this.t("NGH.NPC.RewardGrant.SelectGiftCardTitle", "Choose Gifted Card"), this.tf("NGH.NPC.RewardGrant.SelectGiftCardPrompt", { name: giftRecipient.name }, `Choose which card will be gifted to ${giftRecipient.name}.`), remainingCards, giveCount);
        if (!giftSelection || giftSelection.length < 1)
            return null;
        for (const card of giftSelection) {
            remainingCards = removeOneCard(remainingCards, card);
        }
        const transferResult = await transferCardsBetweenHands(giftSelection, primaryRecipient.id, giftRecipient.id);
        if (transferResult.transferred.length !== giftSelection.length) {
            throw new Error(this.t("NGH.NPC.RewardGrant.TransferFailed", "Could not transfer the selected reward card."));
        }
        const toDiscard = remainingCards.slice(0, discardCount);
        if (toDiscard.length > 0) {
            await discardFromHand(toDiscard, primaryRecipient.id);
        }
        return {
            title: this.t("NGH.NPC.RewardGrant.ChatTitle", "Enemy Reward"),
            lines: [
                reward,
                this.tf("NGH.NPC.RewardGrant.DrawnCards", { name: primaryRecipient.name, cards: drawnCards.join(", ") }, `${primaryRecipient.name} drew: ${drawnCards.join(", ")}`),
                this.tf("NGH.NPC.RewardGrant.KeptCards", { name: primaryRecipient.name, cards: keptSelection.join(", ") }, `${primaryRecipient.name} kept: ${keptSelection.join(", ")}`),
                this.tf("NGH.NPC.RewardGrant.GiftedCards", { from: primaryRecipient.name, to: giftRecipient.name, cards: giftSelection.join(", ") }, `${primaryRecipient.name} gifted ${giftSelection.join(", ")} to ${giftRecipient.name}`),
                ...(toDiscard.length > 0
                    ? [this.tf("NGH.NPC.RewardGrant.DiscardedCards", { cards: toDiscard.join(", ") }, `Discarded: ${toDiscard.join(", ")}`)]
                    : [])
            ]
        };
    }
    static DEFAULT_OPTIONS = {
        classes: ["ngh", "sheet", "npc"],
        position: { width: 760, height: 900 },
        window: { resizable: true },
    };
    static PARTS = {
        body: {
            template: "systems/nghrpg/templates/npc-sheet.html",
            forms: {
                "form.ngh": {
                    handler: NGHNPCSheet._onSubmitForm,
                    submitOnChange: true,
                    closeOnSubmit: false,
                },
            },
        },
    };
    static async _onSubmitForm(event, form, formData) {
        event.preventDefault();
        const expanded = foundry.utils.expandObject(formData.object);
        await this.actor.update(expanded);
    }
    async close(options) {
        if (this._formSaveTimer) {
            clearTimeout(this._formSaveTimer);
            this._formSaveTimer = null;
        }
        if (this.isEditable) {
            try {
                await this._persistOpenForm();
            }
            catch (error) {
                console.error("nghrpg | Failed to submit NPC sheet before close", error);
            }
        }
        return super.close(options);
    }
    async _persistOpenForm() {
        const form = this.element.querySelector("form.ngh");
        if (!form)
            return;
        const formData = new FormDataExtended(form);
        const updateData = foundry.utils.expandObject(formData.object);
        await this.actor.update(updateData);
    }
    _scheduleFormPersist(delayMs = 180) {
        if (!this.isEditable)
            return;
        if (this._formSaveTimer)
            clearTimeout(this._formSaveTimer);
        this._formSaveTimer = setTimeout(() => {
            this._formSaveTimer = null;
            void this._persistOpenForm().catch((error) => {
                console.error("nghrpg | Failed to auto-save NPC sheet form", error);
            });
        }, delayMs);
    }
    async _prepareContext(_options) {
        return {
            actor: this.actor,
            system: this.actor.system,
            cssClass: this.isEditable ? "editable" : "locked",
            systemId: NGH_SYSTEM_ID,
            isGM: game.user?.isGM ?? false,
        };
    }
    _onRender(_context, _options) {
        const root = this.element;
        const form = root.querySelector("form.ngh");
        if (form) {
            form.addEventListener("input", () => this._scheduleFormPersist());
            form.addEventListener("change", () => this._scheduleFormPersist(0));
        }
        root.querySelector("[data-action='grant-reward']")?.addEventListener("click", () => {
            void this._doGrantReward().catch((err) => {
                const msg = err instanceof Error ? err.message : this.t("NGH.Error.ActionFailed", "Action failed");
                console.error("nghrpg | Failed to grant NPC reward", err);
                ui.notifications?.error(msg);
            });
        });
    }
    async _doGrantReward() {
        const reward = String(this.actor.system.reward ?? "Brak").trim();
        const rewardSpec = parseReward(reward);
        if (rewardSpec.kind === "none") {
            ui.notifications?.info(this.t("NGH.NPC.RewardGrant.None", "This enemy has no reward to distribute."));
            return;
        }
        const users = this.getEligibleUsers();
        if (users.length === 0) {
            ui.notifications?.warn(this.t("NGH.NPC.RewardGrant.NoPlayers", "No active players connected."));
            return;
        }
        const confirmed = await this.promptConfirm(this.tf("NGH.NPC.RewardGrant.ResolvePrompt", { reward }, `Resolve reward: ${reward}`));
        if (!confirmed)
            return;
        let outcome = null;
        switch (rewardSpec.kind) {
            case "slayer":
                outcome = await this.resolveSlayerReward(users, reward, rewardSpec.cards);
                break;
            case "squad":
                outcome = await this.resolveSquadReward(users, reward, rewardSpec.mode);
                break;
            case "each-combatant":
                outcome = await this.resolveEachCombatantReward(users, reward, rewardSpec.cards);
                break;
            case "each-character-choice":
                outcome = await this.resolveEachCharacterChoice(users, reward);
                break;
            case "draw-keep":
                outcome = await this.resolveDrawKeepReward(users, reward, rewardSpec.drawCount, rewardSpec.keepCount, 0);
                break;
            case "draw-keep-discard":
                outcome = await this.resolveDrawKeepReward(users, reward, rewardSpec.drawCount, rewardSpec.keepCount, rewardSpec.discardCount);
                break;
            case "draw-keep-give-discard":
                outcome = await this.resolveDrawKeepGiveDiscardReward(users, reward, rewardSpec.drawCount, rewardSpec.keepCount, rewardSpec.giveCount, rewardSpec.discardCount);
                break;
            default:
                outcome = null;
                break;
        }
        if (!outcome)
            return;
        await this.createChatMessage(outcome.title, outcome.lines);
    }
}
