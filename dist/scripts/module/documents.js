import { applyAttributeDamage as applyTrackedAttributeDamage, getActorDefenseValue, healAttributeDamage, isActorDead, preventDamageWithCards } from "./mechanics/attribute-tracks.js";
export class NGHActor extends Actor {
    prepareDerivedData() {
        super.prepareDerivedData();
        if (this.type === "npc") {
            const system = this.system;
            const attributes = system.attributes;
            if (!attributes)
                return;
            for (const key of ["krzepa", "spryt", "hart"]) {
                const attribute = attributes[key];
                if (!attribute)
                    continue;
                attribute.max = Math.max(0, Math.floor(attribute.max));
                attribute.value = Math.clamp(Math.floor(attribute.value), 0, Math.max(attribute.max, 0));
            }
            return;
        }
        const system = this.system;
        const attributes = system.attributes;
        if (!attributes)
            return;
        for (const key of ["krzepa", "spryt", "hart"]) {
            const attribute = attributes[key];
            if (!attribute)
                continue;
            attribute.max = Math.max(1, Math.floor(attribute.max));
            attribute.value = Math.clamp(Math.floor(attribute.value), 0, attribute.max);
        }
        system.armor = Math.max(0, Math.floor(system.armor ?? 0));
        system.corruption = Math.clamp(Math.floor(system.corruption ?? 0), 0, 5);
    }
    getDefenseValue(attribute, options) {
        return getActorDefenseValue(this, attribute, options);
    }
    async applyAttributeDamage(attribute, damage) {
        return applyTrackedAttributeDamage(this, attribute, damage);
    }
    async healAttributeDamage(attribute, healing) {
        return healAttributeDamage(this, attribute, healing);
    }
    async preventDamageWithCards(attribute, incomingDamage, cards, userId) {
        return preventDamageWithCards(this, attribute, incomingDamage, cards, userId);
    }
    get isDead() {
        return isActorDead(this);
    }
}
export class NGHItem extends Item {
}
