# Party Management System Hierarchy

**Version:** 1.0
**Last Updated:** Sat, Jan 11, 2025 <!-- Update using `date` command -->
**Related:** [GeneralGuidelines.md](GeneralGuidelines.md), [CombatHierarchy.md](CombatHierarchy.md), [CODE_REVIEW_party-management-view.md](CODE_REVIEW_party-management-view.md)

## Purpose

This document provides a token-efficient reference for AI agents to quickly understand the party management system architecture. Organized by both directory structure and functionality.

## How AI Agents Should Use This Document

**⚠️ IMPORTANT: Do NOT read this entire file upfront.**

This document is designed as a **reference**, not a preamble. Reading it completely wastes tokens.

### Recommended Usage Pattern:

#### 1. **Start with Quick Reference** (below)
Read ONLY the Quick Reference section first. It maps common tasks to relevant files.

#### 2. **Read Targeted Sections**
Use the Navigation Index to find the specific section you need. Examples:
- Adding inventory UI → Read `### 2. Inventory System` only
- Panel content work → Read `### 3. Panel Content` only
- XP/abilities → Read `### 4. XP & Ability System` only

#### 3. **Use Search (Ctrl+F)**
Search for specific file names (e.g., "PartyInventory") or keywords (e.g., "equipment", "abilities")

#### 4. **Read Data Flow ONLY if confused**
If unclear how pieces connect, read `## Data Flow Summary` section

### Token Budget Guidance:
- **Quick lookup**: Read Quick Reference only (~200 tokens)
- **Single file work**: Quick Reference + 1 section (~1,500 tokens)
- **Feature work**: Quick Reference + 2-3 sections (~3,000 tokens)
- **Only as last resort**: Read entire file (~8,000 tokens)

### For Human Users:
When providing this file to an AI agent, you can say:
> "Use PartyManagementHierarchy.md as a reference. Start with the Quick Reference section, then read only the sections relevant to [your task]. Do NOT read the entire file."

---

## Navigation Index

### By Task Type:
- **Inventory management** → `### 2. Inventory System`
- **Equipment** → `#### EquipmentComparisonContent.ts`, `#### EquipmentSlotUtil.ts`
- **Abilities** → `#### SetAbilitiesMainPanelContent.ts`, `### 4. XP & Ability System`
- **XP spending** → `#### SpendXpMainPanelContent.ts`, `### 4. XP & Ability System`
- **Class management** → `#### ClassInfoContent.ts`, HumanoidUnit extensions
- **Panel content** → `### 3. Panel Content`
- **Party member selection** → `#### PartyManagementUnitInfoContent.ts`
- **State persistence** → `#### InventoryViewState.ts`

### By Component Type:
- **View Components** → `### 1. View Components`
- **Inventory Core** → `### 2. Inventory System`
- **Panel Content** → `### 3. Panel Content`
- **XP & Abilities** → `### 4. XP & Ability System`
- **Utilities** → `### 5. Utilities`
- **Combat Extensions** → `### 6. Combat System Extensions`

---

## Quick Reference: Common Tasks

- **Add inventory functionality** → `PartyInventory` singleton (static API)
- **Modify inventory UI** → `InventoryRenderer` (rendering), `PartyManagementView` (orchestration)
- **Add panel content** → Implement `PanelContent` interface
- **Change equipment logic** → `EquipmentSlotUtil`, `EquipmentResult`, `HumanoidUnit` extensions
- **Modify ability system** → `SetAbilitiesMainPanelContent`, `HumanoidUnit.learnedAbilities`
- **Change XP/class system** → `SpendXpMainPanelContent`, `ClassInfoContent`, `HumanoidUnit` XP methods
- **Add filtering/sorting** → `InventoryViewState`, `PartyInventory.filterItems()` / `sortItems()`
- **Modify party member UI** → `PartyManagementUnitInfoContent`
- **Change state persistence** → `InventoryViewState` serialization
- **Add equipment comparison** → `EquipmentComparisonContent`

---

## Directory Structure

```
react-app/src/
├── components/inventory/
│   ├── PartyManagementView.tsx          # Main party management view
│   ├── InventoryViewRoute.tsx           # Routing wrapper
│   └── index.ts                         # Export barrel
│
├── models/inventory/
│   ├── InventoryRenderer.ts             # Stateless rendering for inventory UI
│   ├── InventoryViewState.ts            # Type-safe state management
│   └── panels/                          # Panel content implementations
│       ├── ClassInfoContent.ts
│       ├── EmptySlotInfoContent.ts
│       ├── EquipmentComparisonContent.ts
│       ├── InventoryStatsContent.ts
│       ├── InventoryTopPanelContent.ts
│       ├── PartyManagementUnitInfoContent.ts
│       ├── SetAbilitiesMainPanelContent.ts
│       ├── SetAbilitiesTitlePanelContent.ts
│       ├── SpendXpMainPanelContent.ts
│       └── SpendXpTitlePanelContent.ts
│
├── models/combat/
│   └── HumanoidUnit.ts                  # Extended for XP/class management
│
└── utils/
    ├── inventory/
    │   ├── PartyInventory.ts            # Singleton inventory management
    │   └── PartyInventory.test.ts       # Comprehensive test suite (728 lines)
    ├── EquipmentResult.ts               # Equipment operation results
    ├── EquipmentSlotUtil.ts             # Slot compatibility utilities
    └── PartyMemberRegistry.ts           # Extended for class/ability updates
```

---

## File Hierarchy by Category

### 1. View Components

#### `components/inventory/PartyManagementView.tsx`
**Purpose:** Main orchestration component for party management (inventory, abilities, XP)
**Exports:** `PartyManagementView`
**Key Methods:** renderFrame(), event handlers (handleMouseMove, handleClick)
**Panel Modes:**
- 'inventory' - Browse, filter, sort, and equip items
- 'spend-xp' - Select classes and learn abilities with XP
- 'set-abilities' - Set reaction/passive/movement abilities
**State Management:**
- Uses refs for cached panel content (prevents recreation)
- localStorage persistence for view state
- Refs for panel mode state (spendXpSelectedClassIdRef, setAbilitiesSlotTypeRef)
**Layout:**
- 5-panel layout (title, main, log, top info, bottom info)
- Reuses CombatLayoutManager for panel regions
- Custom panel regions (8px adjustments for inventory-specific sizing)
**Rendering:**
- Double buffering for canvas rendering
- Mode-specific rendering (inventory/spend-xp/set-abilities)
- Debug panel visualization support
**Event Handling:**
- Mouse move for hover states
- Click for selection and actions
- Coordinate transformation (canvas → panel-relative)
**Dependencies:** PartyInventory, InventoryRenderer, InventoryViewState, all panel content classes, CombatLayoutManager, CombatLogManager, InfoPanelManager
**Used By:** InventoryViewRoute
**Notes:** Large file (1,700+ lines) - consider extracting event handlers and mode-specific rendering

#### `components/inventory/InventoryViewRoute.tsx`
**Purpose:** Routing wrapper for party management view
**Exports:** `InventoryViewRoute`
**Key Methods:** render()
**Dependencies:** PartyManagementView
**Used By:** App routing

---

### 2. Inventory System

#### `models/inventory/InventoryRenderer.ts`
**Purpose:** Stateless renderer for inventory UI (category tabs, item list, pagination)
**Exports:** `InventoryRenderer`, `InventoryItemWithQuantity`, `Bounds`
**Key Methods:**
- `render()` - Main rendering (item list, pagination)
- `calculateItemsPerPage()` - Calculate visible items based on panel height
- `getItemRowBounds()` - Get bounds for hit testing
- `getPaginationButtonBounds()` - Get pagination button bounds
**Rendering Features:**
- Item list with quantity display (e.g., "Potion x3")
- Context-aware empty messages by category
- Pagination controls (< Prev, Next >)
- Color coding: Disabled (#666666), Class-restricted (#ff8800), Quest items (orange), Hover (yellow)
**Layout:**
- Items rendered in main panel (no tabs/sort - moved to top panel)
- Pagination at bottom (only if totalPages > 1)
- Padding and spacing from CombatConstants.INVENTORY_VIEW
**Dependencies:** FontAtlasRenderer, CombatConstants, Equipment
**Used By:** PartyManagementView
**Notes:** Pure rendering class - no state management

#### `models/inventory/InventoryViewState.ts`
**Purpose:** Type-safe state management for inventory view
**Exports:** `InventoryViewState`, `InventoryCategory`, `InventorySortMode`, serialization functions
**State Fields:**
- `category` - Current filter (all, weapons, shields, armor, accessories, held, quest-items)
- `sortMode` - Current sort (name-asc, name-desc, type, recently-added)
- `currentPage` - Pagination (0-indexed)
- `selectedItemId` - Selected item equipment ID
- `hoveredItemId` - Hovered item equipment ID
- `hoveredCategory` - Hovered category tab
- `hoveredSort` - Hovered sort dropdown
- `hoveredPagination` - Hovered pagination button ('prev' | 'next')
**Serialization:**
- Excludes transient hover states
- Runtime validation on load (isValidCategory, isValidSortMode)
- Graceful fallback to defaults on error
- localStorage integration
**Key Functions:**
- `createDefaultInventoryViewState()` - Factory for default state
- `serializeInventoryViewState()` - Convert to JSON
- `deserializeInventoryViewState()` - Restore from JSON (resets to defaults)
- `loadInventoryViewStateFromLocalStorage()` - Load with validation
- `saveInventoryViewStateToLocalStorage()` - Save to localStorage
**Dependencies:** None (pure state management)
**Used By:** PartyManagementView
**Notes:** Filter, sort, and selection intentionally reset to defaults on load

#### `utils/inventory/PartyInventory.ts`
**Purpose:** Global singleton managing party's shared inventory
**Exports:** `PartyInventory` (class with static API), `PartyInventoryJSON`, `InventoryItem`
**Singleton Pattern:**
- Private constructor prevents instantiation
- Static API for all operations
- Single global inventory instance
**Key Methods (Static API):**
- **Add:** `addItem()`, `addGold()`
- **Remove:** `removeItem()`, `removeGold()`
- **Query:** `getItemCount()`, `getTotalItemCount()`, `getTotalUniqueItems()`, `getGold()`, `hasItem()`, `hasGold()`, `getAllItems()`
- **Filter/Sort:** `getItemsByCategory()`, `filterItems()`, `sortItems()`
- **Details:** `getItemDetails()`
- **Serialization:** `toJSON()`, `fromJSON()`, `clear()`
**Business Rules:**
- Quest items cannot be removed (typeTags includes 'quest-item')
- Equipment validated via Equipment.getById()
- Quantity must be sufficient for removal
- Gold must be sufficient for removal
**Filtering:**
- All 7 categories: all, weapons, shields, armor, accessories, held, quest-items
- Equipment.type matching (OneHandedWeapon, TwoHandedWeapon, Shield, Head, Body, Accessory, Held)
- Quest items detected via typeTags
**Sorting:**
- name-asc / name-desc - Alphabetical by name
- type - Group by Equipment.type, then alphabetically
- recently-added - Most recent first (insertion order tracking)
**Insertion Order Tracking:**
- insertionOrder Map tracks timestamp for each equipmentId
- nextTimestamp auto-increments on each addItem
- Used for recently-added sorting
**Dependencies:** Equipment
**Used By:** PartyManagementView, potentially other inventory-related views
**Notes:** Fully tested (728 lines of tests), 100% coverage of static API

#### `utils/inventory/PartyInventory.test.ts`
**Purpose:** Comprehensive test suite for PartyInventory
**Test Coverage:**
- Adding items (valid, invalid, quantity increments, gold)
- Removing items (valid, insufficient, quest item protection, gold)
- Querying (counts, hasItem, hasGold)
- Filtering (all 7 categories, edge cases)
- Sorting (all 4 modes)
- Serialization (toJSON, fromJSON, invalid items on load)
**Key Test Cases:**
- Quest items cannot be removed
- Invalid equipment IDs rejected
- Quantity validation
- Category filtering accuracy
- Sort mode correctness
- Graceful handling of missing equipment on deserialization
**Notes:** 728 lines, 40+ test cases, ensures business rules enforced

---

### 3. Panel Content

#### `models/inventory/panels/InventoryTopPanelContent.ts`
**Purpose:** Top panel for inventory stats, category tabs, and sort dropdown
**Exports:** `InventoryTopPanelContent`, `InventoryStats`
**Key Methods:** render(), handleClick(), handleHover()
**Display Elements:**
- Inventory stats (Total: X | Unique: Y | Gold: Z)
- Category tabs (All, Wpn, Shd, Arm, Acc, Held, Quest)
- Sort dropdown (Name ↑, Name ↓, Type, Recent)
**Color Coding:**
- Normal: White (#ffffff)
- Hovered: Yellow (#ffff00)
- Active category: Orange (#ff8c00)
**Layout:**
- Stats centered at top
- Category tabs below stats
- Sort dropdown below tabs
- 1px padding, 8px line spacing
**Dependencies:** FontAtlasRenderer, CombatConstants
**Used By:** PartyManagementView (title panel in inventory mode)

#### `models/inventory/panels/PartyManagementUnitInfoContent.ts`
**Purpose:** Extended UnitInfoContent for party management with party member selection
**Exports:** `PartyManagementUnitInfoContent`
**Extends:** `UnitInfoContent` (from combat system)
**Key Methods:** render(), handleHover(), handleClick(), updatePartyMembers(), setSelectedEquipmentSlot()
**Extensions:**
- Party member selector (sprite grid below buttons)
- "Learn Abilities" button (in stats view)
- Class XP display (replaces Action Timer)
- Green highlight for selected equipment/ability slots
**Party Selector:**
- Shows all party member sprites (12×12px each)
- Yellow border for selected member
- Hover shows member name
- Click switches party member
- Only visible in stats view when no helper text shown
**Custom Rendering:**
- Overrides renderHeader() to show Class XP instead of Action Timer
- Overrides renderToggleButton() to add "Learn Abilities" option
- Overrides renderAbilitySlot() and renderEquipmentSlot() for green highlighting
**Selected Slot Highlighting:**
- Slots turn green (#00ff00) when selected
- Used for equipment comparison and ability setting
- Priority: Selected (green) > Hovered (yellow) > Normal (white)
**Stat Helper Text:**
- Adds "Class XP" helper text
- Adds "Learn Abilities" helper text
- Updates "Set Abilities & Equipment" helper text
**Dependencies:** UnitInfoContent, CombatUnit, FontAtlasRenderer, SpriteRenderer, FontRegistry, colors.ts
**Used By:** PartyManagementView (top info panel)
**Notes:** Uses `as any` to access/override private parent methods - acceptable pattern for extending base class

#### `models/inventory/panels/EquipmentComparisonContent.ts`
**Purpose:** Side-by-side equipment comparison panel
**Exports:** `EquipmentComparisonContent`
**Key Methods:** render(), handleClick(), handleHover()
**Display Modes:**
- **Comparison Mode:** Shows "Current vs Hovered" with stat differences
- **Selection Mode:** Shows "Current vs ??" with Remove/Cancel options
**Comparison Features:**
- Title: "{Current} vs {Comparison}" (yellow)
- Stat differences highlighted (green for positive, red for negative)
- Two-column layout for stats
- Full-width stats if labels too long
- [Wpn] and [Held] indicators for weapons/held items
**Selection Mode:**
- "Remove Item" option (if current item exists)
- "Cancel" option (always visible)
- Helper text based on hover state
- Text wrapping for long helper messages
**Color Coding:**
- Title: Yellow (#ffff00)
- Hover: Yellow (#ffff00)
- Normal: White (#ffffff)
- Helper: Grey (#888888)
- Positive stat: Green
- Negative stat: Red
**Dependencies:** Equipment, FontAtlasRenderer, FontRegistry, PanelContent
**Used By:** PartyManagementView (bottom panel when equipment slot selected)
**Notes:** 625 lines - comprehensive comparison logic with stat diffing

#### `models/inventory/panels/EmptySlotInfoContent.ts`
**Purpose:** Display info for empty equipment/ability slots
**Exports:** `EmptySlotInfoContent`
**Key Methods:** render()
**Display:**
- Slot label (e.g., "L.Hand", "Reaction")
- Slot type description
- Helper text: "Select an item to equip" or "Select an ability to set"
**Slot Descriptions:**
- L.Hand: "Left hand equipment slot"
- R.Hand: "Right hand equipment slot"
- Head: "Head armor slot"
- Body: "Body armor slot"
- Accessory: "Accessory slot"
- Reaction: "Reaction ability slot"
- Passive: "Passive ability slot"
- Movement: "Movement ability slot"
**Dependencies:** FontAtlasRenderer, PanelContent
**Used By:** PartyManagementView (bottom panel for empty slots)

#### `models/inventory/panels/SetAbilitiesMainPanelContent.ts`
**Purpose:** Ability selection panel for specific slot type
**Exports:** `SetAbilitiesMainPanelContent`
**Key Methods:** render(), handleClick(), handleHover(), getAbilityByIndex()
**Display:**
- Filtered abilities by slot type (Reaction, Passive, Movement)
- Color-coded: Equipped (green), Hovered (yellow), Normal (white)
- Empty state: "You do not have any {slotType} abilities"
**Construction:**
- Takes unit and slotType ('Reaction' | 'Passive' | 'Movement')
- Filters unit.learnedAbilities by abilityType
- Stores currently equipped ability for highlighting
**Click Handling:**
- Returns `{ type: 'ability-clicked', abilityId, slotType }`
**Hover Handling:**
- Returns `{ type: 'ability-hovered', index }` or `{ type: 'hover-cleared' }`
**Dependencies:** CombatUnit, CombatAbility, FontAtlasRenderer, PanelContent
**Used By:** PartyManagementView (main panel in set-abilities mode)

#### `models/inventory/panels/SetAbilitiesTitlePanelContent.ts`
**Purpose:** Title panel for set abilities mode
**Exports:** `SetAbilitiesTitlePanelContent`
**Key Methods:** render()
**Display:** "Set Abilities" in dragonslant title font (centered)
**Dependencies:** FontAtlasRenderer, CombatConstants
**Used By:** PartyManagementView (title panel in set-abilities mode)

#### `models/inventory/panels/SpendXpMainPanelContent.ts`
**Purpose:** XP spending interface for learning abilities
**Exports:** `SpendXpMainPanelContent`
**Key Methods:** render(), handleClick(), handleHover(), setSelectedClass(), getSelectedClassId()
**Display:**
- Primary class (always shown, orange if selected)
- Secondary class (if exists, orange if selected)
- Available abilities for selected class
- Ability states: Learned (green), Can Learn (white), Can't Afford (dark grey), Disabled (grey)
**Class Selection:**
- Click class to select (turns orange)
- Selected class persists across panel recreations
- Default: Primary class selected
**Ability Display:**
- Shows all abilities for selected class
- Color indicates state:
  - Green (#00ff00): Already learned
  - White (#ffffff): Can afford to learn
  - Dark grey (#666666): Can't afford (show cost in red)
  - Grey (#808080): Disabled (show "MAX" tag)
**Ability Click:**
- Returns `{ type: 'ability-clicked', abilityId, canLearn: boolean }`
- canLearn = true if: Not learned AND can afford AND not disabled
**Hover Handling:**
- Class hover: Shows class description in bottom panel
- Ability hover: Shows ability details in bottom panel
**Dependencies:** CombatUnit, CombatAbility, UnitClass, FontAtlasRenderer, PanelContent
**Used By:** PartyManagementView (main panel in spend-xp mode)
**Notes:** Complex state management for ability affordability and learned status

#### `models/inventory/panels/SpendXpTitlePanelContent.ts`
**Purpose:** Title panel for spend XP mode
**Exports:** `SpendXpTitlePanelContent`
**Key Methods:** render()
**Display:** "Spend XP" in dragonslant title font (centered)
**Dependencies:** FontAtlasRenderer, CombatConstants
**Used By:** PartyManagementView (title panel in spend-xp mode)

#### `models/inventory/panels/ClassInfoContent.ts`
**Purpose:** Class information panel with set primary/secondary class buttons
**Exports:** `ClassInfoContent`
**Key Methods:** render(), handleClick(), handleHover()
**Display:**
- Class name (centered, orange)
- Class description (wrapped)
- "Set Primary Class" button
- "Set Secondary Class" button (if unit can have secondary)
**Button Behavior:**
- Hover: Yellow (#ffff00)
- Click: Returns `{ type: 'set-primary-class' }` or `{ type: 'set-secondary-class' }`
**Layout:**
- Name at top
- Description below (wrapped to fit)
- Buttons at bottom (2px spacing between)
**Dependencies:** UnitClass, CombatUnit, FontAtlasRenderer, FontRegistry, PanelContent
**Used By:** PartyManagementView (bottom panel in spend-xp mode)

#### `models/inventory/panels/InventoryStatsContent.ts`
**Purpose:** Display inventory statistics (unused - functionality moved to InventoryTopPanelContent)
**Status:** Not currently used in PartyManagementView
**Note:** May be removed in future cleanup

---

### 4. XP & Ability System

#### Extended Methods in `models/combat/HumanoidUnit.ts`

**XP Management:**
- `addExperience(xp: number, unitClass: UnitClass)` - Add XP to specific class
- `getUnspentClassExperience(unitClass: UnitClass)` - Calculate available XP (earned - spent)
- `learnAbility(ability: CombatAbility, unitClass: UnitClass)` - Learn ability with XP cost
- `canLearnAbility(ability: CombatAbility, unitClass: UnitClass)` - Check if can afford and not already learned

**Class Management:**
- `setPrimaryClass(unitClass: UnitClass)` - Set primary class
- `setSecondaryClass(unitClass: UnitClass)` - Set secondary class (nullable)

**Ability Management:**
- `learnedAbilities: Set<CombatAbility>` - Set of all learned abilities across all classes
- `setReactionAbility(ability: CombatAbility | null)` - Equip reaction ability
- `setPassiveAbility(ability: CombatAbility | null)` - Equip passive ability
- `setMovementAbility(ability: CombatAbility | null)` - Equip movement ability

**XP Tracking:**
- Internal map: `classExperience: Map<string, { earned: number, spent: number }>`
- Tracks earned and spent XP separately per class ID
- Unspent XP = earned - spent

**Dependencies:** UnitClass, CombatAbility, Equipment
**Used By:** PartyManagementView, SpendXpMainPanelContent, SetAbilitiesMainPanelContent
**Notes:** Extensions added for party management - core combat unit logic unchanged

---

### 5. Utilities

#### `utils/EquipmentSlotUtil.ts`
**Purpose:** Slot compatibility utilities
**Exports:** `isEquipmentSlot()`, `isEquipmentCompatibleWithSlot()`
**Key Functions:**
- `isEquipmentSlot(slotLabel: string): boolean` - Check if label is equipment slot (L.Hand, R.Hand, Head, Body, Accessory)
- `isEquipmentCompatibleWithSlot(equipment: Equipment, slotLabel: string): boolean` - Check type compatibility
**Compatibility Rules:**
- L.Hand: OneHandedWeapon, Shield, Held
- R.Hand: OneHandedWeapon, TwoHandedWeapon, Shield, Held
- Head: Head
- Body: Body
- Accessory: Accessory
**Dependencies:** Equipment
**Used By:** PartyManagementView, EquipmentComparisonContent

#### `utils/EquipmentResult.ts`
**Purpose:** Result types for equipment operations
**Exports:** `EquipmentResult`, `EquipmentSuccess`, `EquipmentError`, helper functions
**Result Types:**
- Success: `{ success: true, message: string, unequippedItems: Equipment[] }`
- Error: `{ success: false, error: string }`
**Helper Functions:**
- `success(message: string, unequipped: Equipment[] = []): EquipmentSuccess`
- `error(errorMessage: string): EquipmentError`
**Use Cases:**
- Equipping items (return unequipped items for inventory)
- Validation errors (class restrictions, slot compatibility)
- Two-handed weapon logic (unequip both hands)
**Dependencies:** Equipment
**Used By:** Equipment operations in party management

#### Extended `utils/PartyMemberRegistry.ts`

**New Methods:**
- `updateFromUnit(partyMemberId: string, unit: CombatUnit)` - Update registry from unit instance
  - Saves equipment changes
  - Saves ability changes
  - Saves XP changes (earned, spent per class)
  - Saves class changes (primary, secondary)

**Update Logic:**
- Equipment: Stores IDs for all 5 slots (leftHand, rightHand, head, body, accessory)
- Abilities: Stores IDs for learned abilities and equipped abilities (reaction, passive, movement)
- XP: Stores Map<classId, { earned, spent }> serialized to object
- Classes: Stores primary class ID and optional secondary class ID

**Persistence:**
- Updates localStorage immediately
- Maintains referential integrity (validates IDs exist in registries)
- Graceful handling of missing equipment/abilities on load

**Dependencies:** CombatUnit, HumanoidUnit, Equipment, CombatAbility, UnitClass
**Used By:** PartyManagementView for persisting party member changes

---

### 6. Combat System Extensions

#### Modified Files (Not in inventory/ directory)

**`models/combat/HumanoidUnit.ts`:**
- See [Section 4: XP & Ability System](#4-xp--ability-system)

**`utils/PartyMemberRegistry.ts`:**
- See [Section 5: Utilities](#5-utilities)

**`models/combat/CombatConstants.ts`:**
- Added `INVENTORY_VIEW` constants section
- Colors for disabled items, class-restricted items, hover states
- Layout dimensions and spacing
- Font IDs and styling

**`models/combat/managers/panels/AbilityInfoContent.ts`:**
- Enhanced for inventory view usage (no changes to interface)

**`models/combat/managers/panels/EquipmentInfoContent.ts`:**
- Enhanced for inventory view usage (no changes to interface)

**`models/combat/VictoryPhaseHandler.ts`:**
- Handles XP rewards from victory
- Calls `PartyMemberRegistry.updateFromUnit()` to persist XP gains

---

## Data Flow Summary

### Inventory Management Flow

1. **PartyInventory (Singleton)**
   - Global inventory state
   - Static API for CRUD operations
   - Persistence via serialization

2. **PartyManagementView (Orchestrator)**
   - Loads state from localStorage
   - Renders inventory UI via InventoryRenderer
   - Handles events (hover, click)
   - Updates state and triggers re-render

3. **InventoryRenderer (Stateless)**
   - Pure rendering functions
   - No state management
   - Calculates layout and hit detection

4. **InventoryViewState (State)**
   - Type-safe state container
   - Serialization for localStorage
   - Runtime validation

### Equipment Management Flow

1. **Click Equipment Slot (in PartyManagementUnitInfoContent)**
   - Triggers equipment selection mode
   - Highlights slot in green

2. **PartyManagementView Updates Bottom Panel**
   - Shows EquipmentComparisonContent
   - Current equipment vs "??" (or vs hovered item)

3. **Hover Inventory Item**
   - If compatible with slot: Shows comparison
   - If incompatible: Disabled (dark grey) or class-restricted (orange)

4. **Click Compatible Item**
   - Equips item to slot
   - Unequips previous item (returns to inventory)
   - Updates PartyMemberRegistry
   - Persists to localStorage

### Ability Management Flow

1. **Click Ability Slot (in PartyManagementUnitInfoContent)**
   - Triggers set-abilities mode
   - Shows SetAbilitiesMainPanelContent with filtered abilities

2. **Hover Ability**
   - Shows AbilityInfoContent in bottom panel
   - Highlights ability in yellow

3. **Click Ability**
   - Equips ability to slot
   - Updates unit instance
   - Updates PartyMemberRegistry
   - Persists to localStorage
   - Returns to inventory mode

### XP Spending Flow

1. **Click "Learn Abilities" Button**
   - Triggers spend-xp mode
   - Shows SpendXpMainPanelContent

2. **Select Class**
   - Shows abilities for selected class
   - Color-codes by state (learned, affordable, can't afford)

3. **Hover Ability**
   - Shows AbilityInfoContent in bottom panel

4. **Click Learnable Ability**
   - Deducts XP from class
   - Adds to unit.learnedAbilities
   - Updates PartyMemberRegistry
   - Persists to localStorage
   - Refreshes ability list

### Class Management Flow

1. **Click Class (in SpendXpMainPanelContent)**
   - Shows ClassInfoContent in bottom panel

2. **Click "Set Primary Class" or "Set Secondary Class"**
   - Checks for swap condition:
     - Setting primary to current secondary → Swap
     - Setting secondary to current primary → Swap
   - Updates unit classes
   - Updates PartyMemberRegistry
   - Persists to localStorage
   - Refreshes panels

---

## Event Handling Architecture

### Coordinate Systems

1. **Canvas Coordinates** (0-384px width, 0-216px height)
   - Mouse events converted by InputHandler
   - Used for panel region checks

2. **Panel-Relative Coordinates**
   - Calculated: `relativeX = canvasX - region.x`
   - Used by all PanelContent implementations
   - Hit detection in panel-local space

### Event Flow

1. **Mouse Move (Canvas)**
   → PartyManagementView.handleMouseMove()
   → InputHandler.getCanvasCoordinates()
   → Check panel regions (title, main, top info, bottom info)
   → Transform to panel-relative coordinates
   → PanelContent.handleHover(relativeX, relativeY)
   → Update hover state
   → Re-render if changed

2. **Mouse Click (Canvas)**
   → PartyManagementView.handleClick()
   → Similar flow to mouse move
   → PanelContent.handleClick(relativeX, relativeY)
   → Execute action (equip, learn, select)
   → Update state
   → Re-render

### Hover State Management

- **Inventory Items:** hoveredItemId (equipment ID)
- **Category Tabs:** hoveredCategory (InventoryCategory)
- **Pagination:** hoveredPagination ('prev' | 'next')
- **Panel Content:** Internal hover state (ability index, button hover, etc.)

---

## Performance Patterns

### Singleton Pattern
- **PartyInventory** uses singleton pattern
- Static API prevents re-instantiation
- Single source of truth for inventory
- No prop drilling required

### Memoization
- `filteredAndSortedItems` memoized by category/sort/version
- `itemsPerPage` memoized by panel height
- `totalPages` memoized by item count
- Prevents expensive re-computations

### Double Buffering
- Off-screen buffer canvas for rendering
- Swap to display canvas when complete
- Prevents flickering and partial updates

### Cached Panel Content
- Panel content instances cached in refs
- Prevents recreation every frame
- Maintains hover state across renders
- Only recreated on mode change or party member change

### State Preservation
- Selected class ID preserved across panel recreations
- Selected ability slot preserved across mode changes
- Scroll position could be preserved (future enhancement)

---

## Testing Strategy

### Unit Tests
- **PartyInventory.test.ts** - 728 lines
  - All CRUD operations
  - Filtering by all categories
  - Sorting by all modes
  - Quest item protection
  - Serialization/deserialization
  - Error cases

### Integration Tests (Future)
- PartyManagementView event handling
- Panel mode transitions
- Equipment operations
- Ability learning
- Class management
- State persistence

### Manual Testing Checklist
See [CODE_REVIEW_party-management-view.md](CODE_REVIEW_party-management-view.md) Section 5.3

---

## Common Patterns

### Adding New Panel Content

1. **Implement PanelContent interface:**
```typescript
export class MyPanelContent implements PanelContent {
  render(ctx, region, fontId, fontAtlasImage): void { /* ... */ }
  handleClick?(relativeX, relativeY): any { /* ... */ }
  handleHover?(relativeX, relativeY): any { /* ... */ }
}
```

2. **Use panel-relative coordinates:**
```typescript
handleClick(relativeX: number, relativeY: number): any {
  // All coordinates relative to panel region origin
  if (relativeX >= buttonX && relativeX <= buttonX + buttonWidth) {
    // Handle click
  }
}
```

3. **Cache in parent component:**
```typescript
const myPanelContentRef = useRef<MyPanelContent | null>(null);

if (!myPanelContentRef.current) {
  myPanelContentRef.current = new MyPanelContent(...);
}
```

### Adding Inventory Functionality

1. **Use PartyInventory static API:**
```typescript
PartyInventory.addItem('iron-sword', 1);
const count = PartyInventory.getItemCount('iron-sword');
const items = PartyInventory.filterItems('weapons');
```

2. **Update InventoryViewState:**
```typescript
setViewState({ ...viewState, hoveredItemId: equipmentId });
```

3. **Trigger re-render:**
```typescript
setInventoryVersion(v => v + 1); // Force re-computation
```

### Persisting Party Member Changes

1. **Update unit instance:**
```typescript
humanoid.setPrimaryClass(newClass);
humanoid.learnAbility(ability, unitClass);
```

2. **Save to registry:**
```typescript
PartyMemberRegistry.updateFromUnit(partyMemberId, humanoid);
```

3. **Trigger UI update:**
```typescript
setPartyMemberVersion(v => v + 1);
```

---

## File Count Summary

**Total Files:** 17

**Breakdown:**
- **View Components:** 2 files (PartyManagementView, InventoryViewRoute)
- **Inventory Core:** 2 files (InventoryRenderer, InventoryViewState)
- **Panel Content:** 10 files (all panels/)
- **Utilities:** 3 files (PartyInventory + test, EquipmentResult, EquipmentSlotUtil)
- **Modified Combat Files:** ~6 files (HumanoidUnit, PartyMemberRegistry, CombatConstants, AbilityInfoContent, EquipmentInfoContent, VictoryPhaseHandler)

---

**Version:** 1.0
**Status:** ✅ Complete reference for party management system
**Next Update:** When new party management features are added
