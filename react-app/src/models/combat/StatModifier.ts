/**
 * Represents the types of stats that can be modified
 */
export type StatType =
  | 'maxHealth'
  | 'maxMana'
  | 'physicalPower'
  | 'magicPower'
  | 'speed'
  | 'movement'
  | 'physicalEvade'
  | 'magicEvade'
  | 'courage'
  | 'attunement';

/**
 * Represents a temporary or permanent modification to a unit's stat
 */
export interface StatModifier {
  /**
   * Unique identifier for this modifier
   */
  id: string;

  /**
   * The stat being modified
   */
  stat: StatType;

  /**
   * The amount to modify the stat by (can be positive or negative)
   */
  value: number;

  /**
   * Duration in turns (-1 = permanent, >0 = temporary)
   * Decrements at the end of the unit's turn
   * When it reaches 0, the modifier is removed
   */
  duration: number;

  /**
   * The ability ID that created this modifier
   */
  source: string;

  /**
   * Display name of the source (for UI)
   */
  sourceName: string;

  /**
   * Optional icon for UI display
   */
  icon?: string;
}
