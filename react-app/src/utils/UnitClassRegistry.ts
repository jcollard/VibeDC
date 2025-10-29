import { UnitClass } from '../models/combat/UnitClass';
import { CombatAbility } from '../models/combat/CombatAbility';

/**
 * Definition format for exporting/importing unit classes
 */
export interface UnitClassDefinition {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  learnableAbilities?: string[];
  modifiers?: {
    health?: number;
    mana?: number;
    physicalPower?: number;
    magicPower?: number;
    speed?: number;
    movement?: number;
    physicalEvade?: number;
    magicEvade?: number;
    courage?: number;
    attunement?: number;
  };
  multipliers?: {
    health?: number;
    mana?: number;
    physicalPower?: number;
    magicPower?: number;
    speed?: number;
    movement?: number;
    physicalEvade?: number;
    magicEvade?: number;
    courage?: number;
    attunement?: number;
  };
  requirements?: { [classId: string]: number };
  allowedEquipmentTypes?: string[];
}

/**
 * Utility wrapper around UnitClass's built-in registry for developer tools
 */
export class UnitClassRegistry {
  /**
   * Register a new unit class from a definition
   */
  static register(definition: UnitClassDefinition): UnitClass {
    // Get learnable abilities from their IDs
    const learnableAbilities: CombatAbility[] = [];
    if (definition.learnableAbilities) {
      for (const abilityId of definition.learnableAbilities) {
        const ability = CombatAbility.getById(abilityId);
        if (ability) {
          learnableAbilities.push(ability);
        }
      }
    }

    // Convert requirements to Map
    const requirements = new Map<string, number>();
    if (definition.requirements) {
      for (const [classId, xp] of Object.entries(definition.requirements)) {
        requirements.set(classId, xp);
      }
    }

    return new UnitClass(
      definition.name,
      definition.description,
      definition.tags || [],
      learnableAbilities,
      definition.modifiers,
      definition.multipliers,
      requirements,
      definition.id,
      definition.allowedEquipmentTypes
    );
  }

  /**
   * Unregister a unit class by ID
   * Returns true if the class was found and removed, false otherwise
   */
  static unregister(id: string): boolean {
    const unitClass = UnitClass.getById(id);
    if (!unitClass) {
      return false;
    }

    // Get all classes BEFORE clearing (BUG FIX - learned from previous registries!)
    const allClasses = UnitClass.getAll();

    // Clear the registry
    UnitClass.clearRegistry();

    // Re-register all classes except the one we're removing
    allClasses.forEach(c => {
      if (c.id !== id) {
        new UnitClass(
          c.name,
          c.description,
          [...c.tags],
          [...c.learnableAbilities],
          {
            health: c.modifiers.healthModifier,
            mana: c.modifiers.manaModifier,
            physicalPower: c.modifiers.physicalPowerModifier,
            magicPower: c.modifiers.magicPowerModifier,
            speed: c.modifiers.speedModifier,
            movement: c.modifiers.movementModifier,
            physicalEvade: c.modifiers.physicalEvadeModifier,
            magicEvade: c.modifiers.magicEvadeModifier,
            courage: c.modifiers.courageModifier,
            attunement: c.modifiers.attunementModifier,
          },
          {
            health: c.modifiers.healthMultiplier,
            mana: c.modifiers.manaMultiplier,
            physicalPower: c.modifiers.physicalPowerMultiplier,
            magicPower: c.modifiers.magicPowerMultiplier,
            speed: c.modifiers.speedMultiplier,
            movement: c.modifiers.movementMultiplier,
            physicalEvade: c.modifiers.physicalEvadeMultiplier,
            magicEvade: c.modifiers.magicEvadeMultiplier,
            courage: c.modifiers.courageMultiplier,
            attunement: c.modifiers.attunementMultiplier,
          },
          new Map(c.requirements),
          c.id,
          [...c.allowedEquipmentTypes]
        );
      }
    });

    return true;
  }

  /**
   * Check if a class with the given ID exists in the registry
   */
  static has(id: string): boolean {
    return UnitClass.getById(id) !== undefined;
  }

  /**
   * Get a class by ID
   */
  static getById(id: string): UnitClass | undefined {
    return UnitClass.getById(id);
  }

  /**
   * Get all registered classes
   */
  static getAll(): UnitClass[] {
    return UnitClass.getAll();
  }

  /**
   * Get classes filtered by tag
   */
  static getByTag(tag: string): UnitClass[] {
    return UnitClass.getAll().filter(c => c.tags.includes(tag));
  }

  /**
   * Convert a UnitClass to a definition format suitable for export
   */
  static toDefinition(unitClass: UnitClass): UnitClassDefinition {
    const definition: UnitClassDefinition = {
      id: unitClass.id,
      name: unitClass.name,
      description: unitClass.description,
    };

    // Add tags if any exist
    if (unitClass.tags.length > 0) {
      definition.tags = [...unitClass.tags];
    }

    // Add learnable abilities as IDs
    if (unitClass.learnableAbilities.length > 0) {
      definition.learnableAbilities = unitClass.learnableAbilities.map(a => a.id);
    }

    // Add modifiers if any exist
    const modifiers: any = {};
    if (unitClass.modifiers.healthModifier) modifiers.health = unitClass.modifiers.healthModifier;
    if (unitClass.modifiers.manaModifier) modifiers.mana = unitClass.modifiers.manaModifier;
    if (unitClass.modifiers.physicalPowerModifier) modifiers.physicalPower = unitClass.modifiers.physicalPowerModifier;
    if (unitClass.modifiers.magicPowerModifier) modifiers.magicPower = unitClass.modifiers.magicPowerModifier;
    if (unitClass.modifiers.speedModifier) modifiers.speed = unitClass.modifiers.speedModifier;
    if (unitClass.modifiers.movementModifier) modifiers.movement = unitClass.modifiers.movementModifier;
    if (unitClass.modifiers.physicalEvadeModifier) modifiers.physicalEvade = unitClass.modifiers.physicalEvadeModifier;
    if (unitClass.modifiers.magicEvadeModifier) modifiers.magicEvade = unitClass.modifiers.magicEvadeModifier;
    if (unitClass.modifiers.courageModifier) modifiers.courage = unitClass.modifiers.courageModifier;
    if (unitClass.modifiers.attunementModifier) modifiers.attunement = unitClass.modifiers.attunementModifier;

    if (Object.keys(modifiers).length > 0) {
      definition.modifiers = modifiers;
    }

    // Add multipliers if any exist (only if not 1.0)
    const multipliers: any = {};
    if (unitClass.modifiers.healthMultiplier !== 1.0) multipliers.health = unitClass.modifiers.healthMultiplier;
    if (unitClass.modifiers.manaMultiplier !== 1.0) multipliers.mana = unitClass.modifiers.manaMultiplier;
    if (unitClass.modifiers.physicalPowerMultiplier !== 1.0) multipliers.physicalPower = unitClass.modifiers.physicalPowerMultiplier;
    if (unitClass.modifiers.magicPowerMultiplier !== 1.0) multipliers.magicPower = unitClass.modifiers.magicPowerMultiplier;
    if (unitClass.modifiers.speedMultiplier !== 1.0) multipliers.speed = unitClass.modifiers.speedMultiplier;
    if (unitClass.modifiers.movementMultiplier !== 1.0) multipliers.movement = unitClass.modifiers.movementMultiplier;
    if (unitClass.modifiers.physicalEvadeMultiplier !== 1.0) multipliers.physicalEvade = unitClass.modifiers.physicalEvadeMultiplier;
    if (unitClass.modifiers.magicEvadeMultiplier !== 1.0) multipliers.magicEvade = unitClass.modifiers.magicEvadeMultiplier;
    if (unitClass.modifiers.courageMultiplier !== 1.0) multipliers.courage = unitClass.modifiers.courageMultiplier;
    if (unitClass.modifiers.attunementMultiplier !== 1.0) multipliers.attunement = unitClass.modifiers.attunementMultiplier;

    if (Object.keys(multipliers).length > 0) {
      definition.multipliers = multipliers;
    }

    // Add requirements if any exist
    if (unitClass.requirements.size > 0) {
      definition.requirements = {};
      for (const [classId, xp] of unitClass.requirements) {
        definition.requirements[classId] = xp;
      }
    }

    // Add allowed equipment types if any exist
    if (unitClass.allowedEquipmentTypes.length > 0) {
      definition.allowedEquipmentTypes = [...unitClass.allowedEquipmentTypes];
    }

    return definition;
  }
}
