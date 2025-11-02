# Party Management/Inventory View Hierarchy

**Version:** 1.0
**Last Updated:** Fri, Nov 01, 2025
**Related:** [GeneralGuidelines.md](GeneralGuidelines.md), [CombatHierarchy.md](CombatHierarchy.md)

## Purpose

This document provides a token-efficient reference for AI agents to quickly understand the Party Management/Inventory View system architecture. Organized by directory structure and functionality.

## How AI Agents Should Use This Document

**⚠️ IMPORTANT: Do NOT read this entire file upfront.**

This document is designed as a **reference**, not a preamble. Reading it completely wastes tokens.

### Recommended Usage Pattern:

#### 1. **Start with Quick Reference** (below)
Read ONLY the Quick Reference section first. It maps common tasks to relevant files.

#### 2. **Read Targeted Sections**
Use the Navigation Index to find the specific section you need. Examples:
- Inventory filtering → Read `Components & UI Rendering` only
- Equipment comparison → Read `Panels` only
- Party member XP system → Read `Models` only

#### 3. **Use Search (Ctrl+F)**
Search for specific file names (e.g., "EquipmentComparisonContent") or keywords (e.g., "equipment slot")

#### 4. **Read Data Flow ONLY if confused**
If unclear how pieces connect, read `System Architecture & Data Flow` section

#### 5. **For Feature Work**
Read multiple targeted sections, NOT the whole file

### What NOT to Do:
- ❌ Don't read all sections before starting work
- ❌ Don't include entire file in every conversation
- ❌ Don't read sections unrelated to current task
- ❌ Don't treat this as documentation to memorize - it's a quick reference map

### Token Budget Guidance:
- **Quick lookup**: Read Quick Reference only (~200 tokens)
- **Single file work**: Quick Reference + 1 section (~2,000 tokens)
- **Feature work**: Quick Reference + 2-3 sections (~4,000 tokens)
- **Architecture changes**: Quick Reference + Data Flow + sections (~6,000 tokens)
- **Only as last resort**: Read entire file (~15,000 tokens)

---

## Navigation Index

### By Task Type:
- **Add inventory category** → `InventoryViewState.ts`, `InventoryRenderer.ts`
- **Equipment comparison** → `EquipmentComparisonContent.ts`, `EquipmentSlotUtil.ts`
- **Inventory filtering/sorting** → `PartyManagementView.tsx`, `PartyInventory.ts`
- **Party member selection** → `PartyManagementUnitInfoContent.ts`
- **Spend XP/learn abilities** → `SpendXpMainPanelContent.ts`, `SpendXpTitlePanelContent.ts`
- **Inventory UI rendering** → `InventoryRenderer.ts`, `InventoryTopPanelContent.ts`
- **Item management** → `PartyInventory.ts`
- **Equipment validation** → `EquipmentSlotUtil.ts`
- **Top panel (party stats)** → `PartyManagementUnitInfoContent.ts`
- **Bottom panel (item details)** → `EquipmentComparisonContent.ts`, `EquipmentInfoContent.ts` (combat), `ClassInfoContent.ts`

### By Component Type:
- **Views** → `PartyManagementView.tsx` (main component)
- **State Management** → `InventoryViewState.ts`, `InventoryRenderer.ts`
- **Panel Content** → `panels/` directory
- **Utilities** → `PartyInventory.ts`, `EquipmentSlotUtil.ts`

---

## Quick Reference

| Task | Files | Key Details |
|------|-------|------------|
| View/manage inventory | PartyManagementView.tsx | Main component, handles rendering, mouse events, state |
| Filter by category | InventoryViewState.ts | 7 categories: all, weapons, shields, armor, accessories, held, quest-items |
| Sort items | InventoryViewState.ts | 4 modes: name-asc, name-desc, type, recently-added |
| Add/remove inventory | PartyInventory.ts | Singleton; static API for add/remove/query items and gold |
| Equipment slots | EquipmentSlotUtil.ts | 5 slots: L.Hand, R.Hand, Head, Body, Accessory |
| Party member UI | PartyManagementUnitInfoContent.ts | Extends UnitInfoContent; shows stats, abilities, equipment, XP, member selector |
| Equipment comparison | EquipmentComparisonContent.ts | Shows current vs hovered item side-by-side with stat diffs |
| Spend XP panel | SpendXpMainPanelContent.ts | Two-column layout: classes (left), abilities (right) |
| Top panel info | InventoryTopPanelContent.ts | Shows gold, item counts, category tabs, sort options |
| Render item grid | InventoryRenderer.ts | Calculates pagination, renders items with colors and quantities |

---

## Directory Structure

```
react-app/src/
├── components/inventory/
│   ├── InventoryViewRoute.tsx (route handler)
│   ├── PartyManagementView.tsx (main component - 1810 lines)
│   └── index.ts (exports)
├── models/inventory/
│   ├── InventoryViewState.ts (state types & persistence)
│   ├── InventoryRenderer.ts (UI rendering logic)
│   └── panels/
│       ├── PartyManagementUnitInfoContent.ts (top panel - party stats)
│       ├── InventoryTopPanelContent.ts (title panel - filters/sort)
│       ├── EquipmentComparisonContent.ts (bottom panel - comparison)
│       ├── EmptySlotInfoContent.ts (bottom panel - empty slots)
│       ├── InventoryStatsContent.ts (inventory statistics)
│       ├── ClassInfoContent.ts (class description & buttons)
│       ├── SpendXpMainPanelContent.ts (main panel - spend XP)
│       └── SpendXpTitlePanelContent.ts (title panel - spend XP mode)
└── utils/
    ├── inventory/
    │   └── PartyInventory.ts (inventory singleton)
    └── EquipmentSlotUtil.ts (equipment compatibility)
```

---

## System Architecture & Data Flow

### 5-Panel Layout (same as CombatView)

```
┌─────────────────────────────────────────┐
│ Title Panel  │   Top Info Panel (Party) │  (top third)
├─────────────────────────────────────────┤
│                                         │
│         Main Panel (Inventory Grid)     │  (middle third)
│                                         │
├─────────────────────────────────────────┤
│ Log Panel   │  Bottom Info Panel (Item) │  (bottom third)
└─────────────────────────────────────────┘
```

### Core Flow: User selects equipment slot → sees compatible items → clicks to equip

1. **PartyManagementView** renders all panels via `renderFrame()`
2. **handleMouseMove()** detects hover on equipment/ability slot in top panel → shows comparison
3. **handleMouseDown()** on inventory item → calls `equipLeftHand()`, `equipRightHand()`, etc.
4. **PartyInventory** updated → triggers re-render
5. **PartyMemberRegistry** persists changes

### State Management

**PartyManagementView.tsx** holds all UI state:
- `viewState`: category, sortMode, currentPage, hoveredItemId, hoveredCategory, hoveredSort, hoveredPagination
- `panelMode`: 'inventory' or 'spend-xp'
- `selectedPartyMemberIndex`: which party member displayed
- `selectedEquipmentRef`: currently selected equipment slot (for comparison mode)
- `spendXpMainContentRef`: Spend XP panel content (created when needed)

**InventoryViewState.ts** defines:
- `InventoryViewState` interface (all UI state)
- Category and sort mode types
- localStorage persistence (load/save functions)

### Panel Content Architecture

All panels inherit from or implement `PanelContent` interface:
- `render()`: Draw to canvas context
- `handleHover()`: Detect mouse hover, return hover info
- `handleClick()`: Handle mouse clicks, return click results

**Title Panel** (InventoryTopPanelContent):
- Shows: "Inventory" title, Gold, Item count
- Shows category tabs (clickable)
- Shows sort dropdown (clickable)

**Top Info Panel** (PartyManagementUnitInfoContent):
- Extends CombatView's UnitInfoContent
- Adds: "Learn Abilities" button, party member selector, XP display
- Shows: stats grid, ability slots, equipment slots
- Allows: clicking equipment slot to select it for comparison
- Returns: equipment-detail, ability-detail, empty-slot-detail, party-member, learn-abilities

**Main Panel** (InventoryRenderer):
- Renders: item list (name, quantity), pagination buttons
- Colors: yellow (hover), orange (class-restricted), gray (disabled/incompatible)
- Hit testing: getItemRowBounds(), getPaginationButtonBounds()

**Bottom Info Panel** (EquipmentComparisonContent, EquipmentInfoContent, ClassInfoContent):
- **Comparison mode** (when equipment slot selected): Shows current vs hovered item
  - Stat diffs highlighted (green+, red-)
  - Cancel/Remove Item buttons
- **Normal mode** (no slot selected): Shows hovered item details
- **Spend XP mode**: Shows class info and learn ability buttons

### Data Persistence

**localStorage keys:**
- `inventoryViewState`: category, sortMode, currentPage, selectedItemId (resets on load)

**PartyMemberRegistry:**
- Stores party member equipment assignments
- Updates via `PartyMemberRegistry.updateEquipment(id, slot, equipmentId)`

**PartyInventory:**
- Singleton managing all items and gold
- Static API: addItem, removeItem, addGold, removeGold, getItemCount, getAllItems, etc.

---

## Component & File Details

### Main Component

#### PartyManagementView.tsx
**Purpose:** Main React component for inventory view. Manages all UI state, rendering, and event handling.

**Key Methods:**
- `renderFrame()`: Canvas rendering loop using double buffering
- `handleMouseMove()`: Hover detection for categories, items, pagination, panels
- `handleMouseDown()`: Click handling for equipment equip/unequip, category tabs, sort, pagination
- Expose window functions: `giveItem()`, `giveGold()`, `clearInventory()`, `listEquipment()`, `showInventoryPanels()`, `addLogMessage()`

**Key State:**
- `viewState`: filters, sort, pagination, hover states
- `panelMode`: 'inventory' or 'spend-xp'
- `selectedPartyMemberIndex`: active party member
- `selectedEquipmentRef`: currently selected equipment slot for comparison
- `spendXpMainContentRef`: Spend XP content (lazy-created)

**Panels Used:**
- Title: InventoryTopPanelContent
- Top Info: PartyManagementUnitInfoContent
- Main: InventoryRenderer
- Bottom Info: EquipmentComparisonContent, EquipmentInfoContent, EmptySlotInfoContent, ClassInfoContent

**Dependencies:** React, partyInventory, Equipment, CombatLayoutManager, CombatLogManager, InfoPanelManager, FontAtlasLoader

**Used By:** InventoryViewRoute, Game component

---

### State Management

#### InventoryViewState.ts
**Purpose:** Type definitions and persistence for inventory UI state.

**Key Types:**
- `InventoryViewState`: Full UI state (category, sortMode, currentPage, selectedItemId, hovers, pagination)
- `InventoryCategory`: 'all' | 'weapons' | 'shields' | 'armor' | 'accessories' | 'held' | 'quest-items'
- `InventorySortMode`: 'name-asc' | 'name-desc' | 'type' | 'recently-added'

**Key Functions:**
- `createDefaultInventoryViewState()`: Returns default state
- `serializeInventoryViewState()`: Convert to JSON (excludes transient hovers)
- `deserializeInventoryViewState()`: Create from JSON (resets to defaults on load)
- `loadInventoryViewStateFromLocalStorage()`: Loads from localStorage or returns default
- `saveInventoryViewStateToLocalStorage()`: Saves to localStorage
- `isValidCategory()`, `isValidSortMode()`: Validation helpers

**Note:** Hover states are transient and reset on load; only category, sortMode, currentPage, selectedItemId persist.

**Used By:** PartyManagementView.tsx, TypeScript type system

---

### Rendering

#### InventoryRenderer.ts
**Purpose:** Stateless canvas renderer for inventory UI (item list, pagination).

**Key Methods:**
- `render()`: Main render method for main panel
  - Renders item list with colors (hover, quest-item, class-restricted, disabled)
  - Renders pagination buttons
- `renderItemList()`: Renders items with quantity, color coding
- `renderPagination()`: Renders prev/next buttons and page indicator
- `calculateItemsPerPage()`: Calculates rows per page based on panel height
- `getItemRowBounds()`: Returns clickable bounds for each item (for hit testing)
- `getPaginationButtonBounds()`: Returns clickable bounds for pagination buttons

**Parameters:**
- `disabledItemIds`: Set of equipment IDs incompatible with selected slot (render gray)
- `classRestrictedItemIds`: Set of equipment IDs restricted by class (render orange)

**Color Scheme:**
- Normal item: white text
- Hovered item: yellow text
- Quest item: cyan text
- Class-restricted (normal): orange text
- Class-restricted (hovered): yellow text
- Disabled: dark gray text

**Used By:** PartyManagementView.tsx

---

### Panel Content Files

#### PartyManagementUnitInfoContent.ts
**Purpose:** Extended version of UnitInfoContent for party management. Shows party stats, abilities, equipment, XP, and party member selector.

**Key Features:**
- Extends: UnitInfoContent (from CombatView)
- Adds: "Learn Abilities" button, party member sprite selector
- Shows: Class XP (instead of Action Timer), available XP amount
- Allows: clicking equipment/ability slots to select them for comparison
- Allows: clicking ability to show details in bottom panel

**Key Methods:**
- `setSelectedEquipmentSlot()`: Highlight a selected slot in green
- `handleHover()`: Detects hovers on slots, buttons, party selector
  - Returns: equipment-detail, ability-detail, empty-slot-detail, party-member-hover
- `handleClick()`: Handles clicks on slots, buttons, members
  - Returns: equipment-detail, ability-detail, empty-slot, party-member, learn-abilities

**Party Member Selector:**
- Renders below "Learn Abilities" button
- Shows 12x12 sprites in a row (centered)
- Yellow border = selected member
- Name shows on hover
- Click to switch to that member

**Dependencies:** FontAtlasRenderer, SpriteRenderer, FontRegistry, UnitInfoContent

**Used By:** PartyManagementView.tsx (top panel)

---

#### InventoryTopPanelContent.ts
**Purpose:** Title panel showing inventory stats and filters (category tabs, sort options).

**Key Features:**
- Shows: "Inventory" title, gold label+value, item counts
- Shows: Category tabs (all, weapons, shields, armor, accessories, held, quest-items)
- Shows: Sort dropdown (cycles through sort modes)
- Layout: Compact, single panel (not two-row like top info panel)

**Key Methods:**
- `render()`: Renders title, gold, category tabs, sort options
- `getCategoryTabBounds()`: Returns clickable bounds for each category tab
- `getSortBounds()`: Returns clickable bounds for sort dropdown
- `update()`: Updates stats and state (for re-renders)

**Styling:**
- Title: 7px font, light blue
- Values: white text
- Labels: light blue
- Hovered tab: yellow background
- Active tab: green background
- Hovered sort: yellow text

**Used By:** PartyManagementView.tsx (title panel)

---

#### EquipmentComparisonContent.ts
**Purpose:** Shows side-by-side comparison of two equipment items with stat differences.

**Key Features:**
- Shows: Current item (left) vs Hovered/selected item (right)
- If current item is empty: shows "Empty"
- If no comparison item is null: shows "??"
- Highlights stat differences: green (+better), red (-worse)
- Shows: Cancel Selection and Remove Item buttons

**Key Methods:**
- `render()`: Renders comparison table with stats
- `handleHover()`: Detects hovers on Cancel/Remove buttons
- `handleClick()`: Handles clicks on Cancel/Remove buttons
  - Returns: { type: 'button', buttonId: 'cancel-selection' | 'remove-item' }

**Stat Comparison:**
- Calculates difference for each stat
- Green color for improvements, red for reductions
- Shows "??" for unavailable comparison stats

**Used By:** PartyManagementView.tsx (bottom panel, when equipment slot selected)

---

#### EmptySlotInfoContent.ts
**Purpose:** Shows message when hovering over an empty equipment or ability slot.

**Key Features:**
- Shows: "Empty [slot type]" message
- Shows: "Click to equip" or "Click to set" hint
- Can be empty-slot-detail (hover) or selected for comparison

**Used By:** PartyManagementView.tsx (bottom panel, when empty slot hovered)

---

#### SpendXpMainPanelContent.ts
**Purpose:** Main panel for Spend XP mode. Two-column layout: classes (left), abilities (right).

**Key Features:**
- Left column: List of player classes (selectable)
- Right column: Abilities for selected class
- Shows: Class name, unspent XP for each class
- Shows: Ability name, XP cost, "Learned!" or "Learn" button

**Key Methods:**
- `render()`: Renders two-column layout with classes and abilities
- `handleHover()`: Detects hovers on classes and abilities
- `handleClick()`: Handles clicks on classes and abilities
  - Returns: { type: 'class-selected', classId } or { type: 'ability-selected', abilityId }
- `getSelectedClassId()`: Returns currently selected class ID

**Styling:**
- Normal class: white text
- Hovered class: yellow text
- Selected class: green text
- Header: dark orange
- Divider: vertical sprite between columns

**Used By:** PartyManagementView.tsx (main panel in spend-xp mode)

---

#### SpendXpTitlePanelContent.ts
**Purpose:** Title panel for Spend XP mode. Shows "Spend XP" title and party member info.

**Key Methods:**
- `render()`: Renders title and party member name

**Used By:** PartyManagementView.tsx (title panel in spend-xp mode)

---

#### ClassInfoContent.ts
**Purpose:** Shows class description and buttons to set as primary/secondary class or learn abilities.

**Key Features:**
- Shows: Class name, description
- Shows: Buttons for "Set Primary Class", "Set Secondary Class", "View Abilities"
- Styled with class theme colors

**Used By:** PartyManagementView.tsx (bottom panel when class selected in spend-xp mode)

---

### Utilities

#### PartyInventory.ts
**Purpose:** Singleton managing the party's shared inventory (items and gold).

**Key API (all static):**

**Adding/Removing:**
- `addItem(equipmentId, quantity=1)`: Add items to inventory
- `removeItem(equipmentId, quantity=1)`: Remove items (fails for quest items)
- `addGold(amount)`: Add gold
- `removeGold(amount)`: Remove gold (fails if insufficient)

**Querying:**
- `getItemCount(equipmentId)`: Get quantity of specific item
- `getTotalItemCount()`: Sum of all quantities
- `getTotalUniqueItems()`: Number of unique item types
- `getGold()`: Current gold
- `hasItem(equipmentId, quantity=1)`: Check if has enough
- `hasGold(amount)`: Check if has enough gold
- `getAllItems()`: Get array of all items
- `getItemsByCategory()`: Get items filtered by category
- `filterItems()`: Get items with Equipment data (for rendering)
- `sortItems()`: Sort array by mode (name, type, recently-added)
- `getItemDetails()`: Get Equipment + quantity for single item

**Serialization:**
- `toJSON()`: Convert to JSON for save
- `fromJSON()`: Load from JSON
- `clear()`: Clear all items and gold

**Internal Implementation:**
- Uses Map<equipmentId, quantity> for items
- Tracks insertion order for "recently-added" sorting
- Prevents quest items from being removed
- Validates equipment exists in Equipment registry

**Important:** All items are Equipment instances managed by equipment ID. No separate Item class.

**Used By:** PartyManagementView.tsx, various panels

---

#### EquipmentSlotUtil.ts
**Purpose:** Utility functions for equipment slot compatibility checking.

**Key Functions:**
- `getCompatibleEquipmentTypes(slotLabel)`: Returns array of compatible EquipmentType values
  - 'L.Hand' | 'R.Hand' → ['OneHandedWeapon', 'TwoHandedWeapon', 'Shield', 'Held']
  - 'Head' → ['Head']
  - 'Body' → ['Body']
  - 'Accessory' → ['Accessory']
- `isEquipmentCompatibleWithSlot(equipment, slotLabel)`: Boolean check
- `isEquipmentSlot(slotLabel)`: Check if it's an equipment slot (not ability slot)

**Equipment Slots:** L.Hand, R.Hand, Head, Body, Accessory (5 total)
**Ability Slots:** Reaction, Passive, Movement (not in this utility)

**Used By:** PartyManagementView.tsx, EquipmentComparisonContent.ts, panels

---

## Dependency Map

### PartyManagementView.tsx depends on:
```
├── react (useState, useRef, useEffect, useCallback, useMemo)
├── PartyInventory (getAllItems, addItem, removeItem, addGold)
├── Equipment (getById, getAll, type system)
├── InventoryViewState (types, load/save functions)
├── InventoryRenderer (render, calculateItemsPerPage)
├── CombatLayoutManager (panel regions)
├── CombatLogManager (logging)
├── InfoPanelManager (panel rendering)
├── Panel Content classes (InventoryTopPanelContent, PartyManagementUnitInfoContent, etc.)
├── FontAtlasLoader, FontAtlasRenderer
├── PartyMemberRegistry (createPartyMember, updateEquipment)
├── EquipmentSlotUtil (isEquipmentCompatibleWithSlot, isEquipmentSlot)
└── CombatConstants (dimensions, fonts, colors)
```

### Panel Content classes depend on:
```
├── FontAtlasRenderer (text rendering)
├── Equipment (getById, types)
├── CombatUnit, HumanoidUnit (unit data)
├── UnitClass (class data)
└── PanelContent interface (base implementation)
```

### PartyInventory.ts depends on:
```
└── Equipment (getById registry validation)
```

---

## Common Tasks & Solutions

### Add new equipment category
1. Add to `InventoryCategory` type in InventoryViewState.ts
2. Add case to `getEmptyMessage()` in InventoryRenderer.ts
3. Add filter logic to `matchesCategory()` in PartyInventory.ts
4. Add category tab to InventoryTopPanelContent.ts

### Change equipment comparison layout
1. Edit `render()` in EquipmentComparisonContent.ts
2. Update stat calculation and color logic
3. Update button layout if needed

### Add new equipment slot
1. Add slot label to equipment slots array in EquipmentSlotUtil.ts
2. Add to `getCompatibleEquipmentTypes()` switch
3. Add to slot labels in PartyManagementUnitInfoContent.ts (`getSlotLabelAtPosition()`)
4. Add equip method to HumanoidUnit if needed
5. Update PartyManagementView.tsx slot mapping

### Debug panel rendering
1. Call `window.showInventoryPanels(true)` in console
2. Panels show as colored overlays:
   - Red: Title Panel
   - Green: Top Info Panel
   - Blue: Main Panel
   - Yellow: Log Panel
   - Magenta: Bottom Info Panel

### Add inventory to save/load
1. Save: `PartyInventory.toJSON()` → serialize
2. Load: `PartyInventory.fromJSON(json)` → deserialize
3. Use localStorage key: `inventoryState`

---

## Performance Notes

- **Double buffering:** OffscreenCanvas for smooth rendering
- **requestAnimationFrame:** Animation loop updates combat log only
- **Memoization:** useMemo for filteredAndSortedItems, currentPageItems, pagination
- **Lazy creation:** SpendXpMainPanelContent created only when entering spend-xp mode
- **Ref tracking:** selectedMemberRef caches unit to avoid recreating each frame
- **Hit testing:** bounds cached in renderer (getItemRowBounds, getPaginationButtonBounds)

---

## Testing Tips

**Developer console functions:**
```javascript
giveItem(equipmentId?, quantity=1)      // Add item to inventory
giveGold(amount=100)                    // Add gold
clearInventory()                        // Remove all items
listEquipment()                         // Show all available equipment
showInventoryPanels(true/false)         // Toggle panel boundaries overlay
addLogMessage(message?)                 // Add message to log
showOnlyLog()                           // Debug: show only log panel full-screen
restoreLayout()                         // Debug: restore normal layout
```

**Test scenarios:**
1. Select equipment slot → only compatible items render in yellow
2. Class-restricted item → orange color, can't equip to restricted class
3. Equipment comparison → stat diffs show in green (better) or red (worse)
4. Learn ability → XP deducted, "Learned!" button appears
5. Pagination → "< Prev" disabled on first page, "Next >" disabled on last page

---

## Modified Combat Files

### PanelContent.ts (interface)
- Added support for bottom panel click results (button, remove-item, cancel-selection)
- Used by EquipmentComparisonContent.ts

### UnitInfoContent.ts (parent of PartyManagementUnitInfoContent)
- Extended to support equipment/ability slot selection
- PartyManagementUnitInfoContent overrides render methods

### EquipmentInfoContent.ts (shows equipment details)
- Reused in inventory bottom panel for non-comparison mode
- Shows equipment stats and description

### AbilityInfoContent.ts (shows ability details)
- Reused in inventory for ability hover details
- Shows ability description and effects

### InfoPanelManager.ts (panel rendering manager)
- Handles rendering panel content (title, top, bottom)
- Reused across views

### CombatLayoutManager.ts (layout calculation)
- Provides panel region calculations
- Inventory view uses custom region adjustments via helper functions

---

End of PartyManagementHierarchy.md
