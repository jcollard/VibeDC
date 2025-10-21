import { CombatUnitModifiers } from './CombatUnitModifiers';
import type { CombatAbility } from './CombatAbility';

/**
 * Represents a character class that defines a unit's role and abilities
 */
export class UnitClass {
  /**
   * Registry of all created unit classes, indexed by ID
   */
  private static registry: Map<string, UnitClass> = new Map();

  public readonly id: string;
  public readonly name: string;
  public readonly tags: string[];
  public readonly description: string;

  /**
   * Modifiers applied to unit stats
   */
  public modifiers: CombatUnitModifiers;

  /**
   * List of abilities that can be learned by units of this class
   */
  public readonly learnableAbilities: readonly CombatAbility[];

  constructor(
    name: string,
    description: string,
    tags: string[] = [],
    learnableAbilities: CombatAbility[] = [],
    modifiers?: Partial<{
      health: number;
      mana: number;
      physicalPower: number;
      magicPower: number;
      speed: number;
      movement: number;
      physicalEvade: number;
      magicEvade: number;
      courage: number;
      attunement: number;
    }>,
    multipliers?: Partial<{
      health: number;
      mana: number;
      physicalPower: number;
      magicPower: number;
      speed: number;
      movement: number;
      physicalEvade: number;
      magicEvade: number;
      courage: number;
      attunement: number;
    }>,
    id?: string
  ) {
    this.id = id ?? crypto.randomUUID();
    this.name = name;
    this.description = description;
    this.tags = tags;
    this.learnableAbilities = learnableAbilities;
    this.modifiers = new CombatUnitModifiers(modifiers, multipliers);

    // Register this class in the registry
    UnitClass.registry.set(this.id, this);
  }

  /**
   * Get UnitClass by its ID
   * @param id The ID of the unit class to retrieve
   * @returns The UnitClass with the given ID, or undefined if not found
   */
  static getById(id: string): UnitClass | undefined {
    return UnitClass.registry.get(id);
  }

  /**
   * Get all registered unit classes
   * @returns Array of all UnitClass instances
   */
  static getAll(): UnitClass[] {
    return Array.from(UnitClass.registry.values());
  }

  /**
   * Clear the unit class registry (useful for testing)
   */
  static clearRegistry(): void {
    UnitClass.registry.clear();
  }
}
