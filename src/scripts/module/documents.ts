import {
  applyAttributeDamage as applyTrackedAttributeDamage,
  getActorDefenseValue,
  healAttributeDamage,
  isActorDead,
  preventDamageWithCards,
  type NGHTrackedAttributeKey
} from "./mechanics/attribute-tracks.js";

export class NGHActor extends Actor {
  override prepareDerivedData(): void {
    super.prepareDerivedData();

    if ((this as any).type === "npc") {
      const system = this.system as {
        attributes?: {
          krzepa?: { value: number; max: number };
          spryt?: { value: number; max: number };
          hart?: { value: number; max: number };
        };
      };

      const attributes = system.attributes;
      if (!attributes) return;

      for (const key of ["krzepa", "spryt", "hart"] as const) {
        const attribute = attributes[key];
        if (!attribute) continue;
        attribute.max = Math.max(0, Math.floor(attribute.max));
        attribute.value = Math.clamp(Math.floor(attribute.value), 0, Math.max(attribute.max, 0));
      }
      return;
    }

    const system = this.system as {
      attributes?: {
        krzepa?: { value: number; max: number };
        spryt?: { value: number; max: number };
        hart?: { value: number; max: number };
      };
      corruption?: number;
      armor?: number;
    };

    const attributes = system.attributes;
    if (!attributes) return;

    for (const key of ["krzepa", "spryt", "hart"] as const) {
      const attribute = attributes[key];
      if (!attribute) continue;
      attribute.max = Math.max(1, Math.floor(attribute.max));
      attribute.value = Math.clamp(Math.floor(attribute.value), 0, attribute.max);
    }

    system.armor = Math.max(0, Math.floor(system.armor ?? 0));
    system.corruption = Math.clamp(Math.floor(system.corruption ?? 0), 0, 5);
  }

  getDefenseValue(attribute: NGHTrackedAttributeKey, options?: { physical?: boolean }): number {
    return getActorDefenseValue(this, attribute, options);
  }

  async applyAttributeDamage(attribute: NGHTrackedAttributeKey, damage: number) {
    return applyTrackedAttributeDamage(this, attribute, damage);
  }

  async healAttributeDamage(attribute: NGHTrackedAttributeKey, healing: number) {
    return healAttributeDamage(this, attribute, healing);
  }

  async preventDamageWithCards(attribute: NGHTrackedAttributeKey, incomingDamage: number, cards: string[], userId?: string) {
    return preventDamageWithCards(this, attribute, incomingDamage, cards, userId);
  }

  get isDead(): boolean {
    return isActorDead(this);
  }
}

export class NGHItem extends Item {}
