import { CombatUnitModifiers } from './CombatUnitModifiers';
import type { CombatAbility } from './CombatAbility';

/**
 * Represents a character class that defines a unit's role and abilities
 */
export class UnitClass {
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
  }
}
