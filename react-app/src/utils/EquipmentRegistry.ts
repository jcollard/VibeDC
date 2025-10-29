import { Equipment, type EquipmentType } from '../models/combat/Equipment';

/**
 * Interface for equipment definition data (used for YAML parsing and export)
 */
export interface EquipmentDefinition {
  id: string;
  name: string;
  type: EquipmentType;
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
  allowedClasses?: string[];
  minRange?: number;
  maxRange?: number;
  typeTags?: string[];
}

/**
 * Utility wrapper around Equipment's built-in registry
 * Provides additional functionality for managing equipment in developer tools
 */
export class EquipmentRegistry {
  /**
   * Register a new equipment or update an existing one
   */
  static register(definition: EquipmentDefinition): Equipment {
    // Check if equipment already exists
    const existing = Equipment.getById(definition.id);
    if (existing) {
      // If it exists, we need to unregister it first
      this.unregister(definition.id);
    }

    // Create new equipment (automatically registers itself)
    return new Equipment(
      definition.name,
      definition.type,
      definition.modifiers,
      definition.multipliers,
      new Set(definition.allowedClasses || []),
      definition.id,
      definition.minRange,
      definition.maxRange,
      definition.typeTags
    );
  }

  /**
   * Unregister equipment by ID
   */
  static unregister(id: string): boolean {
    const equipment = Equipment.getById(id);
    if (!equipment) return false;

    // Get all equipment BEFORE clearing
    const allEquipment = Equipment.getAll();

    // Clear the registry
    Equipment.clearRegistry();

    // Re-register all equipment except the one we're removing
    allEquipment.forEach(e => {
      if (e.id !== id) {
        new Equipment(
          e.name,
          e.type,
          {
            health: e.modifiers.healthModifier,
            mana: e.modifiers.manaModifier,
            physicalPower: e.modifiers.physicalPowerModifier,
            magicPower: e.modifiers.magicPowerModifier,
            speed: e.modifiers.speedModifier,
            movement: e.modifiers.movementModifier,
            physicalEvade: e.modifiers.physicalEvadeModifier,
            magicEvade: e.modifiers.magicEvadeModifier,
            courage: e.modifiers.courageModifier,
            attunement: e.modifiers.attunementModifier,
          },
          {
            health: e.modifiers.healthMultiplier,
            mana: e.modifiers.manaMultiplier,
            physicalPower: e.modifiers.physicalPowerMultiplier,
            magicPower: e.modifiers.magicPowerMultiplier,
            speed: e.modifiers.speedMultiplier,
            movement: e.modifiers.movementMultiplier,
            physicalEvade: e.modifiers.physicalEvadeMultiplier,
            magicEvade: e.modifiers.magicEvadeMultiplier,
            courage: e.modifiers.courageMultiplier,
            attunement: e.modifiers.attunementMultiplier,
          },
          new Set(e.allowedClasses),
          e.id,
          e.minRange,
          e.maxRange,
          Array.from(e.typeTags)
        );
      }
    });

    return true;
  }

  /**
   * Check if equipment exists
   */
  static has(id: string): boolean {
    return Equipment.getById(id) !== undefined;
  }

  /**
   * Get equipment by ID
   */
  static getById(id: string): Equipment | undefined {
    return Equipment.getById(id);
  }

  /**
   * Get all equipment
   */
  static getAll(): Equipment[] {
    return Equipment.getAll();
  }

  /**
   * Get equipment filtered by type
   */
  static getByType(type: EquipmentType): Equipment[] {
    return Equipment.getAll().filter(e => e.type === type);
  }

  /**
   * Convert an Equipment to an EquipmentDefinition
   */
  static toDefinition(equipment: Equipment): EquipmentDefinition {
    const definition: EquipmentDefinition = {
      id: equipment.id,
      name: equipment.name,
      type: equipment.type,
    };

    // Add modifiers if any exist
    const modifiers: any = {};
    if (equipment.modifiers.healthModifier) modifiers.health = equipment.modifiers.healthModifier;
    if (equipment.modifiers.manaModifier) modifiers.mana = equipment.modifiers.manaModifier;
    if (equipment.modifiers.physicalPowerModifier) modifiers.physicalPower = equipment.modifiers.physicalPowerModifier;
    if (equipment.modifiers.magicPowerModifier) modifiers.magicPower = equipment.modifiers.magicPowerModifier;
    if (equipment.modifiers.speedModifier) modifiers.speed = equipment.modifiers.speedModifier;
    if (equipment.modifiers.movementModifier) modifiers.movement = equipment.modifiers.movementModifier;
    if (equipment.modifiers.physicalEvadeModifier) modifiers.physicalEvade = equipment.modifiers.physicalEvadeModifier;
    if (equipment.modifiers.magicEvadeModifier) modifiers.magicEvade = equipment.modifiers.magicEvadeModifier;
    if (equipment.modifiers.courageModifier) modifiers.courage = equipment.modifiers.courageModifier;
    if (equipment.modifiers.attunementModifier) modifiers.attunement = equipment.modifiers.attunementModifier;

    if (Object.keys(modifiers).length > 0) {
      definition.modifiers = modifiers;
    }

    // Add multipliers if any exist
    const multipliers: any = {};
    if (equipment.modifiers.healthMultiplier !== 1) multipliers.health = equipment.modifiers.healthMultiplier;
    if (equipment.modifiers.manaMultiplier !== 1) multipliers.mana = equipment.modifiers.manaMultiplier;
    if (equipment.modifiers.physicalPowerMultiplier !== 1) multipliers.physicalPower = equipment.modifiers.physicalPowerMultiplier;
    if (equipment.modifiers.magicPowerMultiplier !== 1) multipliers.magicPower = equipment.modifiers.magicPowerMultiplier;
    if (equipment.modifiers.speedMultiplier !== 1) multipliers.speed = equipment.modifiers.speedMultiplier;
    if (equipment.modifiers.movementMultiplier !== 1) multipliers.movement = equipment.modifiers.movementMultiplier;
    if (equipment.modifiers.physicalEvadeMultiplier !== 1) multipliers.physicalEvade = equipment.modifiers.physicalEvadeMultiplier;
    if (equipment.modifiers.magicEvadeMultiplier !== 1) multipliers.magicEvade = equipment.modifiers.magicEvadeMultiplier;
    if (equipment.modifiers.courageMultiplier !== 1) multipliers.courage = equipment.modifiers.courageMultiplier;
    if (equipment.modifiers.attunementMultiplier !== 1) multipliers.attunement = equipment.modifiers.attunementMultiplier;

    if (Object.keys(multipliers).length > 0) {
      definition.multipliers = multipliers;
    }

    // Add allowed classes if any exist
    if (equipment.allowedClasses.size > 0) {
      definition.allowedClasses = Array.from(equipment.allowedClasses);
    }

    // Add weapon range if it exists
    if (equipment.minRange !== undefined) {
      definition.minRange = equipment.minRange;
    }
    if (equipment.maxRange !== undefined) {
      definition.maxRange = equipment.maxRange;
    }

    // Add type tags if any exist
    if (equipment.typeTags && equipment.typeTags.length > 0) {
      definition.typeTags = Array.from(equipment.typeTags);
    }

    return definition;
  }
}
