import { MonsterUnit } from '../models/combat/MonsterUnit';
import { HumanoidUnit } from '../models/combat/HumanoidUnit';
import type { CombatUnit } from '../models/combat/CombatUnit';
import { UnitClass } from '../models/combat/UnitClass';
import type { LootTable, LootTableJSON } from '../models/combat/LootTable';

/**
 * Unit type enum for distinguishing between different unit implementations
 */
export type UnitType = 'monster' | 'humanoid';

/**
 * Definition for an enemy template
 */
export interface EnemyDefinition {
  /**
   * Unique identifier for this enemy template
   */
  id: string;

  /**
   * Display name for the enemy
   */
  name: string;

  /**
   * Type of unit (monster or humanoid)
   */
  unitType: UnitType;

  /**
   * Unit class ID for this enemy
   */
  unitClassId: string;

  /**
   * Base stats for the enemy
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
   * Sprite ID to render this enemy
   */
  spriteId: string;

  /**
   * Optional ability IDs the enemy knows
   */
  learnedAbilityIds?: string[];
  reactionAbilityId?: string;
  passiveAbilityId?: string;
  movementAbilityId?: string;

  /**
   * Optional secondary class ID (humanoid only)
   */
  secondaryClassId?: string;

  /**
   * Optional equipment IDs (humanoid only)
   */
  leftHandId?: string;
  rightHandId?: string;
  headId?: string;
  bodyId?: string;
  accessoryId?: string;

  /**
   * Optional tags for categorization
   */
  tags?: string[];

  /**
   * Optional description
   */
  description?: string;

  /**
   * XP value awarded when this enemy is defeated
   */
  xpValue: number;

  /**
   * Gold value awarded when this enemy is defeated
   */
  goldValue: number;

  /**
   * Loot table for item drops (optional)
   * Items have a chance to drop based on their drop rates (typically 5-10%)
   */
  lootTable?: LootTable;
}

/**
 * JSON format for enemy definitions in YAML/data files
 */
export interface EnemyDefinitionJSON {
  id: string;
  name: string;
  unitType: UnitType;
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
  tags?: string[];
  description?: string;
  xpValue: number;
  goldValue: number;
  lootTable?: LootTableJSON;
}

/**
 * Global registry for enemy templates.
 * Maps enemy IDs to their definitions for easy instantiation.
 *
 * Usage:
 * ```typescript
 * // Register enemy templates
 * EnemyRegistry.register({
 *   id: 'goblin',
 *   name: 'Goblin',
 *   unitClassId: 'monster',
 *   baseHealth: 20,
 *   // ... other stats
 *   spriteId: 'monsters-0'
 * });
 *
 * // Create an instance of the enemy
 * const goblin = EnemyRegistry.createEnemy('goblin');
 * ```
 */
export class EnemyRegistry {
  private static registry: Map<string, EnemyDefinition> = new Map();

  /**
   * Register an enemy definition
   */
  static register(enemy: EnemyDefinition): void {
    if (this.registry.has(enemy.id)) {
      console.warn(`Enemy with id '${enemy.id}' is already registered. Overwriting.`);
    }
    this.registry.set(enemy.id, enemy);
  }

  /**
   * Register multiple enemy definitions at once
   */
  static registerAll(enemies: EnemyDefinition[]): void {
    for (const enemy of enemies) {
      this.register(enemy);
    }
  }

  /**
   * Get an enemy definition by ID
   */
  static getById(id: string): EnemyDefinition | undefined {
    return this.registry.get(id);
  }

  /**
   * Create a CombatUnit instance from an enemy definition
   * @param id The enemy template ID
   * @returns A new MonsterUnit or HumanoidUnit instance, or undefined if enemy not found
   */
  static createEnemy(id: string): CombatUnit | undefined {
    const definition = this.registry.get(id);
    if (!definition) {
      console.warn(`Cannot create enemy: '${id}' not found in registry`);
      return undefined;
    }

    const unitClass = UnitClass.getById(definition.unitClassId);
    if (!unitClass) {
      console.error(`Cannot create enemy '${id}': unit class '${definition.unitClassId}' not found`);
      return undefined;
    }

    // Create the appropriate unit type
    const unit: CombatUnit = definition.unitType === 'humanoid'
      ? new HumanoidUnit(
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
        )
      : new MonsterUnit(
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

    // Set up humanoid-specific properties
    if (definition.unitType === 'humanoid' && unit instanceof HumanoidUnit) {
      // Set secondary class if specified
      if (definition.secondaryClassId) {
        const secondaryClass = UnitClass.getById(definition.secondaryClassId);
        if (secondaryClass) {
          unit.setSecondaryClass(secondaryClass);
        } else {
          console.warn(`Secondary class '${definition.secondaryClassId}' not found for enemy '${id}'`);
        }
      }

      // TODO: Equip items when Equipment registry is available
      // if (definition.leftHandId) {
      //   const equipment = Equipment.getById(definition.leftHandId);
      //   if (equipment) unit.equipLeftHand(equipment);
      // }
      // ... similar for other equipment slots
    }

    // TODO: Add learned abilities when AbilityRegistry is available
    // if (definition.learnedAbilityIds) {
    //   for (const abilityId of definition.learnedAbilityIds) {
    //     const ability = AbilityRegistry.getById(abilityId);
    //     if (ability) {
    //       unit.learnAbility(ability);
    //     }
    //   }
    // }

    return unit;
  }

  /**
   * Get all enemies with a specific tag
   */
  static getByTag(tag: string): EnemyDefinition[] {
    return Array.from(this.registry.values())
      .filter(enemy => enemy.tags?.includes(tag));
  }

  /**
   * Get all registered enemy IDs
   */
  static getAllIds(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Get all registered enemies
   */
  static getAll(): EnemyDefinition[] {
    return Array.from(this.registry.values());
  }

  /**
   * Check if an enemy ID is registered
   */
  static has(id: string): boolean {
    return this.registry.has(id);
  }

  /**
   * Remove an enemy from the registry
   */
  static unregister(id: string): boolean {
    return this.registry.delete(id);
  }

  /**
   * Clear all registered enemies
   */
  static clearRegistry(): void {
    this.registry.clear();
  }

  /**
   * Get the number of registered enemies
   */
  static get count(): number {
    return this.registry.size;
  }
}
