# Party Inventory System - Design Overview

**Version:** 1.0
**Created:** 2025-11-01
**Related:** [CombatHierarchy.md](../../CombatHierarchy.md), [VictoryScreenFeatureOverview.md](../VictoryScreen/VictoryScreenFeatureOverview.md)

## Purpose

This document describes the Party Inventory System for VibeDC. The inventory provides a shared storage system for the player's party where equipment, consumables, and quest items can be stored, managed, and equipped to party members. This system integrates with combat victory rewards, party management, and equipment systems.

## Feature Summary

The Party Inventory System provides:
- **Shared storage** for all party members (no individual inventories)
- **Item stacking** for consumables and duplicate equipment
- **Category filtering** (All, Weapons, Armor, Consumables, Quest Items)
- **Sorting options** (Name, Type, Rarity, Recently Added)
- **Item details** display with stats and description
- **Quick equip** functionality from inventory
- **Integration** with combat victory rewards
- **Serialization** for save/load system
- **Capacity management** (optional weight/slot limits)

## Design Philosophy

### Single Party Inventory (No Multi-Party System)

Since there is no multi-party system in VibeDC, the inventory is designed as a **singleton service**:
- One global inventory shared by all party members
- No need for party instance ownership
- Simpler serialization (single inventory state)
- Easier integration with existing systems

### Equipment System Integration

**All Items are Equipment:**
- VibeDC uses a unified `Equipment` class for all items
- No separate "Consumable" or "Item" type exists
- Equipment types include: `OneHandedWeapon`, `TwoHandedWeapon`, `Shield`, `Held`, `Head`, `Body`, `Accessory`
- See: `react-app/src/models/combat/Equipment.ts`

**Stacking Strategy:**
- **All equipment is stackable** by equipment ID
- Identical equipment (same ID) stored as: `{ equipmentId: string, quantity: number }`
- Rationale: Simplifies inventory management, reduces UI clutter
- Future enhancements (durability, enhancement) can be added via item instance wrapper if needed

**Special Item Categories (Future):**
- Quest items: Flag on Equipment or special tag (e.g., `typeTags: ["quest-item"]`)
- Cannot be discarded or sold
- Special UI treatment (separate category filter)

## Core Requirements

### 1. Data Model

#### PartyInventory Class

```typescript
/**
 * Global singleton managing the player party's shared inventory.
 * All items are Equipment instances, stored with quantity tracking.
 */
class PartyInventory {
  // Equipment storage (stackable by equipment ID)
  private items: Map<string, number> = new Map(); // equipmentId -> quantity

  // Gold (currency)
  private gold: number = 0;

  // Capacity limits (optional, for future)
  private maxWeight: number = Infinity;
  private currentWeight: number = 0;
}
```

**Design Rationale:**
- Single `Map<string, number>` for all equipment (unified storage)
- Equipment ID as key ensures stacking of identical items
- Quantity tracking for all items (even "unique" equipment can have duplicates)
- Simpler than multiple storage arrays
- Easy to query, filter, and serialize

#### Item Categories

Categories derived from `Equipment.type`:

```typescript
enum InventoryCategory {
  ALL = 'all',
  WEAPONS = 'weapons',           // OneHandedWeapon, TwoHandedWeapon
  SHIELDS = 'shields',            // Shield
  ARMOR = 'armor',                // Head, Body
  ACCESSORIES = 'accessories',    // Accessory
  HELD = 'held',                  // Held
  QUEST_ITEMS = 'quest-items',    // Future: typeTags includes "quest-item"
}
```

**Mapping to Equipment.type:**
- `WEAPONS`: `equipment.type === 'OneHandedWeapon' || equipment.type === 'TwoHandedWeapon'`
- `SHIELDS`: `equipment.type === 'Shield'`
- `ARMOR`: `equipment.type === 'Head' || equipment.type === 'Body'`
- `ACCESSORIES`: `equipment.type === 'Accessory'`
- `HELD`: `equipment.type === 'Held'`
- `QUEST_ITEMS`: `equipment.typeTags?.includes('quest-item')` (future)

#### Sorting Options

```typescript
enum InventorySortMode {
  NAME_ASC = 'name-asc',
  NAME_DESC = 'name-desc',
  TYPE = 'type',
  RARITY = 'rarity',
  RECENTLY_ADDED = 'recent',
}
```

### 2. Core Operations

#### Adding Items

```typescript
addItem(equipmentId: string, quantity: number = 1): void
addGold(amount: number): void
```

**Behavior:**
- Items: Increment quantity in `items` map (or create entry if new)
- Gold: Add to `gold` counter
- **Validation**: Check capacity limits before adding (if enabled)
- **Events**: Trigger "item added" event for UI updates

**Example:**
```typescript
// Add 1 Flame Blade
PartyInventory.addItem('flame-blade-001', 1);

// Add 5 Health Potions (future consumable)
PartyInventory.addItem('health-potion-001', 5);

// Add 100 gold
PartyInventory.addGold(100);
```

#### Removing Items

```typescript
removeItem(equipmentId: string, quantity: number = 1): boolean
removeGold(amount: number): boolean
```

**Behavior:**
- Items: Decrement quantity in `items` map (remove entry if quantity reaches 0)
- Quest Items: Check if item has "quest-item" tag and **BLOCK** removal
- Gold: Subtract from `gold` counter (fail if insufficient)
- **Return**: `true` if successful, `false` if item not found, insufficient quantity, or is quest item
- **Events**: Trigger "item removed" event for UI updates

**Example:**
```typescript
// Remove 1 Flame Blade
const success = PartyInventory.removeItem('flame-blade-001', 1); // true if removed

// Try to remove quest item (blocked)
const blocked = PartyInventory.removeItem('ancient-key-001', 1); // false (quest item)

// Remove 50 gold
const goldRemoved = PartyInventory.removeGold(50); // true if sufficient gold
```

#### Querying Items

```typescript
getItemCount(equipmentId: string): number
getTotalItemCount(): number
getTotalUniqueItems(): number
getGold(): number

hasItem(equipmentId: string, quantity: number = 1): boolean
hasGold(amount: number): boolean

getItemsByCategory(category: InventoryCategory): Array<{ equipmentId: string, quantity: number }>
getAllItems(): Array<{ equipmentId: string, quantity: number }>

filterItems(category: InventoryCategory): Array<{ equipment: Equipment, quantity: number }>
sortItems(items: Array<{ equipment: Equipment, quantity: number }>, mode: InventorySortMode): Array<{ equipment: Equipment, quantity: number }>
```

**Helper Methods:**
```typescript
// Get Equipment instance from ID
getEquipment(equipmentId: string): Equipment | undefined {
  return Equipment.getById(equipmentId);
}

// Get item with quantity and Equipment data
getItemDetails(equipmentId: string): { equipment: Equipment, quantity: number } | null {
  const quantity = this.items.get(equipmentId);
  if (!quantity) return null;

  const equipment = Equipment.getById(equipmentId);
  if (!equipment) return null;

  return { equipment, quantity };
}
```

### 3. Integration with Combat Rewards

#### Victory Screen → Inventory

When player exits victory screen with looted items:

```typescript
// In VictoryPhaseHandler.handleExitEncounter()
const lootedEquipment = this.rewards.items.filter(item =>
  this.lootedItemIds.has(item.id)
);

for (const equipment of lootedEquipment) {
  PartyInventory.addItem(equipment.id, 1);
}

PartyInventory.addGold(this.rewards.gold);
// Experience is applied directly to party members (not stored in inventory)
```

**Flow:**
1. Player selects items in victory screen
2. Clicks "Exit Encounter"
3. Selected items added to `PartyInventory` (stacked by equipment ID)
4. Gold added to `PartyInventory`
5. Combat view closes, returns to overworld
6. Inventory UI reflects new items (if open)

**Stacking Example:**
- Victory 1: Loot "Iron Sword" → Inventory has 1x Iron Sword
- Victory 2: Loot "Iron Sword" → Inventory has 2x Iron Sword
- Victory 3: Loot "Flame Blade" → Inventory has 2x Iron Sword, 1x Flame Blade

### 4. Serialization

#### JSON Format

```typescript
interface PartyInventoryJSON {
  // Items (map of equipmentId -> quantity)
  items: Record<string, number>;

  // Gold
  gold: number;

  // Optional: capacity settings
  maxWeight?: number;
  currentWeight?: number;
}
```

**Example:**
```json
{
  "items": {
    "flame-blade-001": 2,
    "iron-helmet-001": 1,
    "leather-armor-001": 3,
    "health-potion-001": 15
  },
  "gold": 450,
  "maxWeight": null,
  "currentWeight": 0
}
```

#### Serialization Methods

```typescript
class PartyInventory {
  toJSON(): PartyInventoryJSON {
    return {
      items: Object.fromEntries(this.items),
      gold: this.gold,
      maxWeight: this.maxWeight === Infinity ? null : this.maxWeight,
      currentWeight: this.currentWeight,
    };
  }

  static fromJSON(json: PartyInventoryJSON): void {
    // Clear existing inventory
    PartyInventory.clear();

    // Load items
    for (const [equipmentId, quantity] of Object.entries(json.items)) {
      // Validate that equipment exists in registry
      const equipment = Equipment.getById(equipmentId);
      if (equipment) {
        PartyInventory.addItem(equipmentId, quantity);
      } else {
        console.warn(`[PartyInventory] Failed to load item: ${equipmentId} (not in Equipment registry)`);
      }
    }

    // Load gold
    PartyInventory.addGold(json.gold);

    // Load capacity (if present)
    if (json.maxWeight !== undefined && json.maxWeight !== null) {
      PartyInventory.setMaxWeight(json.maxWeight);
    }
  }
}
```

### 5. UI Representation (Future)

While UI implementation is beyond the scope of this document, the inventory system is designed to support:

#### Inventory Panel Layout

```
┌─────────────────────────────────────┐
│ INVENTORY                   Gold: 450│
├─────────────────────────────────────┤
│ [All] [Weapons] [Armor] [Accessories]│
│                                      │
│ Sort: [Name ▼]                       │
├─────────────────────────────────────┤
│ ☐ Flame Blade (x2)     [Equip] [Drop]│
│ ☐ Iron Helmet (x1)     [Equip] [Drop]│
│ ☐ Leather Armor (x3)   [Equip] [Drop]│
│ ☐ Swift Boots (x1)     [Equip] [Drop]│
│ ⚑ Ancient Key (x1)     (Quest Item)  │
│                                      │
│ ...                                  │
├─────────────────────────────────────┤
│ [Selected Item Details]              │
│ Flame Blade (OneHandedWeapon)        │
│ +12 Physical Power, +8 Magic Power   │
│ Range: 1-2, Tags: weapon, medium     │
└─────────────────────────────────────┘
```

**Features:**
- Category tabs for filtering
- Sort dropdown
- Item list with checkboxes for batch operations
- Context actions (Equip, Use, Drop)
- Selected item detail pane
- Gold display in header
- Quest items marked with special icon (⚑)

### 6. Capacity Management (Optional)

#### Weight System (Future Enhancement)

```typescript
interface CapacityConfig {
  enabled: boolean;
  maxWeight: number;
  currentWeight: number;
}

class PartyInventory {
  private capacityConfig: CapacityConfig = {
    enabled: false, // Disabled by default
    maxWeight: Infinity,
    currentWeight: 0,
  };

  enableWeightLimit(maxWeight: number): void {
    this.capacityConfig.enabled = true;
    this.capacityConfig.maxWeight = maxWeight;
  }

  disableWeightLimit(): void {
    this.capacityConfig.enabled = false;
  }

  private canAddItem(weight: number): boolean {
    if (!this.capacityConfig.enabled) return true;
    return this.capacityConfig.currentWeight + weight <= this.capacityConfig.maxWeight;
  }
}
```

**Design Decision:** Capacity limits are **optional** and **disabled by default**. This allows:
- Simple gameplay initially (unlimited inventory)
- Future enhancement for difficulty/realism
- Easy toggle for different game modes

## Implementation Strategy

### Phase 1: Core Data Model

**Goal:** Implement `PartyInventory` class with basic storage

**Tasks:**
1. Create `PartyInventory.ts` in `utils/` or `services/`
2. Implement singleton pattern with static methods
3. Implement equipment storage (array-based)
4. Implement consumables storage (Map-based)
5. Implement quest items storage (array-based)
6. Implement gold storage (number)
7. Write unit tests for core operations

**Validation:**
- Can add equipment
- Can add consumables (with stacking)
- Can add quest items
- Can add gold
- Can query item counts
- Can check item existence

### Phase 2: Item Operations

**Goal:** Implement add/remove operations with validation

**Tasks:**
1. Implement `addEquipment()`
2. Implement `addConsumable()` with quantity stacking
3. Implement `addQuestItem()`
4. Implement `addGold()`
5. Implement `removeEquipment()`
6. Implement `removeConsumable()` with quantity decrement
7. Implement `removeGold()`
8. Add validation (prevent removing quest items)
9. Write unit tests for all operations

**Validation:**
- Adding items updates storage correctly
- Removing items updates storage correctly
- Cannot remove quest items
- Cannot remove more gold than available
- Consumable stacking works correctly
- Removing last consumable removes entry from map

### Phase 3: Querying and Filtering

**Goal:** Implement query methods for UI and gameplay

**Tasks:**
1. Implement `getEquipmentByCategory()`
2. Implement `getAllConsumables()`
3. Implement `getAllQuestItems()`
4. Implement `filterItems()` with category support
5. Implement `sortItems()` with multiple modes
6. Implement `has*()` check methods
7. Write unit tests for queries

**Validation:**
- Filtering by category returns correct items
- Sorting orders items correctly
- Query methods return accurate counts
- Check methods correctly validate existence

### Phase 4: Serialization

**Goal:** Enable save/load functionality

**Tasks:**
1. Implement `toJSON()` method
2. Implement `fromJSON()` static method
3. Handle missing items gracefully (log warnings)
4. Integrate with existing save/load system
5. Write serialization tests
6. Test with real save data

**Validation:**
- Inventory serializes to JSON correctly
- Inventory deserializes from JSON correctly
- Missing items logged but don't crash
- Round-trip serialization preserves data

### Phase 5: Combat Integration

**Goal:** Connect inventory to victory screen

**Tasks:**
1. Modify `VictoryPhaseHandler.handleExitEncounter()`
2. Add looted items to inventory on exit
3. Add gold to inventory on exit
4. Remove placeholder logging
5. Test full combat → loot → inventory flow

**Validation:**
- Looted items appear in inventory after combat
- Gold is added correctly
- Unlooted items are not added
- Multiple combats accumulate loot correctly

### Phase 6: Event System (Optional)

**Goal:** Enable UI reactivity

**Tasks:**
1. Create `InventoryEvent` types
2. Implement event emitter pattern
3. Add `onItemAdded` event
4. Add `onItemRemoved` event
5. Add `onGoldChanged` event
6. Write event tests

**Validation:**
- Events fire when items added
- Events fire when items removed
- Event listeners can subscribe/unsubscribe
- Multiple listeners work correctly

### Phase 7: Capacity System (Optional, Future)

**Goal:** Add weight/slot limits

**Tasks:**
1. Add `CapacityConfig` interface
2. Implement weight tracking
3. Implement weight limit checks
4. Add UI feedback for full inventory
5. Write capacity tests

**Validation:**
- Cannot add items when over capacity
- Weight calculated correctly
- Can toggle capacity on/off
- UI shows current/max capacity

## Technical Details

### Singleton Pattern

```typescript
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

  // Public static API
  static addItem(equipmentId: string, quantity: number = 1): void {
    return PartyInventory.getInstance().addItemInternal(equipmentId, quantity);
  }

  static getItemCount(equipmentId: string): number {
    return PartyInventory.getInstance().getItemCountInternal(equipmentId);
  }

  // ... other static methods

  // Private implementation methods
  private items: Map<string, number> = new Map(); // equipmentId -> quantity
  private gold: number = 0;

  private addItemInternal(equipmentId: string, quantity: number): void {
    const current = this.items.get(equipmentId) || 0;
    this.items.set(equipmentId, current + quantity);
  }

  private getItemCountInternal(equipmentId: string): number {
    return this.items.get(equipmentId) || 0;
  }

  // ... other private methods
}
```

**Why Singleton:**
- Only one party inventory in the game
- Easy global access without prop drilling
- Simple serialization (single state object)
- No need for React context or dependency injection

### Alternative: Static Class Pattern

```typescript
export class PartyInventory {
  // Direct static storage (simpler than singleton)
  private static items: Map<string, number> = new Map(); // equipmentId -> quantity
  private static gold: number = 0;

  // Static methods operate directly on static fields
  static addItem(equipmentId: string, quantity: number = 1): void {
    const current = PartyInventory.items.get(equipmentId) || 0;
    PartyInventory.items.set(equipmentId, current + quantity);
  }

  static getItemCount(equipmentId: string): number {
    return PartyInventory.items.get(equipmentId) || 0;
  }

  // ... other methods
}
```

**Trade-offs:**
- **Simpler**: No getInstance() boilerplate
- **Testing**: Harder to reset state between tests (need explicit clear() calls)
- **Initialization**: State initialized immediately on module load
- **Recommendation**: Use singleton pattern for better testability

### Stacking Strategy: ID + Quantity

**Why Stack by ID:**
- Equipment instances from the `Equipment` registry are templates (no unique state)
- Two "Flame Blade" items are functionally identical
- Stacking reduces UI clutter and simplifies management

**Implementation:**
```typescript
private items: Map<string, number> = new Map(); // equipmentId -> quantity

addItem(equipmentId: string, quantity: number = 1): void {
  const current = this.items.get(equipmentId) || 0;
  this.items.set(equipmentId, current + quantity);
}

removeItem(equipmentId: string, quantity: number = 1): boolean {
  const current = this.items.get(equipmentId) || 0;

  if (current < quantity) {
    return false; // Insufficient quantity
  }

  const remaining = current - quantity;
  if (remaining === 0) {
    this.items.delete(equipmentId); // Remove entry when depleted
  } else {
    this.items.set(equipmentId, remaining);
  }

  return true;
}

getItemCount(equipmentId: string): number {
  return this.items.get(equipmentId) || 0;
}
```

**Benefits:**
- O(1) lookup, add, remove
- Automatic quantity tracking
- Clean deletion when quantity reaches 0
- Simple serialization (just save the map)

**Future Enhancement: Item Instances**
If item-specific state is needed (durability, enhancements), create wrapper:

```typescript
interface InventoryItem {
  equipmentId: string;
  quantity: number;
  instances?: Array<{
    durability?: number;
    enhancement?: number;
    customName?: string;
  }>;
}

private items: Map<string, InventoryItem> = new Map();
```

This allows both stacking (for identical items) and instance tracking (for modified items).

### Quest Item Protection

Quest items are identified by a special tag in their `typeTags` array:

```typescript
// In equipment-definitions.yaml (future)
- id: "ancient-key-001"
  name: "Ancient Key"
  type: "Held"
  modifiers: {}
  typeTags: ["quest-item", "unique"]

// In PartyInventory
removeItem(equipmentId: string, quantity: number = 1): boolean {
  // Check if item is a quest item
  const equipment = Equipment.getById(equipmentId);
  if (equipment && equipment.typeTags?.includes('quest-item')) {
    console.warn(`[PartyInventory] Cannot remove quest item: ${equipmentId}`);
    return false;
  }

  // Proceed with normal removal
  const current = this.items.get(equipmentId) || 0;

  if (current < quantity) {
    return false;
  }

  const remaining = current - quantity;
  if (remaining === 0) {
    this.items.delete(equipmentId);
  } else {
    this.items.set(equipmentId, remaining);
  }

  return true;
}
```

**Benefits:**
- Prevents accidental quest item loss
- Uses existing `typeTags` system (no new properties needed)
- UI can show special icon for quest items

### Event System Architecture (Optional)

For UI reactivity, implement simple event emitter:

```typescript
type InventoryEventType =
  | 'item-added'
  | 'item-removed'
  | 'gold-changed';

interface InventoryEvent {
  type: InventoryEventType;
  data: unknown;
}

type InventoryEventListener = (event: InventoryEvent) => void;

class PartyInventory {
  private static listeners: Map<InventoryEventType, Set<InventoryEventListener>> = new Map();

  static addEventListener(type: InventoryEventType, listener: InventoryEventListener): void {
    if (!PartyInventory.listeners.has(type)) {
      PartyInventory.listeners.set(type, new Set());
    }
    PartyInventory.listeners.get(type)!.add(listener);
  }

  static removeEventListener(type: InventoryEventType, listener: InventoryEventListener): void {
    PartyInventory.listeners.get(type)?.delete(listener);
  }

  private static emit(type: InventoryEventType, data: unknown): void {
    const event: InventoryEvent = { type, data };
    PartyInventory.listeners.get(type)?.forEach(listener => listener(event));
  }

  // In add/remove methods:
  static addEquipment(equipment: Equipment): void {
    PartyInventory.getInstance().equipment.push(equipment);
    PartyInventory.emit('item-added', { itemType: 'equipment', item: equipment });
  }
}
```

**React Integration:**
```typescript
function InventoryPanel() {
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  useEffect(() => {
    const listener = () => forceUpdate();

    PartyInventory.addEventListener('item-added', listener);
    PartyInventory.addEventListener('item-removed', listener);
    PartyInventory.addEventListener('gold-changed', listener);

    return () => {
      PartyInventory.removeEventListener('item-added', listener);
      PartyInventory.removeEventListener('item-removed', listener);
      PartyInventory.removeEventListener('gold-changed', listener);
    };
  }, []);

  const items = PartyInventory.getAllItems();
  // ... render items
}
```

## Integration Points

### 1. Combat Victory Screen

**File:** `models/combat/VictoryPhaseHandler.ts`

**Change:**
```typescript
private handleExitEncounter(state: CombatState, encounter: CombatEncounter): PhaseEventResult {
  // Add looted items to inventory
  const lootedEquipment = this.rewards.items.filter(item =>
    this.lootedItemIds.has(item.id)
  );

  for (const equipment of lootedEquipment) {
    PartyInventory.addEquipment(equipment);
  }

  // Add gold to inventory
  PartyInventory.addGold(this.rewards.gold);

  // Award experience to party members
  // (implementation depends on party system)

  console.log('[VictoryPhaseHandler] Items added to inventory:', lootedEquipment.length);
  console.log('[VictoryPhaseHandler] Gold added to inventory:', this.rewards.gold);

  // TODO: Transition back to overworld
  return { handled: true };
}
```

### 2. Save/Load System

**File:** `utils/SaveManager.ts` (or similar)

**Save:**
```typescript
interface SaveData {
  // ... existing save data
  inventory: PartyInventoryJSON;
}

function saveGame(): SaveData {
  return {
    // ... other data
    inventory: PartyInventory.toJSON(),
  };
}
```

**Load:**
```typescript
function loadGame(saveData: SaveData): void {
  // ... load other data
  PartyInventory.fromJSON(saveData.inventory);
}
```

### 3. Equipment Panel (Future)

**File:** `components/party/EquipmentPanel.tsx` (future)

**Example:**
```typescript
function EquipmentPanel({ unit }: { unit: HumanoidUnit }) {
  const weaponItems = PartyInventory.getItemsByCategory('weapons');

  const handleEquipWeapon = (equipmentId: string) => {
    const equipment = Equipment.getById(equipmentId);
    if (!equipment) return;

    // Remove 1 weapon from inventory
    if (!PartyInventory.removeItem(equipmentId, 1)) {
      alert('Failed to remove item from inventory');
      return;
    }

    // Equip to unit
    const previousWeapon = unit.leftHand;
    unit.equipLeftHand(equipment);

    // Add previous weapon back to inventory (if any)
    if (previousWeapon) {
      PartyInventory.addItem(previousWeapon.id, 1);
    }
  };

  return (
    <div>
      <h3>Available Weapons</h3>
      {weaponItems.map(({ equipmentId, quantity }) => {
        const equipment = Equipment.getById(equipmentId);
        if (!equipment) return null;

        return (
          <button key={equipmentId} onClick={() => handleEquipWeapon(equipmentId)}>
            Equip {equipment.name} (x{quantity})
          </button>
        );
      })}
    </div>
  );
}
```

### 4. Shop System (Future)

**File:** `components/shop/ShopPanel.tsx` (future)

**Example:**
```typescript
interface ShopItem {
  equipmentId: string;
  price: number;
  stock: number; // -1 = infinite
}

function ShopPanel({ shopItems }: { shopItems: ShopItem[] }) {
  const playerGold = PartyInventory.getGold();

  const handlePurchase = (equipmentId: string, price: number) => {
    if (!PartyInventory.hasGold(price)) {
      alert('Not enough gold!');
      return;
    }

    const equipment = Equipment.getById(equipmentId);
    if (!equipment) return;

    PartyInventory.removeGold(price);
    PartyInventory.addItem(equipmentId, 1);

    alert(`Purchased ${equipment.name}!`);
  };

  return (
    <div>
      <h3>Shop (Gold: {playerGold})</h3>
      {shopItems.map(({ equipmentId, price, stock }) => {
        const equipment = Equipment.getById(equipmentId);
        if (!equipment) return null;

        return (
          <button
            key={equipmentId}
            onClick={() => handlePurchase(equipmentId, price)}
            disabled={stock === 0 || playerGold < price}
          >
            Buy {equipment.name} ({price}g) {stock >= 0 ? `[${stock} left]` : ''}
          </button>
        );
      })}
    </div>
  );
}
```

## Edge Cases and Considerations

### 1. Missing Items on Load

**Issue:** Save data references equipment IDs that no longer exist in registry

**Solution:**
```typescript
static fromJSON(json: PartyInventoryJSON): void {
  for (const [equipmentId, quantity] of Object.entries(json.items)) {
    const equipment = Equipment.getById(equipmentId);
    if (equipment) {
      PartyInventory.addItem(equipmentId, quantity);
    } else {
      console.warn(`[PartyInventory] Failed to load item: ${equipmentId} x${quantity} (not in Equipment registry)`);
      // Option: Add to "missing items" list for user notification
    }
  }
}
```

**User Impact:** Lost items from save data (graceful degradation)

### 2. Stacking Identical Equipment

**Issue:** Multiple instances of same equipment (same ID)

**Current Behavior:** Automatically stacked by equipment ID

**Implementation:**
```typescript
addItem(equipmentId: string, quantity: number = 1): void {
  const current = this.items.get(equipmentId) || 0;
  this.items.set(equipmentId, current + quantity);
}
```

**Example:**
- Add "flame-blade-001" → Map has { "flame-blade-001": 1 }
- Add "flame-blade-001" again → Map has { "flame-blade-001": 2 }
- UI shows: "Flame Blade (x2)"

**Benefits:**
- Simpler than tracking individual instances
- Reduces UI clutter
- Easy to serialize (just save map)

**Future:** If item-specific state needed (durability, enhancements), use instance wrapper

### 3. Removing Equipped Items (Future Enhancement)

**Issue:** Player tries to remove item that is currently equipped on a unit

**Solution:** Track equipped items separately or check before removing:

```typescript
// Option 1: Prevent removal if equipped
removeItem(equipmentId: string, quantity: number = 1): boolean {
  // Check if any party member has this equipped
  const equippedCount = this.getEquippedCount(equipmentId); // Future method
  const availableCount = this.getItemCount(equipmentId) - equippedCount;

  if (availableCount < quantity) {
    console.warn(`Cannot remove ${quantity}x ${equipmentId}: only ${availableCount} available (${equippedCount} equipped)`);
    return false;
  }

  // Proceed with removal
  // ...
}

// Option 2: Allow removal, auto-unequip
removeItem(equipmentId: string, quantity: number = 1): boolean {
  // Unequip from units if needed
  this.unequipFromAllUnits(equipmentId, quantity); // Future method

  // Proceed with removal
  // ...
}
```

**Note:** Requires tracking which items are equipped on which units (future enhancement)

### 4. Quest Items

**Issue:** Quest items should not be removable

**Solution:** Check `typeTags` for "quest-item" and block removal:
```typescript
removeItem(equipmentId: string, quantity: number = 1): boolean {
  const equipment = Equipment.getById(equipmentId);
  if (equipment?.typeTags?.includes('quest-item')) {
    console.warn(`[PartyInventory] Cannot remove quest item: ${equipmentId}`);
    return false;
  }

  // Proceed with normal removal
  // ...
}
```

**Equipment Definition:**
```yaml
# In equipment-definitions.yaml
- id: "ancient-key-001"
  name: "Ancient Key"
  type: "Held"
  modifiers: {}
  typeTags: ["quest-item", "unique"]
```

**UI:** Quest items shown with ⚑ icon, no "Drop" button

### 5. Item Over-removal

**Issue:** Trying to remove more items than available

**Solution:** Check quantity before removing:
```typescript
removeItem(equipmentId: string, quantity: number = 1): boolean {
  const current = this.items.get(equipmentId) || 0;

  if (current < quantity) {
    console.warn(`[PartyInventory] Insufficient items: ${equipmentId} (have ${current}, need ${quantity})`);
    return false;
  }

  const remaining = current - quantity;
  if (remaining === 0) {
    this.items.delete(equipmentId); // Remove entry when depleted
  } else {
    this.items.set(equipmentId, remaining);
  }

  return true;
}
```

**Return Value:** `false` indicates failure, caller should handle error

**Example:**
```typescript
// Try to remove 5 Flame Blades when only 2 in inventory
const removed = PartyInventory.removeItem('flame-blade-001', 5); // false
console.log(removed); // false - operation failed
```

### 6. Inventory Full (If Capacity Enabled - Future)

**Issue:** Cannot add item due to weight limit

**Solution:** Check capacity before adding:
```typescript
addItem(equipmentId: string, quantity: number = 1): boolean {
  const equipment = Equipment.getById(equipmentId);
  if (!equipment) {
    console.warn(`[PartyInventory] Equipment not found: ${equipmentId}`);
    return false;
  }

  // Check weight capacity (future: add weight property to Equipment)
  const itemWeight = (equipment as any).weight || 0;
  const totalWeight = itemWeight * quantity;

  if (!this.canAddWeight(totalWeight)) {
    console.warn(`[PartyInventory] Inventory full, cannot add ${quantity}x ${equipmentId} (${totalWeight} weight)`);
    return false;
  }

  const current = this.items.get(equipmentId) || 0;
  this.items.set(equipmentId, current + quantity);
  this.currentWeight += totalWeight;
  return true;
}
```

**UI:** Show error message "Inventory full!" and prevent looting

**Note:** Requires adding `weight` property to `Equipment` class

### 7. Negative Gold

**Issue:** Removing more gold than available

**Solution:** Validate before removing:
```typescript
removeGold(amount: number): boolean {
  if (this.gold < amount) {
    console.warn(`Insufficient gold (have ${this.gold}, need ${amount})`);
    return false;
  }

  this.gold -= amount;
  return true;
}
```

**Caller Responsibility:** Check `hasGold()` before attempting purchase

## Testing Checklist

### Unit Tests: Core Operations

- [ ] Adding item increases quantity
- [ ] Adding item to existing stack increments quantity
- [ ] Adding multiple items at once works correctly
- [ ] Adding gold increases total gold
- [ ] Removing item decreases quantity
- [ ] Removing last item removes map entry
- [ ] Removing non-existent item returns false
- [ ] Removing quest item is blocked (returns false)
- [ ] Removing more items than available returns false
- [ ] Removing more gold than available returns false
- [ ] Query methods return correct counts
- [ ] Check methods (hasItem, hasGold) work correctly
- [ ] getTotalItemCount returns sum of all quantities
- [ ] getTotalUniqueItems returns number of unique equipment IDs

### Unit Tests: Serialization

- [ ] toJSON() produces valid JSON structure
- [ ] fromJSON() restores inventory state correctly
- [ ] Round-trip serialization preserves all data (items + quantities)
- [ ] Missing equipment IDs logged but don't crash
- [ ] Empty inventory serializes correctly
- [ ] Full inventory with multiple stacks serializes correctly
- [ ] Quantities are preserved through serialization
- [ ] Gold is preserved through serialization

### Integration Tests: Combat Victory

- [ ] Looted items added to inventory on exit
- [ ] Gold added to inventory on exit
- [ ] Unlooted items not added to inventory
- [ ] Multiple combats accumulate loot correctly
- [ ] Inventory state persists across combat transitions

### Integration Tests: Save/Load

- [ ] Inventory saves correctly in save data
- [ ] Inventory loads correctly from save data
- [ ] Old saves without inventory field handled gracefully
- [ ] Corrupted inventory data handled gracefully

### Edge Case Tests

- [ ] Adding duplicate equipment stacks correctly
- [ ] Removing equipped item is blocked (future enhancement)
- [ ] Removing item with insufficient quantity fails
- [ ] Removing quest item is always blocked
- [ ] Capacity limit prevents adding items (if enabled, future)
- [ ] Negative gold prevented
- [ ] Adding 0 quantity is no-op
- [ ] Removing 0 quantity is no-op
- [ ] Filtering by category returns correct equipment types
- [ ] Sorting by name works correctly
- [ ] Equipment with missing registry entries handled gracefully

## Performance Considerations

### Memory Usage

**Item Storage:**
- Map of equipmentId (string) → quantity (number)
- Memory: ~50 bytes per unique item type (estimate)
- Expected max: ~100 unique equipment types (5 KB)
- **Negligible** for modern systems

**Equipment Registry Lookups:**
- Equipment instances stored in global `Equipment.registry`
- Inventory only stores IDs (small strings)
- No duplicate Equipment instances in memory

**Total:** < 10 KB for full inventory (very efficient)

### Query Performance

**getItemsByCategory():**
- Iterate map entries: O(n) where n = unique item types
- Lookup Equipment from registry: O(1) per item
- Filter by category: O(n)
- Expected n: 50-100 unique items
- Performance: < 1ms (acceptable)

**sortItems():**
- Convert map to array: O(n)
- Sort operation: O(n log n)
- Expected n: 50-100 unique items
- Performance: < 1ms (very fast)

**hasItem():**
- Map lookup: O(1)
- Performance: < 0.01ms (instant)

**Optimization (not needed):**
- Map operations already optimal
- No caching required for this scale

### Serialization Performance

**toJSON():**
- Convert map to object: O(n) where n = unique items
- Expected time: < 0.1ms
- **Negligible** for save operation (infrequent)

**fromJSON():**
- Look up equipment by ID: O(n) where n = unique items
- Registry lookups are O(1)
- Expected time: < 1ms
- **Negligible** for load operation (infrequent)

**JSON Size:**
- ~50-100 unique items × ~30 bytes/entry = ~1.5-3 KB
- Very small compared to total save file

## Future Extensions

### 1. Item Comparison

**Feature:** Compare item stats with currently equipped

**UI:**
```
Flame Blade                    Steel Sword (equipped)
+15 Physical Power             +10 Physical Power
+5 Magic Power                 +0 Magic Power
────────────────────────────────────────────────
Difference: +5 Power, +5 Magic
```

**Implementation:**
```typescript
compareEquipment(newItem: Equipment, currentItem: Equipment): StatComparison {
  return {
    physicalPowerDiff: newItem.physicalPower - currentItem.physicalPower,
    magicPowerDiff: newItem.magicPower - currentItem.magicPower,
    // ... other stats
  };
}
```

### 2. Auto-Sort on Add

**Feature:** Automatically sort inventory when items added

**Configuration:**
```typescript
class PartyInventory {
  private static autoSortEnabled: boolean = false;
  private static autoSortMode: InventorySortMode = InventorySortMode.RECENTLY_ADDED;

  static enableAutoSort(mode: InventorySortMode): void {
    PartyInventory.autoSortEnabled = true;
    PartyInventory.autoSortMode = mode;
  }

  private addEquipmentInternal(equipment: Equipment): void {
    this.equipment.push(equipment);

    if (PartyInventory.autoSortEnabled) {
      this.sortEquipment(PartyInventory.autoSortMode);
    }
  }
}
```

### 3. Item Favoriting

**Feature:** Mark items as "favorites" to prevent accidental selling/dropping

**Implementation:**
```typescript
private favoriteItems: Set<string> = new Set(); // Equipment IDs

toggleFavorite(equipmentId: string): void {
  if (this.favoriteItems.has(equipmentId)) {
    this.favoriteItems.delete(equipmentId);
  } else {
    this.favoriteItems.add(equipmentId);
  }
}

isFavorite(equipmentId: string): boolean {
  return this.favoriteItems.has(equipmentId);
}
```

**UI:** Star icon next to favorited items

### 4. Batch Operations

**Feature:** Select multiple items for bulk actions (drop, sell)

**Implementation:**
```typescript
removeEquipmentBatch(equipmentIds: string[]): number {
  let removedCount = 0;

  for (const id of equipmentIds) {
    const equipment = this.equipment.find(eq => eq.id === id);
    if (equipment && this.removeEquipment(equipment)) {
      removedCount++;
    }
  }

  return removedCount;
}
```

### 5. Item Rarity Filtering

**Feature:** Filter by rarity (common, rare, epic, legendary)

**Implementation:**
```typescript
getEquipmentByRarity(rarity: EquipmentRarity): Equipment[] {
  return this.equipment.filter(eq => eq.rarity === rarity);
}
```

### 6. Search/Text Filter

**Feature:** Search items by name or description

**Implementation:**
```typescript
searchItems(query: string): Equipment[] {
  const lowerQuery = query.toLowerCase();
  return this.equipment.filter(eq =>
    eq.name.toLowerCase().includes(lowerQuery) ||
    eq.description.toLowerCase().includes(lowerQuery)
  );
}
```

### 7. Inventory Tabs

**Feature:** Separate tabs for different categories

**UI:**
```
[Equipment] [Consumables] [Quest Items] [Key Items]
```

**Implementation:** Use `filterItems()` with category parameter

### 8. Item Crafting

**Feature:** Combine items to create new items

**Implementation:**
```typescript
interface CraftingRecipe {
  inputs: Array<{ itemId: string, quantity: number }>;
  output: { itemId: string, quantity: number };
}

craftItem(recipe: CraftingRecipe): boolean {
  // Check if player has all ingredients
  for (const input of recipe.inputs) {
    if (!this.hasConsumable(input.itemId, input.quantity)) {
      return false;
    }
  }

  // Remove ingredients
  for (const input of recipe.inputs) {
    this.removeConsumable(input.itemId, input.quantity);
  }

  // Add output
  this.addConsumable(recipe.output.itemId, recipe.output.quantity);
  return true;
}
```

## Files to Create

### New Files

- `utils/PartyInventory.ts` - Core inventory class
- `utils/PartyInventory.test.ts` - Unit tests

### Future UI Files (Not in Scope)

- `components/inventory/InventoryPanel.tsx` - Main inventory UI
- `components/inventory/ItemList.tsx` - Item list component
- `components/inventory/ItemDetails.tsx` - Item details pane
- `components/inventory/CategoryTabs.tsx` - Category filter tabs
- `components/inventory/SortDropdown.tsx` - Sort mode selector

## Files to Modify

### Combat System

- `models/combat/VictoryPhaseHandler.ts` - Add inventory integration in `handleExitEncounter()`

### Save/Load System

- `utils/SaveManager.ts` (or equivalent) - Add inventory to save data
- `utils/LoadManager.ts` (or equivalent) - Load inventory from save data

### Type Exports

- `utils/index.ts` - Export `PartyInventory` class

## Constants to Add

Add to new file `InventoryConstants.ts`:

```typescript
export const InventoryConstants = {
  // Capacity (default: unlimited)
  DEFAULT_MAX_WEIGHT: Infinity,
  DEFAULT_CAPACITY_ENABLED: false,

  // Sorting
  DEFAULT_SORT_MODE: 'recently-added' as const,

  // Categories
  CATEGORIES: [
    'all',
    'weapons',
    'armor',
    'accessories',
    'consumables',
    'quest-items',
  ] as const,

  // UI (future)
  ITEMS_PER_PAGE: 20,
  ITEM_HEIGHT: 30, // pixels
};
```

## Estimated Complexity

- **Implementation Time**: 6-8 hours
  - Core data model: 2 hours
  - Add/remove operations: 2 hours
  - Query/filter methods: 1 hour
  - Serialization: 1 hour
  - Combat integration: 1 hour
  - Testing: 2-3 hours
- **Testing Time**: 2-3 hours
- **Total**: ~8-11 hours

**Complexity Rating**: Low-Medium

**Risk Level**: Low
- **Simple data structures** (arrays, maps)
- **Well-defined requirements** (no ambiguity)
- **Minimal dependencies** (only uses Equipment registry)
- **No UI implementation** (just data layer)

## Dependencies

- **Requires**: Equipment system (`Equipment` class, `Equipment.registry`)
- **Requires**: Equipment type definitions (`EquipmentType` enum)
- **Integrates With**: Combat victory screen (`VictoryPhaseHandler`)
- **Future Dependencies**: Save/load system, inventory UI, party management

## Compatibility

- **Save/Load**: New inventory field added to save data
  - Old saves: Initialize empty inventory
  - New saves: Full inventory serialization
- **Existing Features**: No breaking changes
- **Future Features**: Designed to support crafting, shops, trading

---

## Success Criteria

This feature is complete when:

1. ✅ `PartyInventory` class implemented with singleton pattern
2. ✅ Can add items (by equipment ID) with quantity stacking
3. ✅ Can remove items with quantity decrement (quest items blocked)
4. ✅ Can add/remove gold
5. ✅ Can query item counts and check existence
6. ✅ Can filter items by category (derived from `Equipment.type`)
7. ✅ Can sort items by various modes (name, type, recently added)
8. ✅ Serialization works (toJSON / fromJSON)
9. ✅ Combat victory screen adds looted items to inventory (stacked by ID)
10. ✅ Combat victory screen adds gold to inventory
11. ✅ All unit tests pass (stacking, quest items, serialization)
12. ✅ Integration tests with combat system pass
13. ✅ Save/load preserves inventory state (items map + gold)

---

## Notes

- This is a **data layer only** - no UI implementation
- Designed for **single-party system** (singleton pattern)
- **All items stack by equipment ID** for simplicity
- **Uses existing Equipment class** - no separate consumable/item type
- **Quest items protected** via `typeTags` check (tag: "quest-item")
- **Capacity system optional** (disabled by default, future enhancement)
- **Event system optional** (enables UI reactivity if needed)
- **Future-proof** for crafting, shops, trading, rarity systems
- **Lightweight storage** - only stores IDs + quantities, not Equipment instances
