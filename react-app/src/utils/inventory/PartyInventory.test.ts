import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PartyInventory } from './PartyInventory';
import { Equipment } from '../../models/combat/Equipment';

describe('PartyInventory', () => {
  beforeEach(() => {
    // Clear registries before each test
    Equipment.clearRegistry();
    PartyInventory.clear();

    // Create test equipment
    new Equipment(
      'Iron Sword',
      'OneHandedWeapon',
      { physicalPower: 10 },
      {},
      new Set(),
      'iron-sword-001'
    );

    new Equipment(
      'Steel Shield',
      'Shield',
      { health: 15, physicalEvade: 5 },
      {},
      new Set(),
      'steel-shield-001'
    );

    new Equipment(
      'Health Potion',
      'Held',
      { health: 50 },
      {},
      new Set(),
      'health-potion-001'
    );

    new Equipment(
      'Ancient Key',
      'Held',
      {},
      {},
      new Set(),
      'ancient-key-001',
      undefined, // minRange
      undefined, // maxRange
      ['quest-item'] // typeTags
    );

    new Equipment(
      'Leather Armor',
      'Body',
      { health: 20, physicalEvade: 3 },
      {},
      new Set(),
      'leather-armor-001'
    );
  });

  afterEach(() => {
    Equipment.clearRegistry();
    PartyInventory.clear();
  });

  describe('Adding Items', () => {
    it('should add a new item to inventory', () => {
      const result = PartyInventory.addItem('iron-sword-001', 1);

      expect(result).toBe(true);
      expect(PartyInventory.getItemCount('iron-sword-001')).toBe(1);
    });

    it('should add multiple items at once', () => {
      const result = PartyInventory.addItem('health-potion-001', 5);

      expect(result).toBe(true);
      expect(PartyInventory.getItemCount('health-potion-001')).toBe(5);
    });

    it('should increment existing item stack', () => {
      PartyInventory.addItem('iron-sword-001', 2);
      PartyInventory.addItem('iron-sword-001', 3);

      expect(PartyInventory.getItemCount('iron-sword-001')).toBe(5);
    });

    it('should return false for non-existent equipment ID', () => {
      const result = PartyInventory.addItem('fake-item-999', 1);

      expect(result).toBe(false);
      expect(PartyInventory.getItemCount('fake-item-999')).toBe(0);
    });

    it('should handle adding 0 quantity as no-op', () => {
      const result = PartyInventory.addItem('iron-sword-001', 0);

      expect(result).toBe(true);
      expect(PartyInventory.getItemCount('iron-sword-001')).toBe(0);
    });

    it('should handle negative quantity as no-op', () => {
      const result = PartyInventory.addItem('iron-sword-001', -5);

      expect(result).toBe(true);
      expect(PartyInventory.getItemCount('iron-sword-001')).toBe(0);
    });

    it('should add quest items normally', () => {
      const result = PartyInventory.addItem('ancient-key-001', 1);

      expect(result).toBe(true);
      expect(PartyInventory.getItemCount('ancient-key-001')).toBe(1);
    });
  });

  describe('Adding Gold', () => {
    it('should add gold to inventory', () => {
      PartyInventory.addGold(100);

      expect(PartyInventory.getGold()).toBe(100);
    });

    it('should accumulate gold from multiple additions', () => {
      PartyInventory.addGold(50);
      PartyInventory.addGold(75);
      PartyInventory.addGold(25);

      expect(PartyInventory.getGold()).toBe(150);
    });

    it('should ignore zero gold addition', () => {
      PartyInventory.addGold(100);
      PartyInventory.addGold(0);

      expect(PartyInventory.getGold()).toBe(100);
    });

    it('should ignore negative gold addition', () => {
      PartyInventory.addGold(100);
      PartyInventory.addGold(-50);

      expect(PartyInventory.getGold()).toBe(100);
    });
  });

  describe('Removing Items', () => {
    beforeEach(() => {
      PartyInventory.addItem('iron-sword-001', 5);
      PartyInventory.addItem('health-potion-001', 10);
      PartyInventory.addItem('ancient-key-001', 1);
    });

    it('should remove items from inventory', () => {
      const result = PartyInventory.removeItem('iron-sword-001', 2);

      expect(result).toBe(true);
      expect(PartyInventory.getItemCount('iron-sword-001')).toBe(3);
    });

    it('should remove all items when quantity reaches zero', () => {
      const result = PartyInventory.removeItem('iron-sword-001', 5);

      expect(result).toBe(true);
      expect(PartyInventory.getItemCount('iron-sword-001')).toBe(0);
      expect(PartyInventory.hasItem('iron-sword-001')).toBe(false);
    });

    it('should return false when insufficient quantity', () => {
      const result = PartyInventory.removeItem('iron-sword-001', 10);

      expect(result).toBe(false);
      expect(PartyInventory.getItemCount('iron-sword-001')).toBe(5); // Unchanged
    });

    it('should return false when item not in inventory', () => {
      const result = PartyInventory.removeItem('steel-shield-001', 1);

      expect(result).toBe(false);
    });

    it('should prevent removing quest items', () => {
      const result = PartyInventory.removeItem('ancient-key-001', 1);

      expect(result).toBe(false);
      expect(PartyInventory.getItemCount('ancient-key-001')).toBe(1); // Unchanged
    });

    it('should handle removing 0 quantity as no-op', () => {
      const result = PartyInventory.removeItem('iron-sword-001', 0);

      expect(result).toBe(true);
      expect(PartyInventory.getItemCount('iron-sword-001')).toBe(5); // Unchanged
    });

    it('should handle negative quantity as no-op', () => {
      const result = PartyInventory.removeItem('iron-sword-001', -3);

      expect(result).toBe(true);
      expect(PartyInventory.getItemCount('iron-sword-001')).toBe(5); // Unchanged
    });
  });

  describe('Removing Gold', () => {
    beforeEach(() => {
      PartyInventory.addGold(500);
    });

    it('should remove gold from inventory', () => {
      const result = PartyInventory.removeGold(200);

      expect(result).toBe(true);
      expect(PartyInventory.getGold()).toBe(300);
    });

    it('should remove all gold', () => {
      const result = PartyInventory.removeGold(500);

      expect(result).toBe(true);
      expect(PartyInventory.getGold()).toBe(0);
    });

    it('should return false when insufficient gold', () => {
      const result = PartyInventory.removeGold(600);

      expect(result).toBe(false);
      expect(PartyInventory.getGold()).toBe(500); // Unchanged
    });

    it('should handle removing 0 gold as no-op', () => {
      const result = PartyInventory.removeGold(0);

      expect(result).toBe(true);
      expect(PartyInventory.getGold()).toBe(500); // Unchanged
    });

    it('should handle negative amount as no-op', () => {
      const result = PartyInventory.removeGold(-100);

      expect(result).toBe(true);
      expect(PartyInventory.getGold()).toBe(500); // Unchanged
    });
  });

  describe('Querying Items', () => {
    beforeEach(() => {
      PartyInventory.addItem('iron-sword-001', 3);
      PartyInventory.addItem('health-potion-001', 7);
      PartyInventory.addItem('ancient-key-001', 1);
    });

    it('should get item count for existing item', () => {
      expect(PartyInventory.getItemCount('iron-sword-001')).toBe(3);
      expect(PartyInventory.getItemCount('health-potion-001')).toBe(7);
    });

    it('should return 0 for non-existent item', () => {
      expect(PartyInventory.getItemCount('fake-item-999')).toBe(0);
    });

    it('should get total item count', () => {
      expect(PartyInventory.getTotalItemCount()).toBe(11); // 3 + 7 + 1
    });

    it('should get total unique items', () => {
      expect(PartyInventory.getTotalUniqueItems()).toBe(3);
    });

    it('should check if has item with sufficient quantity', () => {
      expect(PartyInventory.hasItem('iron-sword-001', 2)).toBe(true);
      expect(PartyInventory.hasItem('iron-sword-001', 3)).toBe(true);
    });

    it('should return false when insufficient quantity', () => {
      expect(PartyInventory.hasItem('iron-sword-001', 4)).toBe(false);
    });

    it('should check if has item with default quantity 1', () => {
      expect(PartyInventory.hasItem('ancient-key-001')).toBe(true);
    });

    it('should return false when item not in inventory', () => {
      expect(PartyInventory.hasItem('steel-shield-001')).toBe(false);
    });

    it('should check if has sufficient gold', () => {
      PartyInventory.addGold(1000);

      expect(PartyInventory.hasGold(500)).toBe(true);
      expect(PartyInventory.hasGold(1000)).toBe(true);
    });

    it('should return false when insufficient gold', () => {
      PartyInventory.addGold(1000);

      expect(PartyInventory.hasGold(1001)).toBe(false);
    });
  });

  describe('Getting All Items', () => {
    beforeEach(() => {
      PartyInventory.addItem('iron-sword-001', 2);
      PartyInventory.addItem('health-potion-001', 5);
      PartyInventory.addItem('steel-shield-001', 1);
    });

    it('should get all items as array', () => {
      const items = PartyInventory.getAllItems();

      expect(items).toHaveLength(3);
      expect(items.find(i => i.equipmentId === 'iron-sword-001')?.quantity).toBe(2);
      expect(items.find(i => i.equipmentId === 'health-potion-001')?.quantity).toBe(5);
      expect(items.find(i => i.equipmentId === 'steel-shield-001')?.quantity).toBe(1);
    });

    it('should return empty array when inventory empty', () => {
      PartyInventory.clear();
      const items = PartyInventory.getAllItems();

      expect(items).toHaveLength(0);
    });
  });

  describe('Getting Item Details', () => {
    beforeEach(() => {
      PartyInventory.addItem('iron-sword-001', 3);
    });

    it('should get item details with equipment data', () => {
      const details = PartyInventory.getItemDetails('iron-sword-001');

      expect(details).not.toBeNull();
      expect(details!.equipment.id).toBe('iron-sword-001');
      expect(details!.equipment.name).toBe('Iron Sword');
      expect(details!.equipment.type).toBe('OneHandedWeapon');
      expect(details!.quantity).toBe(3);
    });

    it('should return null for non-existent item', () => {
      const details = PartyInventory.getItemDetails('fake-item-999');

      expect(details).toBeNull();
    });

    it('should return null for item not in inventory', () => {
      const details = PartyInventory.getItemDetails('steel-shield-001');

      expect(details).toBeNull();
    });
  });

  describe('Category Filtering', () => {
    beforeEach(() => {
      PartyInventory.addItem('iron-sword-001', 2);
      PartyInventory.addItem('steel-shield-001', 1);
      PartyInventory.addItem('health-potion-001', 5);
      PartyInventory.addItem('ancient-key-001', 1);
      PartyInventory.addItem('leather-armor-001', 1);
    });

    it('should filter all items', () => {
      const items = PartyInventory.filterItems('all');

      expect(items).toHaveLength(5);
    });

    it('should filter weapons category', () => {
      const items = PartyInventory.filterItems('weapons');

      expect(items).toHaveLength(1);
      expect(items[0].equipment.id).toBe('iron-sword-001');
      expect(items[0].quantity).toBe(2);
    });

    it('should filter shields category', () => {
      const items = PartyInventory.filterItems('shields');

      expect(items).toHaveLength(1);
      expect(items[0].equipment.id).toBe('steel-shield-001');
    });

    it('should filter armor category', () => {
      const items = PartyInventory.filterItems('armor');

      expect(items).toHaveLength(1);
      expect(items[0].equipment.id).toBe('leather-armor-001');
    });

    it('should filter held category', () => {
      const items = PartyInventory.filterItems('held');

      expect(items).toHaveLength(2); // health potion + ancient key
    });

    it('should filter quest-items category', () => {
      const items = PartyInventory.filterItems('quest-items');

      expect(items).toHaveLength(1);
      expect(items[0].equipment.id).toBe('ancient-key-001');
    });

    it('should return empty array for category with no items', () => {
      PartyInventory.clear();
      PartyInventory.addItem('iron-sword-001', 1);

      const items = PartyInventory.filterItems('armor');

      expect(items).toHaveLength(0);
    });
  });

  describe('Getting Items by Category', () => {
    beforeEach(() => {
      PartyInventory.addItem('iron-sword-001', 2);
      PartyInventory.addItem('steel-shield-001', 1);
      PartyInventory.addItem('health-potion-001', 5);
    });

    it('should get items by weapons category', () => {
      const items = PartyInventory.getItemsByCategory('weapons');

      expect(items).toHaveLength(1);
      expect(items[0].equipmentId).toBe('iron-sword-001');
      expect(items[0].quantity).toBe(2);
    });

    it('should get items by all category', () => {
      const items = PartyInventory.getItemsByCategory('all');

      expect(items).toHaveLength(3);
    });
  });

  describe('Sorting Items', () => {
    beforeEach(() => {
      // Create items with specific names for sorting
      Equipment.clearRegistry();

      new Equipment('Zebra Sword', 'OneHandedWeapon', {}, {}, new Set(), 'zebra-sword-001');
      new Equipment('Alpha Shield', 'Shield', {}, {}, new Set(), 'alpha-shield-001');
      new Equipment('Beta Potion', 'Held', {}, {}, new Set(), 'beta-potion-001');

      // Add in specific order for recently-added test
      PartyInventory.addItem('zebra-sword-001', 1);
      PartyInventory.addItem('alpha-shield-001', 1);
      PartyInventory.addItem('beta-potion-001', 1);
    });

    it('should sort by name ascending', () => {
      const items = PartyInventory.filterItems('all');
      const sorted = PartyInventory.sortItems(items, 'name-asc');

      expect(sorted[0].equipment.name).toBe('Alpha Shield');
      expect(sorted[1].equipment.name).toBe('Beta Potion');
      expect(sorted[2].equipment.name).toBe('Zebra Sword');
    });

    it('should sort by name descending', () => {
      const items = PartyInventory.filterItems('all');
      const sorted = PartyInventory.sortItems(items, 'name-desc');

      expect(sorted[0].equipment.name).toBe('Zebra Sword');
      expect(sorted[1].equipment.name).toBe('Beta Potion');
      expect(sorted[2].equipment.name).toBe('Alpha Shield');
    });

    it('should sort by type', () => {
      const items = PartyInventory.filterItems('all');
      const sorted = PartyInventory.sortItems(items, 'type');

      // Types in order: Held, OneHandedWeapon, Shield
      expect(sorted[0].equipment.type).toBe('Held');
      expect(sorted[1].equipment.type).toBe('OneHandedWeapon');
      expect(sorted[2].equipment.type).toBe('Shield');
    });

    it('should sort by recently-added (most recent first)', () => {
      const items = PartyInventory.filterItems('all');
      const sorted = PartyInventory.sortItems(items, 'recently-added');

      // Most recent first: beta-potion, alpha-shield, zebra-sword
      expect(sorted[0].equipment.id).toBe('beta-potion-001');
      expect(sorted[1].equipment.id).toBe('alpha-shield-001');
      expect(sorted[2].equipment.id).toBe('zebra-sword-001');
    });

    it('should not mutate original array', () => {
      const items = PartyInventory.filterItems('all');
      const originalOrder = items.map(i => i.equipment.name);

      PartyInventory.sortItems(items, 'name-asc');

      expect(items.map(i => i.equipment.name)).toEqual(originalOrder);
    });
  });

  describe('Serialization', () => {
    beforeEach(() => {
      PartyInventory.addItem('iron-sword-001', 3);
      PartyInventory.addItem('health-potion-001', 10);
      PartyInventory.addGold(2500);
    });

    it('should serialize to JSON', () => {
      const json = PartyInventory.toJSON();

      expect(json.items).toEqual({
        'iron-sword-001': 3,
        'health-potion-001': 10
      });
      expect(json.gold).toBe(2500);
      expect(json.maxWeight).toBeNull(); // Infinity serializes to null
      expect(json.currentWeight).toBe(0);
    });

    it('should deserialize from JSON', () => {
      const json = {
        items: {
          'steel-shield-001': 2,
          'leather-armor-001': 1
        },
        gold: 1000,
        maxWeight: null,
        currentWeight: 0
      };

      PartyInventory.fromJSON(json);

      expect(PartyInventory.getItemCount('steel-shield-001')).toBe(2);
      expect(PartyInventory.getItemCount('leather-armor-001')).toBe(1);
      expect(PartyInventory.getGold()).toBe(1000);
    });

    it('should clear existing inventory when loading from JSON', () => {
      const json = {
        items: {
          'steel-shield-001': 1
        },
        gold: 500
      };

      PartyInventory.fromJSON(json);

      expect(PartyInventory.getItemCount('iron-sword-001')).toBe(0);
      expect(PartyInventory.getItemCount('health-potion-001')).toBe(0);
      expect(PartyInventory.getItemCount('steel-shield-001')).toBe(1);
      expect(PartyInventory.getGold()).toBe(500);
    });

    it('should skip invalid equipment IDs when loading', () => {
      const json = {
        items: {
          'iron-sword-001': 2,
          'fake-item-999': 5,
          'health-potion-001': 3
        },
        gold: 100
      };

      PartyInventory.fromJSON(json);

      expect(PartyInventory.getItemCount('iron-sword-001')).toBe(2);
      expect(PartyInventory.getItemCount('fake-item-999')).toBe(0);
      expect(PartyInventory.getItemCount('health-potion-001')).toBe(3);
      expect(PartyInventory.getTotalUniqueItems()).toBe(2);
    });

    it('should handle empty inventory serialization', () => {
      PartyInventory.clear();
      const json = PartyInventory.toJSON();

      expect(json.items).toEqual({});
      expect(json.gold).toBe(0);
    });

    it('should round-trip serialize/deserialize', () => {
      const json1 = PartyInventory.toJSON();
      PartyInventory.clear();
      PartyInventory.fromJSON(json1);
      const json2 = PartyInventory.toJSON();

      expect(json2).toEqual(json1);
    });
  });

  describe('Clear Inventory', () => {
    beforeEach(() => {
      PartyInventory.addItem('iron-sword-001', 5);
      PartyInventory.addItem('health-potion-001', 10);
      PartyInventory.addGold(1000);
    });

    it('should clear all items', () => {
      PartyInventory.clear();

      expect(PartyInventory.getTotalItemCount()).toBe(0);
      expect(PartyInventory.getTotalUniqueItems()).toBe(0);
    });

    it('should clear gold', () => {
      PartyInventory.clear();

      expect(PartyInventory.getGold()).toBe(0);
    });

    it('should reset all items', () => {
      PartyInventory.clear();

      expect(PartyInventory.getAllItems()).toHaveLength(0);
    });
  });

  describe('Insertion Order Tracking', () => {
    it('should track insertion order independently of removal', () => {
      // Add items in specific order
      PartyInventory.addItem('iron-sword-001', 1);
      PartyInventory.addItem('steel-shield-001', 1);
      PartyInventory.addItem('health-potion-001', 1);

      // Remove middle item
      PartyInventory.removeItem('steel-shield-001', 1);

      // Add new item
      PartyInventory.addItem('leather-armor-001', 1);

      const items = PartyInventory.filterItems('all');
      const sorted = PartyInventory.sortItems(items, 'recently-added');

      // Most recent should be leather-armor, then health-potion, then iron-sword
      expect(sorted[0].equipment.id).toBe('leather-armor-001');
      expect(sorted[1].equipment.id).toBe('health-potion-001');
      expect(sorted[2].equipment.id).toBe('iron-sword-001');
    });

    it('should preserve insertion timestamp when adding to existing stack', () => {
      PartyInventory.addItem('iron-sword-001', 1);
      PartyInventory.addItem('steel-shield-001', 1);

      // Add more to first item
      PartyInventory.addItem('iron-sword-001', 5);

      const items = PartyInventory.filterItems('all');
      const sorted = PartyInventory.sortItems(items, 'recently-added');

      // steel-shield should be most recent
      expect(sorted[0].equipment.id).toBe('steel-shield-001');
      expect(sorted[1].equipment.id).toBe('iron-sword-001');
    });

    it('should clear insertion order when clearing inventory', () => {
      PartyInventory.addItem('iron-sword-001', 1);
      PartyInventory.clear();
      PartyInventory.addItem('steel-shield-001', 1);
      PartyInventory.addItem('iron-sword-001', 1);

      const items = PartyInventory.filterItems('all');
      const sorted = PartyInventory.sortItems(items, 'recently-added');

      // iron-sword should be most recent now
      expect(sorted[0].equipment.id).toBe('iron-sword-001');
      expect(sorted[1].equipment.id).toBe('steel-shield-001');
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple operations in sequence', () => {
      PartyInventory.addItem('iron-sword-001', 10);
      PartyInventory.removeItem('iron-sword-001', 3);
      PartyInventory.addItem('iron-sword-001', 5);
      PartyInventory.removeItem('iron-sword-001', 7);

      expect(PartyInventory.getItemCount('iron-sword-001')).toBe(5); // 10 - 3 + 5 - 7
    });

    it('should handle gold operations in sequence', () => {
      PartyInventory.addGold(1000);
      PartyInventory.removeGold(300);
      PartyInventory.addGold(500);
      PartyInventory.removeGold(200);

      expect(PartyInventory.getGold()).toBe(1000); // 1000 - 300 + 500 - 200
    });

    it('should maintain separate counts for different items', () => {
      PartyInventory.addItem('iron-sword-001', 5);
      PartyInventory.addItem('steel-shield-001', 3);

      PartyInventory.removeItem('iron-sword-001', 2);

      expect(PartyInventory.getItemCount('iron-sword-001')).toBe(3);
      expect(PartyInventory.getItemCount('steel-shield-001')).toBe(3);
    });

    it('should handle quest item stacking', () => {
      PartyInventory.addItem('ancient-key-001', 1);
      PartyInventory.addItem('ancient-key-001', 2);

      expect(PartyInventory.getItemCount('ancient-key-001')).toBe(3);

      // Still cannot remove even when stacked
      const result = PartyInventory.removeItem('ancient-key-001', 1);
      expect(result).toBe(false);
    });
  });

  describe('Singleton Pattern', () => {
    it('should maintain state across multiple static calls', () => {
      PartyInventory.addItem('iron-sword-001', 3);
      PartyInventory.addGold(500);

      // Different operations should see the same state
      expect(PartyInventory.hasItem('iron-sword-001', 3)).toBe(true);
      expect(PartyInventory.hasGold(500)).toBe(true);
      expect(PartyInventory.getItemCount('iron-sword-001')).toBe(3);
    });

    it('should preserve state after serialization', () => {
      PartyInventory.addItem('iron-sword-001', 5);
      PartyInventory.addGold(1000);

      PartyInventory.toJSON();

      // State should be unchanged after serialization
      expect(PartyInventory.getItemCount('iron-sword-001')).toBe(5);
      expect(PartyInventory.getGold()).toBe(1000);
    });
  });
});
