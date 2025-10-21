/**
 * Type of ability that determines when and how it can be used
 */
export type AbilityType = "Action" | "Reaction" | "Passive" | "Movement";

/**
 * Represents a combat ability that a unit can use
 */
export class CombatAbility {
  /**
   * Registry of all created abilities, indexed by ID
   */
  private static registry: Map<string, CombatAbility> = new Map();

  /**
   * Unique identifier for this ability
   */
  public readonly id: string;

  /**
   * Display name of the ability
   */
  public readonly name: string;

  /**
   * Description of what the ability does
   */
  public readonly description: string;

  /**
   * Tags for categorizing abilities (e.g., "attack", "heal", "buff", "debuff")
   */
  public readonly tags: string[];

  /**
   * Type of ability that determines when it can be used
   */
  public readonly abilityType: AbilityType;

  /**
   * The amount of experience required to purchase this ability
   */
  public readonly experiencePrice: number;

  constructor(
    name: string,
    description: string,
    abilityType: AbilityType,
    experiencePrice: number,
    tags: string[] = [],
    id?: string
  ) {
    this.id = id ?? crypto.randomUUID();
    this.name = name;
    this.description = description;
    this.abilityType = abilityType;
    this.experiencePrice = experiencePrice;
    this.tags = tags;

    // Register this ability in the registry
    CombatAbility.registry.set(this.id, this);
  }

  /**
   * Checks if this ability has a specific tag
   */
  hasTag(tag: string): boolean {
    return this.tags.includes(tag);
  }

  /**
   * Get a CombatAbility by its ID
   * @param id The ID of the ability to retrieve
   * @returns The CombatAbility with the given ID, or undefined if not found
   */
  static getById(id: string): CombatAbility | undefined {
    return CombatAbility.registry.get(id);
  }

  /**
   * Get all registered abilities
   * @returns Array of all CombatAbility instances
   */
  static getAll(): CombatAbility[] {
    return Array.from(CombatAbility.registry.values());
  }

  /**
   * Clear the ability registry (useful for testing)
   */
  static clearRegistry(): void {
    CombatAbility.registry.clear();
  }
}
