/**
 * Victory rewards data structure
 * Represents XP, gold, and item rewards earned from winning a combat encounter.
 */

/**
 * A single item reward
 */
export interface ItemReward {
  /** Equipment ID for adding to inventory */
  equipmentId: string;
  /** Display name of the item */
  name: string;
}

/**
 * Complete victory rewards package
 */
export interface VictoryRewards {
  /** Base experience points awarded (before party size bonus) */
  xp: number;
  /** Gold awarded */
  gold: number;
  /** Array of item rewards (can be empty) */
  items: ItemReward[];
  /** Number of party members (used to calculate XP bonus) */
  partySize?: number;
  /** XP bonus percentage based on party size (0-100) */
  xpBonusPercent?: number;
  /** Total XP after applying bonus */
  totalXP?: number;
}

/**
 * Calculate XP bonus percentage based on party size
 * - 4 members: 0% bonus
 * - 3 members: 25% bonus
 * - 2 members: 50% bonus
 * - 1 member: 100% bonus
 */
export function calculateXPBonus(partySize: number): number {
  if (partySize >= 4) return 0;
  if (partySize === 3) return 25;
  if (partySize === 2) return 50;
  if (partySize === 1) return 100;
  return 0; // Fallback for invalid party sizes
}

/**
 * Apply party size bonus to rewards
 * Calculates totalXP based on base XP and party size
 */
export function applyPartySizeBonus(rewards: VictoryRewards, partySize: number): VictoryRewards {
  const bonusPercent = calculateXPBonus(partySize);
  const totalXP = Math.floor(rewards.xp * (1 + bonusPercent / 100));

  return {
    ...rewards,
    partySize,
    xpBonusPercent: bonusPercent,
    totalXP,
  };
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
