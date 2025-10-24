import { HumanoidUnit } from '../models/combat/HumanoidUnit';
import type { CombatUnit } from '../models/combat/CombatUnit';
import { UnitClass } from '../models/combat/UnitClass';
import { CombatAbility } from '../models/combat/CombatAbility';
import { Equipment } from '../models/combat/Equipment';

/**
 * Definition for a party member template
 * Party members are always HumanoidUnits with equipment and abilities
 */
export interface PartyMemberDefinition {
  /**
   * Unique identifier for this party member template
   */
  id: string;

  /**
   * Display name for the party member
   */
  name: string;

  /**
   * Primary unit class ID
   */
  unitClassId: string;

  /**
   * Base stats for the party member
   */
  baseHealth: number;
  baseMana: number;
  basePhysicalPower: number;
  baseMagicPower: number;
  baseSpeed: number;
  baseMovement: number;
  basePhysicalEvade: number;
  baseMagicEvade: number;
  baseCourage: number;
  baseAttunement: number;

  /**
   * Sprite ID to render this party member
   */
  spriteId: string;

  /**
   * Optional ability IDs the party member knows
   */
  learnedAbilityIds?: string[];
  reactionAbilityId?: string;
  passiveAbilityId?: string;
  movementAbilityId?: string;

  /**
   * Optional secondary class ID
   */
  secondaryClassId?: string;

  /**
   * Optional equipment IDs
   */
  leftHandId?: string;
  rightHandId?: string;
  headId?: string;
  bodyId?: string;
  accessoryId?: string;

  /**
   * Optional experience values
   */
  totalExperience?: number;
  classExperience?: Record<string, number>;
  classExperienceSpent?: Record<string, number>;

  /**
   * Optional tags for categorization
   */
  tags?: string[];

  /**
   * Optional description
   */
  description?: string;
}

/**
 * JSON format for party member definitions in YAML/data files
 */
export interface PartyMemberDefinitionJSON {
  id: string;
  name: string;
  unitClassId: string;
  baseHealth: number;
  baseMana: number;
  basePhysicalPower: number;
  baseMagicPower: number;
  baseSpeed: number;
  baseMovement: number;
  basePhysicalEvade: number;
  baseMagicEvade: number;
  baseCourage: number;
  baseAttunement: number;
  spriteId: string;
  learnedAbilityIds?: string[];
  reactionAbilityId?: string;
  passiveAbilityId?: string;
  movementAbilityId?: string;
  secondaryClassId?: string;
  leftHandId?: string;
  rightHandId?: string;
  headId?: string;
  bodyId?: string;
  accessoryId?: string;
  totalExperience?: number;
  classExperience?: Record<string, number>;
  classExperienceSpent?: Record<string, number>;
  tags?: string[];
  description?: string;
}

/**
 * Global registry for party member templates.
 * Maps party member IDs to their definitions for easy instantiation.
 */
export class PartyMemberRegistry {
  private static registry: Map<string, PartyMemberDefinition> = new Map();

  /**
   * Register a party member definition
   * @param definition The party member definition to register
   */
  static register(definition: PartyMemberDefinition): void {
    this.registry.set(definition.id, definition);
  }

  /**
   * Get all registered party members
   * @returns Array of all party member definitions
   */
  static getAll(): PartyMemberDefinition[] {
    return Array.from(this.registry.values());
  }

  /**
   * Get a party member definition by ID
   * @param id The party member ID to look up
   * @returns The party member definition, or undefined if not found
   */
  static getById(id: string): PartyMemberDefinition | undefined {
    return this.registry.get(id);
  }

  /**
   * Create a CombatUnit instance from a party member definition
   * @param id The party member template ID
   * @returns A new HumanoidUnit instance, or undefined if party member not found
   */
  static createPartyMember(id: string): CombatUnit | undefined {
    const definition = this.registry.get(id);
    if (!definition) {
      console.warn(`Cannot create party member: '${id}' not found in registry`);
      return undefined;
    }

    const unitClass = UnitClass.getById(definition.unitClassId);
    if (!unitClass) {
      console.error(`Cannot create party member '${id}': unit class '${definition.unitClassId}' not found`);
      return undefined;
    }

    // Create the humanoid unit
    const unit = new HumanoidUnit(
      definition.name,
      unitClass,
      definition.baseHealth,
      definition.baseMana,
      definition.basePhysicalPower,
      definition.baseMagicPower,
      definition.baseSpeed,
      definition.baseMovement,
      definition.basePhysicalEvade,
      definition.baseMagicEvade,
      definition.baseCourage,
      definition.baseAttunement,
      definition.spriteId
    );

    // Set secondary class if specified
    if (definition.secondaryClassId) {
      const secondaryClass = UnitClass.getById(definition.secondaryClassId);
      if (secondaryClass) {
        unit.setSecondaryClass(secondaryClass);
      } else {
        console.warn(`Secondary class '${definition.secondaryClassId}' not found for party member '${id}'`);
      }
    }

    // Equip items
    if (definition.leftHandId) {
      const equipment = Equipment.getById(definition.leftHandId);
      if (equipment) unit.equipLeftHand(equipment);
      else console.warn(`Left hand equipment '${definition.leftHandId}' not found for party member '${id}'`);
    }

    if (definition.rightHandId) {
      const equipment = Equipment.getById(definition.rightHandId);
      if (equipment) unit.equipRightHand(equipment);
      else console.warn(`Right hand equipment '${definition.rightHandId}' not found for party member '${id}'`);
    }

    if (definition.headId) {
      const equipment = Equipment.getById(definition.headId);
      if (equipment) unit.equipHead(equipment);
      else console.warn(`Head equipment '${definition.headId}' not found for party member '${id}'`);
    }

    if (definition.bodyId) {
      const equipment = Equipment.getById(definition.bodyId);
      if (equipment) unit.equipBody(equipment);
      else console.warn(`Body equipment '${definition.bodyId}' not found for party member '${id}'`);
    }

    if (definition.accessoryId) {
      const equipment = Equipment.getById(definition.accessoryId);
      if (equipment) unit.equipAccessory(equipment);
      else console.warn(`Accessory equipment '${definition.accessoryId}' not found for party member '${id}'`);
    }

    // Add experience if specified
    if (definition.totalExperience) {
      unit.addExperience(definition.totalExperience);
    }

    // Add class-specific experience
    if (definition.classExperience) {
      for (const [classId, experience] of Object.entries(definition.classExperience)) {
        const experienceClass = UnitClass.getById(classId);
        if (experienceClass && experience > 0) {
          unit.addExperience(experience, experienceClass);
        }
      }
    }

    // Set class experience spent if specified
    if (definition.classExperienceSpent) {
      for (const [classId, spent] of Object.entries(definition.classExperienceSpent)) {
        if (spent > 0) {
          // Access private field through type assertion for initialization
          (unit as any)._classExperienceSpent.set(classId, spent);
        }
      }
    }

    // Learn abilities
    if (definition.learnedAbilityIds) {
      for (const abilityId of definition.learnedAbilityIds) {
        const ability = CombatAbility.getById(abilityId);
        if (ability) {
          // Try to learn from primary class first
          if (!unit.learnAbility(ability, unitClass)) {
            // If that fails, try secondary class
            if (definition.secondaryClassId) {
              const secondaryClass = UnitClass.getById(definition.secondaryClassId);
              if (secondaryClass) {
                unit.learnAbility(ability, secondaryClass);
              }
            }
          }
        } else {
          console.warn(`Ability '${abilityId}' not found for party member '${id}'`);
        }
      }
    }

    // Assign abilities to slots
    if (definition.reactionAbilityId) {
      const ability = CombatAbility.getById(definition.reactionAbilityId);
      if (ability) {
        unit.assignReactionAbility(ability);
      }
    }

    if (definition.passiveAbilityId) {
      const ability = CombatAbility.getById(definition.passiveAbilityId);
      if (ability) {
        unit.assignPassiveAbility(ability);
      }
    }

    if (definition.movementAbilityId) {
      const ability = CombatAbility.getById(definition.movementAbilityId);
      if (ability) {
        unit.assignMovementAbility(ability);
      }
    }

    return unit;
  }

  /**
   * Get all party members with a specific tag
   */
  static getByTag(tag: string): PartyMemberDefinition[] {
    return Array.from(this.registry.values()).filter(
      member => member.tags?.includes(tag)
    );
  }

  /**
   * Get all unique tags from all party members
   */
  static getAllTags(): string[] {
    const tags = new Set<string>();
    for (const member of this.registry.values()) {
      member.tags?.forEach(tag => tags.add(tag));
    }
    return Array.from(tags).sort();
  }

  /**
   * Delete a party member from the registry
   * @param id The party member ID to delete
   * @returns true if deleted, false if not found
   */
  static delete(id: string): boolean {
    return this.registry.delete(id);
  }

  /**
   * Clear all party members from the registry
   */
  static clear(): void {
    this.registry.clear();
  }

  /**
   * Get the count of registered party members
   */
  static count(): number {
    return this.registry.size;
  }
}
