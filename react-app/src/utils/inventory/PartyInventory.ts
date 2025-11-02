import { Equipment } from '../../models/combat/Equipment';

/**
 * Inventory category filters derived from Equipment.type
 */
export type InventoryCategory =
  | 'all'
  | 'weapons'
  | 'shields'
  | 'armor'
  | 'accessories'
  | 'held'
  | 'quest-items';

/**
 * Sorting modes for inventory items
 */
export type InventorySortMode =
  | 'name-asc'
  | 'name-desc'
  | 'type'
  | 'recently-added';

/**
 * JSON format for serialization
 */
export interface PartyInventoryJSON {
  items: Record<string, number>;
  gold: number;
  maxWeight?: number | null;
  currentWeight?: number;
}

/**
 * Item with quantity and Equipment data
 */
export interface InventoryItem {
  equipment: Equipment;
  quantity: number;
}

/**
 * Global singleton managing the player party's shared inventory.
 * All items are Equipment instances, stored with quantity tracking by equipment ID.
 */
export class PartyInventory {
  // Private constructor to prevent instantiation
  private constructor() {}

  // Static instance (singleton)
  private static instance: PartyInventory | null = null;

  // Get or create singleton instance
  private static getInstance(): PartyInventory {
    if (!PartyInventory.instance) {
      PartyInventory.instance = new PartyInventory();
    }
    return PartyInventory.instance;
  }

  // Private implementation fields
  private items: Map<string, number> = new Map(); // equipmentId -> quantity
  private gold: number = 0;
  private maxWeight: number = Infinity;
  private currentWeight: number = 0;

  // Track insertion order for "recently added" sorting
  private insertionOrder: Map<string, number> = new Map(); // equipmentId -> timestamp
  private nextTimestamp: number = 0;

  // ============================================
  // Public Static API - Adding Items
  // ============================================

  /**
   * Add item(s) to inventory by equipment ID
   * @param equipmentId The equipment ID to add
   * @param quantity Number of items to add (default: 1)
   * @returns true if successful, false if equipment not found
   */
  static addItem(equipmentId: string, quantity: number = 1): boolean {
    return PartyInventory.getInstance().addItemInternal(equipmentId, quantity);
  }

  /**
   * Add gold to inventory
   * @param amount Amount of gold to add
   */
  static addGold(amount: number): void {
    PartyInventory.getInstance().addGoldInternal(amount);
  }

  // ============================================
  // Public Static API - Removing Items
  // ============================================

  /**
   * Remove item(s) from inventory
   * @param equipmentId The equipment ID to remove
   * @param quantity Number of items to remove (default: 1)
   * @returns true if successful, false if insufficient quantity or quest item
   */
  static removeItem(equipmentId: string, quantity: number = 1): boolean {
    return PartyInventory.getInstance().removeItemInternal(equipmentId, quantity);
  }

  /**
   * Remove gold from inventory
   * @param amount Amount of gold to remove
   * @returns true if successful, false if insufficient gold
   */
  static removeGold(amount: number): boolean {
    return PartyInventory.getInstance().removeGoldInternal(amount);
  }

  // ============================================
  // Public Static API - Querying
  // ============================================

  /**
   * Get quantity of specific item in inventory
   * @param equipmentId The equipment ID to check
   * @returns Quantity in inventory (0 if not found)
   */
  static getItemCount(equipmentId: string): number {
    return PartyInventory.getInstance().getItemCountInternal(equipmentId);
  }

  /**
   * Get total quantity of all items in inventory
   * @returns Sum of all item quantities
   */
  static getTotalItemCount(): number {
    return PartyInventory.getInstance().getTotalItemCountInternal();
  }

  /**
   * Get number of unique item types in inventory
   * @returns Number of unique equipment IDs
   */
  static getTotalUniqueItems(): number {
    return PartyInventory.getInstance().getTotalUniqueItemsInternal();
  }

  /**
   * Get current gold amount
   * @returns Current gold
   */
  static getGold(): number {
    return PartyInventory.getInstance().getGoldInternal();
  }

  /**
   * Check if inventory has at least the specified quantity of an item
   * @param equipmentId The equipment ID to check
   * @param quantity Minimum quantity needed (default: 1)
   * @returns true if inventory has enough, false otherwise
   */
  static hasItem(equipmentId: string, quantity: number = 1): boolean {
    return PartyInventory.getInstance().hasItemInternal(equipmentId, quantity);
  }

  /**
   * Check if inventory has at least the specified amount of gold
   * @param amount Minimum gold needed
   * @returns true if inventory has enough, false otherwise
   */
  static hasGold(amount: number): boolean {
    return PartyInventory.getInstance().hasGoldInternal(amount);
  }

  /**
   * Get all items as array of {equipmentId, quantity}
   * @returns Array of all items
   */
  static getAllItems(): Array<{ equipmentId: string; quantity: number }> {
    return PartyInventory.getInstance().getAllItemsInternal();
  }

  /**
   * Get items by category
   * @param category The category to filter by
   * @returns Array of items in that category
   */
  static getItemsByCategory(category: InventoryCategory): Array<{ equipmentId: string; quantity: number }> {
    return PartyInventory.getInstance().getItemsByCategoryInternal(category);
  }

  /**
   * Filter items by category, returning full Equipment data
   * @param category The category to filter by
   * @returns Array of InventoryItem with Equipment instances
   */
  static filterItems(category: InventoryCategory): InventoryItem[] {
    return PartyInventory.getInstance().filterItemsInternal(category);
  }

  /**
   * Sort items by specified mode
   * @param items Items to sort
   * @param mode Sort mode
   * @returns Sorted items
   */
  static sortItems(items: InventoryItem[], mode: InventorySortMode): InventoryItem[] {
    return PartyInventory.getInstance().sortItemsInternal(items, mode);
  }

  /**
   * Get item details (Equipment + quantity)
   * @param equipmentId The equipment ID to get details for
   * @returns Item details or null if not found
   */
  static getItemDetails(equipmentId: string): InventoryItem | null {
    return PartyInventory.getInstance().getItemDetailsInternal(equipmentId);
  }

  // ============================================
  // Public Static API - Serialization
  // ============================================

  /**
   * Serialize inventory to JSON
   * @returns JSON representation of inventory
   */
  static toJSON(): PartyInventoryJSON {
    return PartyInventory.getInstance().toJSONInternal();
  }

  /**
   * Load inventory from JSON
   * @param json JSON data to load
   */
  static fromJSON(json: PartyInventoryJSON): void {
    PartyInventory.getInstance().fromJSONInternal(json);
  }

  /**
   * Clear all items and gold from inventory
   */
  static clear(): void {
    PartyInventory.getInstance().clearInternal();
  }

  // ============================================
  // Private Implementation Methods
  // ============================================

  private addItemInternal(equipmentId: string, quantity: number): boolean {
    if (quantity <= 0) {
      return true; // No-op for 0 or negative quantity
    }

    // Validate equipment exists
    const equipment = Equipment.getById(equipmentId);
    if (!equipment) {
      console.warn(`[PartyInventory] Equipment not found: ${equipmentId}`);
      return false;
    }

    // Add/increment quantity
    const current = this.items.get(equipmentId) || 0;
    this.items.set(equipmentId, current + quantity);

    // Track insertion order (for recently-added sorting)
    if (!this.insertionOrder.has(equipmentId)) {
      this.insertionOrder.set(equipmentId, this.nextTimestamp++);
    }

    return true;
  }

  private addGoldInternal(amount: number): void {
    if (amount > 0) {
      this.gold += amount;
    }
  }

  private removeItemInternal(equipmentId: string, quantity: number): boolean {
    if (quantity <= 0) {
      return true; // No-op for 0 or negative quantity
    }

    // Check if item is a quest item
    const equipment = Equipment.getById(equipmentId);
    if (equipment?.typeTags?.includes('quest-item')) {
      console.warn(`[PartyInventory] Cannot remove quest item: ${equipmentId}`);
      return false;
    }

    // Check if we have enough quantity
    const current = this.items.get(equipmentId) || 0;
    if (current < quantity) {
      console.warn(`[PartyInventory] Insufficient items: ${equipmentId} (have ${current}, need ${quantity})`);
      return false;
    }

    // Remove/decrement quantity
    const remaining = current - quantity;
    if (remaining === 0) {
      this.items.delete(equipmentId);
      this.insertionOrder.delete(equipmentId);
    } else {
      this.items.set(equipmentId, remaining);
    }

    return true;
  }

  private removeGoldInternal(amount: number): boolean {
    if (amount <= 0) {
      return true; // No-op for 0 or negative amount
    }

    if (this.gold < amount) {
      console.warn(`[PartyInventory] Insufficient gold (have ${this.gold}, need ${amount})`);
      return false;
    }

    this.gold -= amount;
    return true;
  }

  private getItemCountInternal(equipmentId: string): number {
    return this.items.get(equipmentId) || 0;
  }

  private getTotalItemCountInternal(): number {
    let total = 0;
    for (const quantity of this.items.values()) {
      total += quantity;
    }
    return total;
  }

  private getTotalUniqueItemsInternal(): number {
    return this.items.size;
  }

  private getGoldInternal(): number {
    return this.gold;
  }

  private hasItemInternal(equipmentId: string, quantity: number): boolean {
    const current = this.items.get(equipmentId) || 0;
    return current >= quantity;
  }

  private hasGoldInternal(amount: number): boolean {
    return this.gold >= amount;
  }

  private getAllItemsInternal(): Array<{ equipmentId: string; quantity: number }> {
    const result: Array<{ equipmentId: string; quantity: number }> = [];
    for (const [equipmentId, quantity] of this.items.entries()) {
      result.push({ equipmentId, quantity });
    }
    return result;
  }

  private getItemsByCategoryInternal(category: InventoryCategory): Array<{ equipmentId: string; quantity: number }> {
    const result: Array<{ equipmentId: string; quantity: number }> = [];

    for (const [equipmentId, quantity] of this.items.entries()) {
      const equipment = Equipment.getById(equipmentId);
      if (!equipment) continue;

      if (this.matchesCategory(equipment, category)) {
        result.push({ equipmentId, quantity });
      }
    }

    return result;
  }

  private filterItemsInternal(category: InventoryCategory): InventoryItem[] {
    const result: InventoryItem[] = [];

    for (const [equipmentId, quantity] of this.items.entries()) {
      const equipment = Equipment.getById(equipmentId);
      if (!equipment) continue;

      if (this.matchesCategory(equipment, category)) {
        result.push({ equipment, quantity });
      }
    }

    return result;
  }

  private sortItemsInternal(items: InventoryItem[], mode: InventorySortMode): InventoryItem[] {
    const sorted = [...items]; // Create copy to avoid mutating input

    switch (mode) {
      case 'name-asc':
        sorted.sort((a, b) => a.equipment.name.localeCompare(b.equipment.name));
        break;

      case 'name-desc':
        sorted.sort((a, b) => b.equipment.name.localeCompare(a.equipment.name));
        break;

      case 'type':
        sorted.sort((a, b) => {
          const typeCompare = a.equipment.type.localeCompare(b.equipment.type);
          if (typeCompare !== 0) return typeCompare;
          // Within same type, sort by name
          return a.equipment.name.localeCompare(b.equipment.name);
        });
        break;

      case 'recently-added':
        sorted.sort((a, b) => {
          const timeA = this.insertionOrder.get(a.equipment.id) || 0;
          const timeB = this.insertionOrder.get(b.equipment.id) || 0;
          return timeB - timeA; // Most recent first
        });
        break;
    }

    return sorted;
  }

  private getItemDetailsInternal(equipmentId: string): InventoryItem | null {
    const quantity = this.items.get(equipmentId);
    if (!quantity) return null;

    const equipment = Equipment.getById(equipmentId);
    if (!equipment) return null;

    return { equipment, quantity };
  }

  private matchesCategory(equipment: Equipment, category: InventoryCategory): boolean {
    switch (category) {
      case 'all':
        return true;

      case 'weapons':
        return equipment.type === 'OneHandedWeapon' || equipment.type === 'TwoHandedWeapon';

      case 'shields':
        return equipment.type === 'Shield';

      case 'armor':
        return equipment.type === 'Head' || equipment.type === 'Body';

      case 'accessories':
        return equipment.type === 'Accessory';

      case 'held':
        return equipment.type === 'Held';

      case 'quest-items':
        return equipment.typeTags?.includes('quest-item') || false;

      default:
        return false;
    }
  }

  private toJSONInternal(): PartyInventoryJSON {
    return {
      items: Object.fromEntries(this.items),
      gold: this.gold,
      maxWeight: this.maxWeight === Infinity ? null : this.maxWeight,
      currentWeight: this.currentWeight,
    };
  }

  private fromJSONInternal(json: PartyInventoryJSON): void {
    // Clear existing inventory
    this.clearInternal();

    // Load items
    for (const [equipmentId, quantity] of Object.entries(json.items)) {
      // Validate that equipment exists in registry
      const equipment = Equipment.getById(equipmentId);
      if (equipment) {
        this.addItemInternal(equipmentId, quantity);
      } else {
        console.warn(`[PartyInventory] Failed to load item: ${equipmentId} x${quantity} (not in Equipment registry)`);
      }
    }

    // Load gold
    this.gold = json.gold || 0;

    // Load capacity (if present)
    if (json.maxWeight !== undefined && json.maxWeight !== null) {
      this.maxWeight = json.maxWeight;
    }

    if (json.currentWeight !== undefined) {
      this.currentWeight = json.currentWeight;
    }
  }

  private clearInternal(): void {
    this.items.clear();
    this.insertionOrder.clear();
    this.gold = 0;
    this.maxWeight = Infinity;
    this.currentWeight = 0;
    this.nextTimestamp = 0;
  }
}
