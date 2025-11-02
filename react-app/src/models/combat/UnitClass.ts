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

  /**
   * Map of prerequisite class IDs to required experience amounts
   * A unit must have earned at least this much experience in each prerequisite class
   * before they can use this class as their primary or secondary class
   */
  public readonly requirements: ReadonlyMap<string, number>;

  /**
   * List of equipment type tags this class is allowed to use
   * Empty array or undefined means no equipment restrictions
   * Examples: ["heavy-weapon", "heavy-armor", "shield"]
   */
  public readonly allowedEquipmentTypes: readonly string[];

  /**
   * Starter configuration for creating new characters with this class
   * Defines base stats and initial equipment for new characters
   */
  public readonly starterConfig?: {
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
    leftHandId?: string;
    rightHandId?: string;
    headId?: string;
    bodyId?: string;
    accessoryId?: string;
    learnedAbilityIds?: string[];
    reactionAbilityId?: string;
    passiveAbilityId?: string;
    movementAbilityId?: string;
  };

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
    requirements: Map<string, number> = new Map(),
    id?: string,
    allowedEquipmentTypes?: string[],
    starterConfig?: {
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
      leftHandId?: string;
      rightHandId?: string;
      headId?: string;
      bodyId?: string;
      accessoryId?: string;
      learnedAbilityIds?: string[];
      reactionAbilityId?: string;
      passiveAbilityId?: string;
      movementAbilityId?: string;
    }
  ) {
    this.id = id ?? crypto.randomUUID();
    this.name = name;
    this.description = description;
    this.tags = tags;
    this.learnableAbilities = learnableAbilities;
    this.modifiers = new CombatUnitModifiers(modifiers, multipliers);
    this.requirements = requirements;
    this.allowedEquipmentTypes = allowedEquipmentTypes ?? [];
    this.starterConfig = starterConfig;

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

  /**
   * Check if a unit meets the requirements to use this class
   * @param classExperience Map of class IDs to earned experience
   * @returns true if all requirements are met, false otherwise
   */
  meetsRequirements(classExperience: ReadonlyMap<string, number>): boolean {
    for (const [requiredClassId, requiredAmount] of this.requirements) {
      const earnedAmount = classExperience.get(requiredClassId) ?? 0;
      if (earnedAmount < requiredAmount) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get a list of unmet requirements for this class
   * @param classExperience Map of class IDs to earned experience
   * @returns Array of {classId, required, current} for each unmet requirement
   */
  getUnmetRequirements(classExperience: ReadonlyMap<string, number>): Array<{
    classId: string;
    required: number;
    current: number;
  }> {
    const unmet: Array<{ classId: string; required: number; current: number }> = [];

    for (const [requiredClassId, requiredAmount] of this.requirements) {
      const earnedAmount = classExperience.get(requiredClassId) ?? 0;
      if (earnedAmount < requiredAmount) {
        unmet.push({
          classId: requiredClassId,
          required: requiredAmount,
          current: earnedAmount,
        });
      }
    }

    return unmet;
  }
}
