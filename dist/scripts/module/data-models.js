const { BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;
const BaseTypeDataModel = foundry.abstract.TypeDataModel;
const createTrackedAttribute = (initial) => {
    return new SchemaField({
        value: new NumberField({ required: true, integer: true, min: 0, initial }),
        max: new NumberField({ required: true, integer: true, min: 1, initial })
    });
};
const createSkillSchema = () => {
    return new SchemaField({
        trained: new BooleanField({ required: true, initial: false }),
        rank: new NumberField({ required: true, integer: true, min: 0, max: 5, initial: 0 })
    });
};
const createWhisperPathSchema = () => {
    return new SchemaField({
        name: new StringField({ required: true, blank: true, initial: "" }),
        attribute: new StringField({ required: true, blank: true, initial: "" }),
        rank: new NumberField({ required: true, integer: true, min: 0, max: 5, initial: 0 }),
        knownSpells: new StringField({ required: true, blank: true, initial: "" }),
        notes: new StringField({ required: true, blank: true, initial: "" })
    });
};
class NGHActorTypeDataModel extends BaseTypeDataModel {
    static defineSchema() {
        return {
            attributes: new SchemaField({
                krzepa: createTrackedAttribute(4),
                spryt: createTrackedAttribute(3),
                hart: createTrackedAttribute(3)
            }),
            skills: new SchemaField({
                atletyka: createSkillSchema(),
                walkaWrecz: createSkillSchema(),
                skradanie: createSkillSchema(),
                komunikacja: createSkillSchema(),
                wiedza: createSkillSchema(),
                mechanika: createSkillSchema(),
                sledztwo: createSkillSchema(),
                walkaDystansowa: createSkillSchema(),
                transport: createSkillSchema(),
                szepty: createSkillSchema()
            }),
            records: new SchemaField({
                assignedEquipment: new StringField({ required: true, blank: true, initial: "" }),
                serviceRecord: new StringField({ required: true, blank: true, initial: "" }),
                personalHistory: new StringField({ required: true, blank: true, initial: "" })
            }),
            whispers: new SchemaField({
                first: createWhisperPathSchema(),
                second: createWhisperPathSchema(),
                third: createWhisperPathSchema()
            }),
            corruption: new NumberField({ required: true, integer: true, min: 0, max: 5, initial: 0 }),
            armor: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
            handSize: new NumberField({ required: true, integer: true, min: 0, max: 7, initial: 3 })
        };
    }
}
class NGHCharacterDataModel extends NGHActorTypeDataModel {
}
class NGHNPCDataModel extends BaseTypeDataModel {
    static defineSchema() {
        return {
            role: new StringField({ required: true, blank: false, initial: "group" }),
            initiative: new StringField({ required: true, blank: true, initial: "" }),
            armor: new StringField({ required: true, blank: true, initial: "Brak" }),
            reward: new StringField({ required: true, blank: true, initial: "Brak" }),
            weakSpot: new StringField({ required: true, blank: true, initial: "Brak" }),
            weapons: new StringField({ required: true, blank: true, initial: "" }),
            abilities: new StringField({ required: true, blank: true, initial: "" }),
            description: new StringField({ required: true, blank: true, initial: "" }),
            attributes: new SchemaField({
                krzepa: createTrackedAttribute(2),
                spryt: createTrackedAttribute(2),
                hart: createTrackedAttribute(2)
            })
        };
    }
}
class NGHItemTypeDataModel extends BaseTypeDataModel {
    static defineSchema() {
        return {
            description: new StringField({ required: true, blank: true, initial: "" }),
            tags: new StringField({ required: true, blank: true, initial: "" })
        };
    }
}
class NGHBurdenDataModel extends NGHItemTypeDataModel {
}
class NGHEquipmentDataModel extends NGHItemTypeDataModel {
}
class NGHScarDataModel extends NGHItemTypeDataModel {
}
export const NGHActorDataModels = {
    character: NGHCharacterDataModel,
    npc: NGHNPCDataModel
};
export const NGHItemDataModels = {
    burden: NGHBurdenDataModel,
    equipment: NGHEquipmentDataModel,
    scar: NGHScarDataModel
};
