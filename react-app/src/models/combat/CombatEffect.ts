import { CombatUnitModifiers } from './CombatUnitModifiers';

/**
 * Represents an ongoing buff or debuff effect on a combat unit
 * Modifiers are applied to unit stats for the duration of the effect
 */
export class CombatEffect {
  /**
   * Display name of the effect
   */
  public name: string;

  /**
   * Tags for categorizing/identifying effects (e.g., "buff", "debuff", "poison", "stun")
   */
  public tags: string[];

  /**
   * Number of turns remaining before the effect expires
   */
  public turnsRemaining: number;

  /**
   * Modifiers applied to unit stats
   */
  public modifiers: CombatUnitModifiers;

  constructor(
    name: string,
    turnsRemaining: number,
    tags: string[] = [],
    modifiers?: Partial<{
      health: number;
      wounds: number;
      mana: number;
      manaUsed: number;
      physicalPower: number;
      magicPower: number;
      speed: number;
      turnGauge: number;
      movement: number;
      physicalEvade: number;
      magicEvade: number;
      courage: number;
      attunement: number;
    }>,
    multipliers?: Partial<{
      health: number;
      wounds: number;
      mana: number;
      manaUsed: number;
      physicalPower: number;
      magicPower: number;
      speed: number;
      turnGauge: number;
      movement: number;
      physicalEvade: number;
      magicEvade: number;
      courage: number;
      attunement: number;
    }>
  ) {
    this.name = name;
    this.turnsRemaining = turnsRemaining;
    this.tags = tags;
    this.modifiers = new CombatUnitModifiers(modifiers, multipliers);
  }

  /**
   * Decrements the turns remaining counter
   * Returns true if the effect has expired (turnsRemaining <= 0)
   */
  decrementTurns(): boolean {
    this.turnsRemaining--;
    return this.turnsRemaining <= 0;
  }

  /**
   * Checks if this effect has a specific tag
   */
  hasTag(tag: string): boolean {
    return this.tags.includes(tag);
  }

  /**
   * Adds a tag to this effect if it doesn't already exist
   */
  addTag(tag: string): void {
    if (!this.hasTag(tag)) {
      this.tags.push(tag);
    }
  }

  /**
   * Removes a tag from this effect if it exists
   */
  removeTag(tag: string): void {
    const index = this.tags.indexOf(tag);
    if (index > -1) {
      this.tags.splice(index, 1);
    }
  }

  /**
   * Creates a copy of this effect
   */
  clone(): CombatEffect {
    const cloned = new CombatEffect(
      this.name,
      this.turnsRemaining,
      [...this.tags]
    );
    cloned.modifiers = this.modifiers.clone();
    return cloned;
  }

  /**
   * Returns a summary string of non-zero modifiers and non-1.0 multipliers
   */
  getSummary(): string {
    return this.modifiers.getSummary();
  }
}
