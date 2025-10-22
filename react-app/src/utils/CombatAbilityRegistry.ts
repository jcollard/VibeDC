import { CombatAbility, type AbilityType } from '../models/combat/CombatAbility';

/**
 * Interface for ability definition data (used for YAML parsing and export)
 */
export interface AbilityDefinition {
  id: string;
  name: string;
  description: string;
  abilityType: AbilityType;
  experiencePrice: number;
  tags?: string[];
}

/**
 * Utility wrapper around CombatAbility's built-in registry
 * Provides additional functionality for managing abilities in developer tools
 */
export class CombatAbilityRegistry {
  /**
   * Register a new ability or update an existing one
   */
  static register(definition: AbilityDefinition): CombatAbility {
    // Check if ability already exists
    const existing = CombatAbility.getById(definition.id);
    if (existing) {
      // If it exists, we need to unregister it first
      this.unregister(definition.id);
    }

    // Create new ability (automatically registers itself)
    return new CombatAbility(
      definition.name,
      definition.description,
      definition.abilityType,
      definition.experiencePrice,
      definition.tags || [],
      definition.id
    );
  }

  /**
   * Unregister an ability by ID
   */
  static unregister(id: string): boolean {
    const ability = CombatAbility.getById(id);
    if (!ability) return false;

    // Get all abilities BEFORE clearing
    const allAbilities = CombatAbility.getAll();

    // Clear the registry
    CombatAbility.clearRegistry();

    // Re-register all abilities except the one we're removing
    allAbilities.forEach(a => {
      if (a.id !== id) {
        new CombatAbility(
          a.name,
          a.description,
          a.abilityType,
          a.experiencePrice,
          a.tags,
          a.id
        );
      }
    });

    return true;
  }

  /**
   * Check if an ability exists
   */
  static has(id: string): boolean {
    return CombatAbility.getById(id) !== undefined;
  }

  /**
   * Get an ability by ID
   */
  static getById(id: string): CombatAbility | undefined {
    return CombatAbility.getById(id);
  }

  /**
   * Get all abilities
   */
  static getAll(): CombatAbility[] {
    return CombatAbility.getAll();
  }

  /**
   * Get abilities filtered by type
   */
  static getByType(type: AbilityType): CombatAbility[] {
    return CombatAbility.getAll().filter(a => a.abilityType === type);
  }

  /**
   * Get abilities filtered by tag
   */
  static getByTag(tag: string): CombatAbility[] {
    return CombatAbility.getAll().filter(a => a.hasTag(tag));
  }

  /**
   * Convert a CombatAbility to an AbilityDefinition
   */
  static toDefinition(ability: CombatAbility): AbilityDefinition {
    return {
      id: ability.id,
      name: ability.name,
      description: ability.description,
      abilityType: ability.abilityType,
      experiencePrice: ability.experiencePrice,
      tags: ability.tags.length > 0 ? ability.tags : undefined,
    };
  }
}
