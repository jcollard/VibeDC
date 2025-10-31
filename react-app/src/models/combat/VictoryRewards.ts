/**
 * Victory rewards data structure
 * Represents XP, gold, and item rewards earned from winning a combat encounter.
 */

/**
 * A single item reward with sprite ID and optional quantity
 */
export interface ItemReward {
  /** Sprite ID for the item icon (e.g., 'items-0') */
  spriteId: string;
  /** Display name of the item */
  name: string;
  /** Number of this item awarded (defaults to 1) */
  quantity?: number;
}

/**
 * Complete victory rewards package
 */
export interface VictoryRewards {
  /** Experience points awarded */
  xp: number;
  /** Gold awarded */
  gold: number;
  /** Array of item rewards (can be empty) */
  items: ItemReward[];
}

/**
 * Factory function to create default empty rewards
 */
export function createDefaultRewards(): VictoryRewards {
  return {
    xp: 0,
    gold: 0,
    items: [],
  };
}
