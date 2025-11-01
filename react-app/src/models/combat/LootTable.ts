/**
 * Loot table system for generating item rewards
 * Supports equipment drops with configurable drop rates
 */

/**
 * A single entry in a loot table
 */
export interface LootEntry {
  /** Equipment ID from EquipmentRegistry */
  equipmentId: string;
  /** Drop chance as a percentage (0-100). Typical values are 5-10% */
  dropRate: number;
  /** Optional quantity override (defaults to 1) */
  quantity?: number;
}

/**
 * A collection of possible loot drops
 */
export interface LootTable {
  /** Array of possible item drops */
  entries: LootEntry[];
}

/**
 * JSON format for loot tables in YAML/data files
 */
export interface LootTableJSON {
  entries: {
    equipmentId: string;
    dropRate: number;
    quantity?: number;
  }[];
}

/**
 * Guaranteed loot that always drops from an encounter
 */
export interface GuaranteedLoot {
  /** Equipment ID from EquipmentRegistry */
  equipmentId: string;
  /** Quantity of this item (defaults to 1) */
  quantity?: number;
}

/**
 * Rolls a loot table and returns the equipment IDs that dropped
 * @param lootTable The loot table to roll
 * @param forceDropCount Optional number of items to force drop (for debugging)
 * @returns Array of equipment IDs that successfully rolled
 */
export function rollLootTable(lootTable: LootTable, forceDropCount?: number): string[] {
  const droppedItems: string[] = [];

  // If forcing drops for debugging, set the first N items to 100% drop rate
  let forcedDropsRemaining = forceDropCount ?? 0;

  for (const entry of lootTable.entries) {
    const roll = Math.random() * 100;
    const effectiveDropRate = forcedDropsRemaining > 0 ? 100 : entry.dropRate;

    if (roll < effectiveDropRate) {
      // Item dropped! Add it the specified number of times (quantity)
      const quantity = entry.quantity ?? 1;
      for (let i = 0; i < quantity; i++) {
        droppedItems.push(entry.equipmentId);
        if (forcedDropsRemaining > 0) {
          forcedDropsRemaining--;
        }
      }
    }
  }

  return droppedItems;
}
