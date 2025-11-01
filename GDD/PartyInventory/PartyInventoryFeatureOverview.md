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

### Equipment vs Consumables

**Equipment (Weapons, Armor, Accessories):**
- Each unique item is stored separately (even duplicates)
- Reason: Different equipment may have different enhancement levels, durability, etc. (future systems)
- Stored as: `Equipment` instances

**Consumables (Potions, Food, Throwables):**
- Stackable items with quantity tracking
- Reason: Consumables are functionally identical (1 health potion = any other health potion)
- Stored as: `{ itemId: string, quantity: number }`

**Quest Items:**
- Non-stackable unique items
- Cannot be discarded or sold
- Special UI treatment (separate category)

## Core Requirements

### 1. Data Model

#### PartyInventory Class

```typescript
/**
 * Global singleton managing the player party's shared inventory.
 * Stores equipment, consumables, and quest items.
 */
class PartyInventory {
  // Equipment storage (non-stackable)
  private equipment: Equipment[] = [];

  // Consumables storage (stackable)
  private consumables: Map<string, number> = new Map(); // itemId -> quantity

  // Quest items (non-stackable, non-discardable)
  private questItems: Equipment[] = [];

  // Gold (currency)
  private gold: number = 0;

  // Capacity limits (optional, for future)
  private maxWeight: number = Infinity;
  private currentWeight: number = 0;
}
```

#### Item Categories

```typescript
enum InventoryCategory {
  ALL = 'all',
  WEAPONS = 'weapons',
  ARMOR = 'armor',
  ACCESSORIES = 'accessories',
  CONSUMABLES = 'consumables',
  QUEST_ITEMS = 'quest-items',
}
```

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
addEquipment(equipment: Equipment): void
addConsumable(itemId: string, quantity: number): void
addQuestItem(questItem: Equipment): void
addGold(amount: number): void
```

**Behavior:**
- Equipment: Add to `equipment` array
- Consumables: Increment quantity in `consumables` map (or create entry)
- Quest Items: Add to `questItems` array
- Gold: Add to `gold` counter
- **Validation**: Check capacity limits before adding (if enabled)
- **Events**: Trigger "item added" event for UI updates

#### Removing Items

```typescript
removeEquipment(equipment: Equipment): boolean
removeConsumable(itemId: string, quantity: number): boolean
removeQuestItem(questItem: Equipment): boolean
removeGold(amount: number): boolean
```

**Behavior:**
- Equipment: Remove from `equipment` array (by reference or ID)
- Consumables: Decrement quantity (remove entry if quantity reaches 0)
- Quest Items: **BLOCKED** - cannot remove quest items
- Gold: Subtract from `gold` counter (fail if insufficient)
- **Return**: `true` if successful, `false` if item not found or insufficient quantity
- **Events**: Trigger "item removed" event for UI updates

#### Querying Items

```typescript
getEquipmentCount(): number
getConsumableCount(itemId: string): number
getQuestItemCount(): number
getTotalItemCount(): number
getGold(): number

hasEquipment(equipmentId: string): boolean
hasConsumable(itemId: string, quantity: number): boolean
hasQuestItem(questItemId: string): boolean
hasGold(amount: number): boolean

getEquipmentByCategory(category: EquipmentCategory): Equipment[]
getAllConsumables(): Array<{ itemId: string, quantity: number }>
getAllQuestItems(): Equipment[]

filterItems(category: InventoryCategory): InventoryItem[]
sortItems(items: InventoryItem[], mode: InventorySortMode): InventoryItem[]
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
  PartyInventory.addEquipment(equipment);
}

PartyInventory.addGold(this.rewards.gold);
// Experience is applied directly to party members (not stored in inventory)
```

**Flow:**
1. Player selects items in victory screen
2. Clicks "Exit Encounter"
3. Selected items added to `PartyInventory`
4. Gold added to `PartyInventory`
5. Combat view closes, returns to overworld
6. Inventory UI reflects new items (if open)

### 4. Serialization

#### JSON Format

```typescript
interface PartyInventoryJSON {
  // Equipment (array of equipment IDs)
  equipment: string[];

  // Consumables (map of itemId -> quantity)
  consumables: Record<string, number>;

  // Quest items (array of quest item IDs)
  questItems: string[];

  // Gold
  gold: number;

  // Optional: capacity settings
  maxWeight?: number;
  currentWeight?: number;
}
```

#### Serialization Methods

```typescript
class PartyInventory {
  toJSON(): PartyInventoryJSON {
    return {
      equipment: this.equipment.map(eq => eq.id),
      consumables: Object.fromEntries(this.consumables),
      questItems: this.questItems.map(item => item.id),
      gold: this.gold,
      maxWeight: this.maxWeight,
      currentWeight: this.currentWeight,
    };
  }

  static fromJSON(json: PartyInventoryJSON): void {
    // Clear existing inventory
    PartyInventory.clear();

    // Load equipment
    for (const equipmentId of json.equipment) {
      const equipment = Equipment.getById(equipmentId);
      if (equipment) {
        PartyInventory.addEquipment(equipment);
      } else {
        console.warn(`Failed to load equipment: ${equipmentId}`);
      }
    }

    // Load consumables
    for (const [itemId, quantity] of Object.entries(json.consumables)) {
      PartyInventory.addConsumable(itemId, quantity);
    }

    // Load quest items
    for (const questItemId of json.questItems) {
      const questItem = Equipment.getById(questItemId);
      if (questItem) {
        PartyInventory.addQuestItem(questItem);
      } else {
        console.warn(`Failed to load quest item: ${questItemId}`);
      }
    }

    // Load gold
    PartyInventory.addGold(json.gold);

    // Load capacity (if present)
    if (json.maxWeight !== undefined) {
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
│ [All] [Weapons] [Armor] [Consumables]│
│                                      │
│ Sort: [Name ▼]                       │
├─────────────────────────────────────┤
│ ☐ Flame Blade          [Equip] [Drop]│
│ ☐ Iron Helmet          [Equip] [Drop]│
│ ☐ Health Potion (x5)   [Use]   [Drop]│
│ ☐ Leather Armor        [Equip] [Drop]│
│ ⚑ Ancient Key          (Quest Item)  │
│                                      │
│ ...                                  │
├─────────────────────────────────────┤
│ [Selected Item Details]              │
│ Flame Blade                          │
│ +15 Physical Power                   │
│ "A blade wreathed in flames"         │
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
  static addEquipment(equipment: Equipment): void {
    return PartyInventory.getInstance().addEquipmentInternal(equipment);
  }

  static getEquipmentCount(): number {
    return PartyInventory.getInstance().getEquipmentCountInternal();
  }

  // ... other static methods

  // Private implementation methods
  private equipment: Equipment[] = [];
  private consumables: Map<string, number> = new Map();
  private questItems: Equipment[] = [];
  private gold: number = 0;

  private addEquipmentInternal(equipment: Equipment): void {
    this.equipment.push(equipment);
  }

  private getEquipmentCountInternal(): number {
    return this.equipment.length;
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
  private static equipment: Equipment[] = [];
  private static consumables: Map<string, number> = new Map();
  private static questItems: Equipment[] = [];
  private static gold: number = 0;

  // Static methods operate directly on static fields
  static addEquipment(equipment: Equipment): void {
    PartyInventory.equipment.push(equipment);
  }

  static getEquipmentCount(): number {
    return PartyInventory.equipment.length;
  }

  // ... other methods
}
```

**Trade-offs:**
- **Simpler**: No getInstance() boilerplate
- **Testing**: Harder to reset state between tests (need explicit clear() calls)
- **Initialization**: State initialized immediately on module load
- **Recommendation**: Use singleton pattern for better testability

### Item Identity: Reference vs ID

**Equipment Identity Problem:**
When storing equipment, we need to decide: store instances or IDs?

**Option 1: Store Equipment Instances**
```typescript
private equipment: Equipment[] = [];

addEquipment(equipment: Equipment): void {
  this.equipment.push(equipment);
}
```

**Pros:**
- Direct access to item data
- No registry lookups needed
- Can store item-specific state (durability, enhancements)

**Cons:**
- Circular references (equipment → inventory → equipment)
- Harder to serialize
- Memory overhead for duplicate items

**Option 2: Store Equipment IDs**
```typescript
private equipment: string[] = [];

addEquipment(equipment: Equipment): void {
  this.equipment.push(equipment.id);
}

getEquipment(): Equipment[] {
  return this.equipment
    .map(id => Equipment.getById(id))
    .filter(eq => eq !== undefined) as Equipment[];
}
```

**Pros:**
- Simple serialization
- No circular references
- Small memory footprint

**Cons:**
- Registry lookups on every access
- Cannot store item-specific state (durability, enhancements)
- Duplicate items not distinguished

**Hybrid Approach (Recommended):**

For initial implementation, **store instances** for simplicity:
```typescript
private equipment: Equipment[] = [];
```

For serialization, **convert to IDs**:
```typescript
toJSON(): PartyInventoryJSON {
  return {
    equipment: this.equipment.map(eq => eq.id),
    // ...
  };
}
```

**Future Enhancement:**
If item-specific state is needed (durability, enhancements), create `InventoryItem` wrapper:

```typescript
interface InventoryItem {
  equipmentId: string;
  durability?: number;
  enhancement?: number;
  customName?: string;
}

private equipment: InventoryItem[] = [];
```

### Consumable Stacking

Consumables use a `Map<string, number>` for efficient stacking:

```typescript
private consumables: Map<string, number> = new Map();

addConsumable(itemId: string, quantity: number): void {
  const current = this.consumables.get(itemId) || 0;
  this.consumables.set(itemId, current + quantity);
}

removeConsumable(itemId: string, quantity: number): boolean {
  const current = this.consumables.get(itemId) || 0;

  if (current < quantity) {
    return false; // Insufficient quantity
  }

  const remaining = current - quantity;
  if (remaining === 0) {
    this.consumables.delete(itemId); // Remove entry if depleted
  } else {
    this.consumables.set(itemId, remaining);
  }

  return true;
}

getConsumableCount(itemId: string): number {
  return this.consumables.get(itemId) || 0;
}
```

**Benefits:**
- O(1) lookup, add, remove
- Automatic quantity tracking
- Clean deletion when quantity reaches 0

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
  const availableWeapons = PartyInventory.getEquipmentByCategory('weapon');

  const handleEquipWeapon = (weapon: Equipment) => {
    // Remove weapon from inventory
    PartyInventory.removeEquipment(weapon);

    // Equip to unit
    const previousWeapon = unit.leftHand;
    unit.equipLeftHand(weapon);

    // Add previous weapon back to inventory
    if (previousWeapon) {
      PartyInventory.addEquipment(previousWeapon);
    }
  };

  return (
    <div>
      <h3>Available Weapons</h3>
      {availableWeapons.map(weapon => (
        <button key={weapon.id} onClick={() => handleEquipWeapon(weapon)}>
          Equip {weapon.name}
        </button>
      ))}
    </div>
  );
}
```

### 4. Shop System (Future)

**File:** `components/shop/ShopPanel.tsx` (future)

**Example:**
```typescript
function ShopPanel({ shopInventory }: { shopInventory: Equipment[] }) {
  const playerGold = PartyInventory.getGold();

  const handlePurchase = (item: Equipment, price: number) => {
    if (!PartyInventory.hasGold(price)) {
      alert('Not enough gold!');
      return;
    }

    PartyInventory.removeGold(price);
    PartyInventory.addEquipment(item);
  };

  return (
    <div>
      <h3>Shop (Gold: {playerGold})</h3>
      {shopInventory.map(item => (
        <button key={item.id} onClick={() => handlePurchase(item, item.value)}>
          Buy {item.name} ({item.value}g)
        </button>
      ))}
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
  for (const equipmentId of json.equipment) {
    const equipment = Equipment.getById(equipmentId);
    if (equipment) {
      PartyInventory.addEquipment(equipment);
    } else {
      console.warn(`[PartyInventory] Failed to load equipment: ${equipmentId} (not in registry)`);
      // Option: Add to "missing items" list for user notification
    }
  }
}
```

**User Impact:** Lost items from save data (graceful degradation)

### 2. Duplicate Equipment Instances

**Issue:** Adding the same Equipment instance multiple times

**Current Behavior:** Allowed (equipment array stores instances)

**Reasoning:**
- Two "Flame Blade" items should be distinct (may have different durability/enhancements in future)
- Inventory shows "Flame Blade (x2)" in UI
- Serialization saves both as separate entries

**Alternative:** If strict uniqueness needed, check before adding:
```typescript
addEquipment(equipment: Equipment): void {
  if (this.equipment.includes(equipment)) {
    console.warn('Equipment already in inventory:', equipment.id);
    return;
  }
  this.equipment.push(equipment);
}
```

### 3. Removing Equipped Items

**Issue:** Player tries to remove item that is currently equipped on a unit

**Solution:** Check if equipped before removing:
```typescript
removeEquipment(equipment: Equipment): boolean {
  // Check if any party member has this equipped
  for (const member of PartyMemberRegistry.getAll()) {
    const unit = PartyMemberRegistry.createPartyMember(member.id) as HumanoidUnit;
    if (unit.isEquipped(equipment)) {
      console.warn('Cannot remove equipped item:', equipment.id);
      return false;
    }
  }

  // Safe to remove
  const index = this.equipment.indexOf(equipment);
  if (index >= 0) {
    this.equipment.splice(index, 1);
    return true;
  }

  return false;
}
```

**Note:** This requires `isEquipped()` method on `HumanoidUnit`

### 4. Quest Items

**Issue:** Quest items should not be removable

**Solution:** Separate storage + blocking remove:
```typescript
removeQuestItem(questItem: Equipment): boolean {
  console.warn('Cannot remove quest items:', questItem.id);
  return false;
}
```

**UI:** Quest items shown with special icon, no "Drop" button

### 5. Consumable Over-removal

**Issue:** Trying to remove more consumables than available

**Solution:** Check quantity before removing:
```typescript
removeConsumable(itemId: string, quantity: number): boolean {
  const current = this.consumables.get(itemId) || 0;

  if (current < quantity) {
    console.warn(`Insufficient consumables: ${itemId} (have ${current}, need ${quantity})`);
    return false;
  }

  const remaining = current - quantity;
  if (remaining === 0) {
    this.consumables.delete(itemId);
  } else {
    this.consumables.set(itemId, remaining);
  }

  return true;
}
```

**Return Value:** `false` indicates failure, caller should handle error

### 6. Inventory Full (If Capacity Enabled)

**Issue:** Cannot add item due to weight limit

**Solution:** Check capacity before adding:
```typescript
addEquipment(equipment: Equipment): boolean {
  if (!this.canAddItem(equipment.weight)) {
    console.warn('Inventory full, cannot add:', equipment.id);
    return false;
  }

  this.equipment.push(equipment);
  this.currentWeight += equipment.weight;
  return true;
}
```

**UI:** Show error message "Inventory full!" and prevent looting

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

- [ ] Adding equipment increases count
- [ ] Adding consumable increases quantity
- [ ] Adding consumable to existing stack increments quantity
- [ ] Adding quest item increases quest item count
- [ ] Adding gold increases total gold
- [ ] Removing equipment decreases count
- [ ] Removing consumable decreases quantity
- [ ] Removing last consumable removes map entry
- [ ] Removing non-existent item returns false
- [ ] Removing quest item is blocked (returns false)
- [ ] Removing more gold than available returns false
- [ ] Query methods return correct counts
- [ ] Check methods (has*) work correctly

### Unit Tests: Serialization

- [ ] toJSON() produces valid JSON structure
- [ ] fromJSON() restores inventory state correctly
- [ ] Round-trip serialization preserves all data
- [ ] Missing equipment IDs logged but don't crash
- [ ] Missing consumable IDs handled gracefully
- [ ] Empty inventory serializes correctly
- [ ] Full inventory serializes correctly

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

- [ ] Adding duplicate equipment creates separate entries
- [ ] Removing equipped item is blocked (future)
- [ ] Removing consumable with insufficient quantity fails
- [ ] Removing quest item is always blocked
- [ ] Capacity limit prevents adding items (if enabled)
- [ ] Negative gold prevented

## Performance Considerations

### Memory Usage

**Equipment Storage:**
- Array of Equipment instances
- Memory: ~100 bytes per item (estimate)
- Expected max: ~500 items (50 KB)
- **Negligible** for modern systems

**Consumables Storage:**
- Map of string → number
- Memory: ~50 bytes per entry (estimate)
- Expected max: ~50 consumable types (2.5 KB)
- **Negligible**

**Total:** < 100 KB for full inventory (acceptable)

### Query Performance

**getEquipmentByCategory():**
- Filter operation: O(n) where n = equipment count
- Expected n: 100-500
- Performance: < 1ms (acceptable)

**sortItems():**
- Sort operation: O(n log n)
- Expected n: 100-500
- Performance: < 5ms (acceptable)

**Optimization (if needed):**
- Cache filtered results
- Invalidate cache on add/remove
- Only re-filter on category/sort change

### Serialization Performance

**toJSON():**
- Convert equipment array to ID array: O(n)
- Convert consumables map to object: O(m)
- Expected time: < 1ms
- **Acceptable** for save operation (infrequent)

**fromJSON():**
- Look up equipment by ID: O(n * k) where k = registry lookup time
- Expected time: < 10ms (registry lookups are O(1))
- **Acceptable** for load operation (infrequent)

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

- **Requires**: Equipment system (`Equipment` class, registry)
- **Integrates With**: Combat victory screen
- **Future Dependencies**: Save/load system, inventory UI

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
2. ✅ Can add equipment, consumables, quest items, and gold
3. ✅ Can remove equipment, consumables, and gold (quest items blocked)
4. ✅ Can query item counts and check existence
5. ✅ Can filter items by category
6. ✅ Can sort items by various modes
7. ✅ Serialization works (toJSON / fromJSON)
8. ✅ Combat victory screen adds looted items to inventory
9. ✅ Combat victory screen adds gold to inventory
10. ✅ All unit tests pass
11. ✅ Integration tests with combat system pass
12. ✅ Save/load preserves inventory state

---

## Notes

- This is a **data layer only** - no UI implementation
- Designed for **single-party system** (singleton pattern)
- **Consumables stack** for convenience
- **Equipment stored as instances** for future enhancements (durability, etc.)
- **Quest items protected** from removal
- **Capacity system optional** (disabled by default)
- **Event system optional** (enables UI reactivity if needed)
- **Future-proof** for crafting, shops, trading, rarity systems
