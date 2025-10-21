/**
 * Type of ability that determines when and how it can be used
 */
export type AbilityType = "Action" | "Reaction" | "Passive" | "Movement";

/**
 * Represents a combat ability that a unit can use
 */
export class CombatAbility {
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
    tags: string[] = []
  ) {
    this.name = name;
    this.description = description;
    this.abilityType = abilityType;
    this.tags = tags;
    this.experiencePrice = experiencePrice;
  }

  /**
   * Checks if this ability has a specific tag
   */
  hasTag(tag: string): boolean {
    return this.tags.includes(tag);
  }
}
