import { CombatUnitModifiers } from './CombatUnitModifiers';

/**
 * Represents a character class that defines a unit's role and abilities
 */
export class UnitClass {
  public readonly name: string;
  public readonly tags: string[];
  public readonly description: string;

  /**
   * Modifiers applied to unit stats
   */
  public modifiers: CombatUnitModifiers;

  constructor(
    name: string,
    description: string,
    tags: string[] = [],
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
    }>
  ) {
    this.name = name;
    this.description = description;
    this.tags = tags;
    this.modifiers = new CombatUnitModifiers(modifiers, multipliers);
  }
}
