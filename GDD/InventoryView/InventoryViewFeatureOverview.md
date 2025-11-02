# Inventory View Feature - Design Overview

**Version:** 1.0
**Created:** 2025-11-01
**Related:** [CombatHierarchy.md](../../CombatHierarchy.md), [PartyInventoryFeatureOverview.md](../PartyInventory/PartyInventoryFeatureOverview.md)

## Purpose

This document describes the Inventory View feature for VibeDC. The Inventory View provides a dedicated full-screen interface for players to browse, filter, sort, and manage the party's shared inventory. It follows the same layout and rendering patterns as CombatView but adapts the main panel to display inventory contents with pagination support.

## Feature Summary

The Inventory View provides players with:
- Full-screen inventory interface using the same 5-panel layout as CombatView
- Main panel displays inventory items in a grid/list format
- Category filtering (All, Weapons, Shields, Armor, Accessories, Held, Quest Items)
- Sorting options (Name Asc/Desc, Type, Recently Added)
- Pagination when inventory exceeds display capacity (page indicators visible only when needed)
- Item selection and interaction (view details, equip, drop - future enhancements)
- Gold display in top panel
- Bottom panel shows selected item details
- Top panel shows inventory statistics (total items, unique items, gold)
- Combat log shows inventory actions and messages
- Persistent across sessions (reopens to same filter/sort/page state)

## Design Philosophy

### Layout Consistency

The Inventory View uses the **exact same panel layout** as CombatView:

```
┌────────────────────────────────────────────────────┐
│  Top Panel (Inventory Stats: Items, Unique, Gold) │
├──────────────────────────┬─────────────────────────┤
│                          │  Top Info Panel         │
│                          │  (Empty or hints)       │
│   Main Inventory Panel   ├─────────────────────────┤
│   (Item Grid + Paging)   │  Combat Log Panel       │
│                          │  (Inventory actions)    │
│                          ├─────────────────────────┤
│                          │  Bottom Info Panel      │
│                          │  (Selected Item Details)│
└──────────────────────────┴─────────────────────────┘
```

**Panel Dimensions** (from CombatLayoutManager):
- Top Panel: Full width, 18px height
- Main Panel (Inventory): Left side, clipped by layout
- Top Info Panel: Right side, top portion
- Combat Log: Right side, middle portion (scrollable)
- Bottom Info Panel: Right side, bottom portion

### Rendering Architecture

**Follow CombatView patterns:**
- Use off-screen buffer canvas for rendering (double buffering)
- Use SpriteRenderer for all sprite drawing
- Use FontAtlasRenderer for all text rendering
- Disable image smoothing: `ctx.imageSmoothingEnabled = false`
- Round all coordinates to integers for pixel-perfect rendering
- Use CombatLayoutManager for panel regions
- Use CombatConstants for fonts, colors, dimensions

**Canvas Setup:**
```typescript
const CANVAS_WIDTH = CombatConstants.CANVAS_WIDTH; // 384 pixels
const CANVAS_HEIGHT = CombatConstants.CANVAS_HEIGHT; // 216 pixels
const TILE_SIZE = CombatConstants.TILE_SIZE; // 12 pixels
const SPRITE_SIZE = CombatConstants.SPRITE_SIZE; // 12 pixels
```

## Core Requirements

### 1. Data Source: PartyInventory

The Inventory View reads from the `PartyInventory` singleton:

```typescript
import { PartyInventory } from '../../utils/inventory/PartyInventory';

// Get all items
const allItems = PartyInventory.filterItems('all');

// Filter by category
const weapons = PartyInventory.filterItems('weapons');

// Sort items
const sorted = PartyInventory.sortItems(allItems, 'name-asc');

// Get gold
const gold = PartyInventory.getGold();

// Get item details
const details = PartyInventory.getItemDetails('flame-blade-001');
```

**No local state duplication** - always read from PartyInventory

### 2. Inventory State Management

Track UI state (not inventory data):

```typescript
interface InventoryViewState {
  // Filter/sort settings
  selectedCategory: InventoryCategory; // 'all', 'weapons', 'shields', etc.
  sortMode: InventorySortMode;         // 'name-asc', 'name-desc', 'type', 'recently-added'

  // Pagination
  currentPage: number;                 // 0-indexed page number
  itemsPerPage: number;                // Fixed based on panel size

  // Selection
  selectedItemIndex: number | null;    // Index in filtered+sorted list
  hoveredItemIndex: number | null;     // Index in filtered+sorted list

  // UI state
  hoveredCategoryIndex: number | null; // For category tabs
  hoveredSortIndex: number | null;     // For sort dropdown
}
```

**Persistence:**
- Save filter/sort/page state to localStorage
- Restore on view open
- Clear on inventory changes (reset to page 0)

### 3. Main Panel: Inventory Display

#### Panel Region

Use CombatLayoutManager to get map clip region (repurpose for inventory):

```typescript
const layoutManager = new CombatLayoutManager();
const inventoryRegion = layoutManager.getMapClipRegion();

// Convert to pixel coordinates
const panelX = inventoryRegion.minCol * TILE_SIZE;
const panelY = inventoryRegion.minRow * TILE_SIZE;
const panelWidth = (inventoryRegion.maxCol - inventoryRegion.minCol + 1) * TILE_SIZE;
const panelHeight = (inventoryRegion.maxRow - inventoryRegion.minRow + 1) * TILE_SIZE;
```

**Expected dimensions** (based on CombatView layout):
- X: ~12px (left padding)
- Y: ~24px (below top panel)
- Width: ~252px (left portion of canvas)
- Height: ~180px (main content area)

#### Category Tabs

Display at top of main panel:

**Layout:**
```
┌────────────────────────────────────────────────────┐
│ [All] [Weapons] [Shields] [Armor] [Accessories]   │
│ [Held] [Quest Items]                               │
├────────────────────────────────────────────────────┤
│ Sort: [Name ▼]                                     │
├────────────────────────────────────────────────────┤
│ Item list...                                       │
```

**Category Tab Specs:**
- Font: `7px-04b03` (standard UI font)
- Height: 7px per row
- Spacing: 2px between tabs
- Colors:
  - Unselected: `#888888` (grey)
  - Hovered: `#ffff00` (yellow)
  - Selected: `#ffffff` (white)
- Interaction: Click to filter by category
- Layout: Two rows if needed (4 tabs per row max)

**Categories:**
1. All (default)
2. Weapons (OneHandedWeapon, TwoHandedWeapon)
3. Shields
4. Armor (Head, Body)
5. Accessories
6. Held
7. Quest Items (typeTags includes "quest-item")

#### Sort Dropdown

Display below category tabs:

**Dropdown Specs:**
- Font: `7px-04b03`
- Height: 7px
- Position: Below category tabs, 2px spacing
- Text: "Sort: [Current Mode ▼]"
- Colors:
  - Label: `#888888` (grey)
  - Value: `#ffffff` (white)
  - Hovered: `#ffff00` (yellow)
- Interaction:
  - Click to open dropdown (expand modes below)
  - Click mode to select and collapse
  - Click outside to collapse

**Sort Modes:**
1. Name ▲ (Ascending)
2. Name ▼ (Descending)
3. Type (by Equipment.type)
4. Recently Added (newest first)

#### Item List/Grid

Display filtered and sorted items:

**List Layout (Recommended):**
- One item per row
- Font: `7px-04b03`
- Row height: 8px (7px text + 1px spacing)
- Position: Below sort dropdown, 4px spacing
- Width: Full panel width minus padding
- Visible rows: Calculate from available height

**Item Row Format:**
```
[Icon?] Item Name (x Quantity)
```

**Item Row Specs:**
- Background:
  - Unselected: Transparent
  - Hovered: `rgba(255, 255, 0, 0.2)` (yellow tint)
  - Selected: `rgba(255, 255, 255, 0.2)` (white tint)
- Text color:
  - Normal: `#ffffff`
  - Quest item: `#ffff00` (yellow)
  - Equipped (future): `#00ff00` (green)
- Quantity display: " (x5)" appended to name
- Truncation: If name + quantity exceeds width, truncate name with "..."

**Alternative: Grid Layout (Future)**
- 4 items per row (similar to victory screen)
- Item width: 60px
- Item height: 24px (sprite + text)
- Show sprite above text
- Spacing: 4px horizontal, 2px vertical

#### Pagination Controls

Display at bottom of item list **only if needed**:

**Pagination Specs:**
- Position: Bottom of main panel, 2px above panel edge
- Font: `7px-04b03`
- Height: 7px
- Layout: "Page X / Y  [<] [>]"
- Colors:
  - Text: `#888888` (grey)
  - Arrows enabled: `#ffffff` (white)
  - Arrows disabled: `#444444` (dark grey)
  - Arrows hovered: `#ffff00` (yellow)
- Interaction:
  - Click [<] to go to previous page
  - Click [>] to go to next page
  - Disabled when at first/last page

**Pagination Logic:**
```typescript
const itemsPerPage = calculateItemsPerPage(availableHeight, itemRowHeight);
const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
const currentPageItems = filteredItems.slice(
  currentPage * itemsPerPage,
  (currentPage + 1) * itemsPerPage
);

// Show pagination only if multiple pages
const showPagination = totalPages > 1;
```

**Calculate Items Per Page:**
```typescript
function calculateItemsPerPage(availableHeight: number, itemRowHeight: number): number {
  // Reserve space for:
  // - Category tabs: 14px (2 rows * 7px)
  // - Sort dropdown: 9px (7px + 2px spacing)
  // - Top spacing: 4px
  // - Pagination: 9px (7px + 2px spacing) - only if needed
  // - Bottom spacing: 2px

  const reservedHeight = 14 + 9 + 4 + 2; // Without pagination
  const heightForItems = availableHeight - reservedHeight;

  // Calculate max items that fit
  const maxItems = Math.floor(heightForItems / itemRowHeight);

  // If items need pagination, reserve space for it
  const totalItems = filteredItems.length;
  if (totalItems > maxItems) {
    // Recalculate with pagination space reserved
    const heightWithPagination = heightForItems - 9;
    return Math.floor(heightWithPagination / itemRowHeight);
  }

  return maxItems;
}
```

### 4. Top Panel: Inventory Statistics

Display inventory summary information:

**Layout:**
```
Items: 45 / 50 Unique    Gold: 1,250g
```

**Stats Display:**
- Font: `7px-04b03`
- Position: Centered in top panel
- Colors:
  - Labels: `#888888` (grey)
  - Values: `#ffffff` (white)
  - Gold: `#ffff00` (yellow)
- Spacing: 4px between stats

**Stats Tracked:**
- Total Items: `PartyInventory.getTotalItemCount()`
- Unique Items: `PartyInventory.getTotalUniqueItems()`
- Gold: `PartyInventory.getGold()`

**Alternative Layout (if space allows):**
```
┌────────────────────────────────────────────────────┐
│ INVENTORY        Items: 45/50 Unique    Gold: 1250g│
└────────────────────────────────────────────────────┘
```

### 5. Bottom Info Panel: Selected Item Details

Display details of hovered/selected item:

**Content:**
```
[Equipment Name]
[Equipment Type]
Quantity: X

Modifiers:
+12 Physical Power
+8 Magic Power
+5 Speed

Range: 1-2
Tags: weapon, medium

[Equip] [Drop] [Use]
```

**Details Display:**
- Font: `7px-04b03`
- Line height: 8px
- Padding: 4px
- Colors:
  - Name: `#ffffff` (white)
  - Type: `#888888` (grey)
  - Stats: `#00ff00` (green for positive)
  - Quest item: `#ffff00` (yellow name)

**Equipment Info:**
- Name: `equipment.name`
- Type: `equipment.type` (formatted: "One-Handed Weapon")
- Quantity: From inventory
- Modifiers: Display non-zero modifiers
- Range: If weapon, show `minRange-maxRange`
- Tags: If typeTags present, show comma-separated

**Action Buttons (Future):**
- [Equip]: Open equipment panel (future)
- [Drop]: Remove item from inventory (confirm dialog)
- [Use]: Use consumable item (future)

### 6. Top Info Panel: Hints/Help

Display contextual help text:

**Content Examples:**
```
Click item to view details
Click category to filter
Click sort to change order
Use arrows to page
```

**Help Display:**
- Font: `7px-04b03`
- Line height: 8px
- Padding: 4px
- Color: `#888888` (grey)
- Alignment: Left-aligned

**Contextual Messages:**
- Default: "Click item to view details"
- Hovering category: "Filter by [Category Name]"
- Hovering sort: "Change sort order"
- Hovering item: "[Item Name] - Click for details"
- Empty inventory: "No items in inventory"

### 7. Combat Log: Inventory Actions

Display inventory-related messages:

**Message Types:**
```
Item added: Flame Blade (x1)
Item removed: Health Potion (x3)
Gold added: +150g
Gold removed: -50g
Cannot remove quest item: Ancient Key
Inventory full (capacity: 100)
```

**Log Display:**
- Use existing CombatLogManager
- Font: `7px-04b03`
- Line height: 8px
- Colors:
  - Added: `#00ff00` (green)
  - Removed: `#ff0000` (red)
  - Warning: `#ffff00` (yellow)
  - Info: `#ffffff` (white)
- Scrollable with arrow buttons

**Message Format:**
```typescript
combatLogManager.addMessage(`Item added: ${item.name} (x${quantity})`);
combatLogManager.addMessage(`Gold: +${amount}g`);
combatLogManager.addMessage(`Cannot drop quest item: ${item.name}`, '#ffff00');
```

## Technical Implementation

### Component Structure

```typescript
// components/inventory/InventoryView.tsx
export interface InventoryViewProps {
  onClose?: () => void; // Callback to close inventory and return to world
}

export const InventoryView: React.FC<InventoryViewProps> = ({ onClose }) => {
  // State management
  const [viewState, setViewState] = useState<InventoryViewState>({
    selectedCategory: 'all',
    sortMode: 'name-asc',
    currentPage: 0,
    itemsPerPage: 0, // Calculated dynamically
    selectedItemIndex: null,
    hoveredItemIndex: null,
    hoveredCategoryIndex: null,
    hoveredSortIndex: null,
  });

  // Canvas refs
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Managers (same as CombatView)
  const layoutManager = useMemo(() => new CombatLayoutManager(), []);
  const combatLogManager = useMemo(() => new CombatLogManager({...}), []);
  const bottomInfoPanelManager = useMemo(() => new InfoPanelManager(), []);
  const topInfoPanelManager = useMemo(() => new InfoPanelManager(), []);

  // Sprite/font loaders (same as CombatView)
  const spriteLoader = useMemo(() => new SpriteAssetLoader(), []);
  const fontLoader = useMemo(() => new FontAtlasLoader(), []);

  // Get filtered and sorted items from PartyInventory
  const filteredItems = useMemo(() => {
    const items = PartyInventory.filterItems(viewState.selectedCategory);
    return PartyInventory.sortItems(items, viewState.sortMode);
  }, [viewState.selectedCategory, viewState.sortMode]);

  // Calculate pagination
  const { itemsPerPage, totalPages, currentPageItems } = useMemo(() => {
    const itemsPerPage = calculateItemsPerPage(availableHeight, itemRowHeight);
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const start = viewState.currentPage * itemsPerPage;
    const currentPageItems = filteredItems.slice(start, start + itemsPerPage);

    return { itemsPerPage, totalPages, currentPageItems };
  }, [filteredItems, viewState.currentPage, availableHeight]);

  // Render function
  const renderFrame = useCallback(() => {
    // Double buffering rendering (same pattern as CombatView)
    // 1. Clear buffer canvas
    // 2. Render background
    // 3. Render category tabs
    // 4. Render sort dropdown
    // 5. Render item list
    // 6. Render pagination (if needed)
    // 7. Render layout panels (top, log, info panels)
    // 8. Copy buffer to display canvas
  }, [viewState, filteredItems, currentPageItems]);

  // Animation loop (same as CombatView)
  useEffect(() => {
    // requestAnimationFrame loop
    // Update combat log animations
    // Render frame
  }, [renderFrame]);

  // Event handlers
  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    // Convert to canvas coordinates
    // Check if category tab clicked
    // Check if sort dropdown clicked
    // Check if item clicked
    // Check if pagination arrow clicked
    // Update viewState accordingly
  }, [viewState, currentPageItems]);

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent) => {
    // Convert to canvas coordinates
    // Update hoveredCategoryIndex
    // Update hoveredSortIndex
    // Update hoveredItemIndex
    // Update info panels with hover data
  }, [viewState, currentPageItems]);

  return (
    <div style={{ /* same container style as CombatView */ }}>
      <canvas
        ref={displayCanvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        style={{ /* same canvas style as CombatView */ }}
      />
    </div>
  );
};
```

### Rendering Manager

Create dedicated renderer for inventory content:

```typescript
// models/inventory/InventoryRenderer.ts
export class InventoryRenderer {
  constructor(
    private layoutManager: CombatLayoutManager,
    private tileSize: number,
    private spriteSize: number
  ) {}

  /**
   * Render category tabs at top of main panel
   */
  renderCategoryTabs(
    ctx: CanvasRenderingContext2D,
    categories: InventoryCategory[],
    selectedCategory: InventoryCategory,
    hoveredIndex: number | null,
    fontAtlas: HTMLImageElement,
    region: { x: number; y: number; width: number; height: number }
  ): void {
    // Calculate tab positions (2 rows, 4 per row)
    // Render tab backgrounds
    // Render tab text
    // Highlight selected and hovered
  }

  /**
   * Render sort dropdown
   */
  renderSortDropdown(
    ctx: CanvasRenderingContext2D,
    sortMode: InventorySortMode,
    isOpen: boolean,
    hoveredIndex: number | null,
    fontAtlas: HTMLImageElement,
    x: number,
    y: number
  ): void {
    // Render "Sort: [Mode ▼]"
    // If open, render dropdown options below
    // Highlight hovered option
  }

  /**
   * Render item list rows
   */
  renderItemList(
    ctx: CanvasRenderingContext2D,
    items: InventoryItem[],
    selectedIndex: number | null,
    hoveredIndex: number | null,
    fontAtlas: HTMLImageElement,
    region: { x: number; y: number; width: number; height: number }
  ): void {
    // For each item in current page
    // Render background highlight (if selected/hovered)
    // Render item name
    // Render quantity " (x5)"
    // Truncate text if too long
    // Quest items in yellow
  }

  /**
   * Render pagination controls
   */
  renderPagination(
    ctx: CanvasRenderingContext2D,
    currentPage: number,
    totalPages: number,
    hoveredArrow: 'left' | 'right' | null,
    fontAtlas: HTMLImageElement,
    x: number,
    y: number
  ): void {
    // Render "Page X / Y"
    // Render [<] arrow (disabled if page 0)
    // Render [>] arrow (disabled if last page)
    // Highlight hovered arrow
  }

  /**
   * Get bounds for click detection
   */
  getCategoryTabBounds(region: { x: number; y: number; width: number; height: number }): Array<{ x: number; y: number; width: number; height: number }> {
    // Calculate bounds for each category tab
  }

  getItemBounds(region: { x: number; y: number; width: number; height: number }, items: InventoryItem[]): Array<{ x: number; y: number; width: number; height: number }> {
    // Calculate bounds for each visible item row
  }

  getPaginationBounds(x: number, y: number): { left: { x: number; y: number; width: number; height: number }, right: { x: number; y: number; width: number; height: number } } {
    // Calculate bounds for pagination arrows
  }
}
```

### Panel Content Managers

Reuse existing panel managers from CombatView:

**Bottom Info Panel: Item Details**
```typescript
// models/inventory/ItemDetailsContent.ts
export class ItemDetailsContent implements PanelContent {
  constructor(private item: InventoryItem | null) {}

  render(ctx: CanvasRenderingContext2D, region: PanelRegion, fontAtlas: HTMLImageElement): void {
    if (!this.item) {
      // Render "No item selected"
      return;
    }

    // Render item name (bold/large)
    // Render equipment type
    // Render quantity
    // Render modifiers
    // Render range (if weapon)
    // Render tags
  }

  handleClick(x: number, y: number, region: PanelRegion): PanelClickResult | null {
    // Future: Handle [Equip] [Drop] [Use] buttons
    return null;
  }

  handleHover(x: number, y: number, region: PanelRegion): boolean {
    // Future: Highlight buttons on hover
    return false;
  }
}
```

**Top Info Panel: Help Text**
```typescript
// models/inventory/HelpTextContent.ts
export class HelpTextContent implements PanelContent {
  constructor(private message: string) {}

  render(ctx: CanvasRenderingContext2D, region: PanelRegion, fontAtlas: HTMLImageElement): void {
    // Render help message in grey
    FontAtlasRenderer.renderText(
      ctx,
      this.message,
      region.x + 4,
      region.y + 4,
      '7px-04b03',
      fontAtlas,
      1,
      'left',
      '#888888'
    );
  }

  handleClick(): null { return null; }
  handleHover(): boolean { return false; }
}
```

## Integration with Game Flow

### Opening Inventory

From world view or pause menu:

```typescript
// In WorldView or PauseMenu
const handleOpenInventory = () => {
  // Navigate to inventory view
  setCurrentView('inventory');
};
```

### Closing Inventory

Return to previous view:

```typescript
// In InventoryView
const handleClose = () => {
  // Save view state to localStorage
  saveInventoryViewState(viewState);

  // Call onClose callback
  if (onClose) {
    onClose();
  }
};

// Keyboard shortcut: ESC to close
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleClose();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [handleClose]);
```

### Inventory Updates

When PartyInventory changes (combat victory, shop purchase, etc.):

```typescript
// Reset to page 0 to show newly added items
setViewState(prev => ({
  ...prev,
  currentPage: 0
}));

// Add log message
combatLogManager.addMessage(`Item added: Flame Blade (x1)`);

// Re-render to show changes
renderFrame();
```

## Edge Cases and Considerations

### 1. Empty Inventory

**Issue:** No items to display

**Solution:**
- Show "Inventory Empty" message in main panel
- Disable sort dropdown (greyed out)
- Hide pagination controls
- Show help text: "Defeat enemies and open chests to find items"

### 2. Single Page of Items

**Issue:** All items fit on one page

**Solution:**
- Hide pagination controls entirely
- Reserve full height for item list
- No page indicators needed

### 3. Inventory Updates During View

**Issue:** Items added/removed while inventory view is open

**Solution:**
- Listen for PartyInventory events (future enhancement)
- Automatically refresh filtered/sorted list
- Reset to page 0 if current page becomes empty
- Add log message for user awareness

### 4. Very Long Item Names

**Issue:** Item name exceeds row width

**Solution:**
- Calculate max text width: `rowWidth - quantityWidth - padding`
- Truncate name with "..." if too long
- Example: "Ancient Legendary Sw... (x1)"
- Full name shown in bottom info panel on hover

### 5. Quest Items

**Issue:** Quest items should be visually distinct

**Solution:**
- Render quest item names in yellow (`#ffff00`)
- Add ⚑ icon before name (future)
- Cannot drop (disable button in details panel)
- Show "Quest Item" tag in details panel

### 6. Window Resize

**Issue:** Available space changes

**Solution:**
- Recalculate `itemsPerPage` on resize
- Adjust pagination accordingly
- May need to change current page if items no longer fit
- Use same responsive scaling as CombatView

### 7. Filter/Sort Changes

**Issue:** Changing filter or sort may result in different item count

**Solution:**
- Reset to page 0 when filter or sort changes
- Recalculate total pages
- Update pagination visibility

### 8. Item Stack Changes

**Issue:** Removing items from stack (e.g., equipping) changes quantity

**Solution:**
- If quantity reaches 0, item disappears from list
- Recalculate pagination
- If current page becomes empty, go to previous page
- Update details panel if showing removed item

## Performance Considerations

### Rendering Optimization

**Same patterns as CombatView:**
- Double buffering (off-screen canvas)
- Only render when state changes (no continuous animation loop unless needed)
- Batch text rendering with FontAtlasRenderer
- Use integer coordinates for pixel-perfect rendering
- Cache calculated bounds for hit detection

**Frame Rate:**
- 60 FPS animation loop for smooth log scrolling
- Render on demand for static content
- Use FPS limiting option from UISettings

### Memory Usage

**Lightweight:**
- No duplicate inventory data (read from PartyInventory)
- Only store UI state (filter, sort, page, selection)
- Reuse managers and loaders from CombatView
- Small canvas buffers (384x216 pixels)

**Expected Memory:**
- View state: < 1 KB
- Canvas buffers: ~500 KB (two 384x216 RGBA canvases)
- Managers/renderers: ~100 KB
- **Total: < 1 MB** (very efficient)

### Query Performance

**PartyInventory access:**
- `filterItems()`: O(n) where n = unique items (~50-100)
- `sortItems()`: O(n log n) (~1ms for 100 items)
- Map lookups: O(1) (instant)

**Pagination:**
- Slice operation: O(1) (just array indexing)
- Visible items: ~10-20 per page
- **Negligible performance impact**

## Testing Checklist

### UI Rendering
- [ ] Canvas renders at correct resolution (384x216)
- [ ] All panels visible and correctly positioned
- [ ] Category tabs render in 2 rows
- [ ] Sort dropdown renders correctly
- [ ] Item list renders with correct spacing
- [ ] Pagination shows only when needed
- [ ] Fonts render pixel-perfect
- [ ] Colors match design spec
- [ ] No visual glitches or artifacts

### Category Filtering
- [ ] "All" shows all items
- [ ] "Weapons" shows only weapons
- [ ] "Shields" shows only shields
- [ ] "Armor" shows only armor
- [ ] "Accessories" shows only accessories
- [ ] "Held" shows only held items
- [ ] "Quest Items" shows only quest items
- [ ] Empty categories show "No items"
- [ ] Changing category resets to page 0

### Sorting
- [ ] Name Ascending sorts alphabetically A-Z
- [ ] Name Descending sorts alphabetically Z-A
- [ ] Type sorts by Equipment.type
- [ ] Recently Added shows newest first
- [ ] Changing sort resets to page 0
- [ ] Sort persists across sessions

### Pagination
- [ ] Pagination hidden when all items fit
- [ ] Pagination shows correct page numbers
- [ ] Left arrow goes to previous page
- [ ] Right arrow goes to next page
- [ ] Arrows disabled at first/last page
- [ ] Page 0 is first page (0-indexed internally)
- [ ] Correct items shown on each page

### Item Selection
- [ ] Clicking item selects it
- [ ] Selected item shows in details panel
- [ ] Hovering item changes color
- [ ] Hovering item updates help text
- [ ] Quest items render in yellow
- [ ] Quantity displays correctly " (x5)"

### Info Panels
- [ ] Top panel shows correct stats
- [ ] Gold displays with comma separators
- [ ] Bottom panel shows item details
- [ ] Modifiers format correctly
- [ ] Range shows for weapons
- [ ] Tags display comma-separated
- [ ] Empty state shows placeholder

### Combat Log
- [ ] Messages scroll correctly
- [ ] Colors match design (green=add, red=remove)
- [ ] Arrow buttons work
- [ ] Log persists across pages
- [ ] Messages truncate if too long

### Integration
- [ ] Opens from world view
- [ ] Closes with ESC key
- [ ] Closes with close button (future)
- [ ] Returns to correct previous view
- [ ] State persists across open/close
- [ ] Updates when inventory changes

### Edge Cases
- [ ] Empty inventory handled gracefully
- [ ] Single item works correctly
- [ ] Long item names truncate
- [ ] Very large inventory (100+ items) performs well
- [ ] Window resize recalculates layout
- [ ] Filter change with multi-page results works
- [ ] Last item removed handles correctly

## Future Enhancements

### Item Actions

**Equip Button:**
- Opens equipment panel (future feature)
- Shows which party members can equip
- Preview stat changes
- Swap equipped items

**Drop Button:**
- Confirmation dialog: "Drop [Item] (x1)?"
- Removes from inventory
- Cannot drop quest items
- Shows warning if item is equipped

**Use Button (Consumables):**
- Future: Consumable items
- Opens party member selection
- Applies item effect
- Removes from inventory

### Item Icons

**Sprite Display:**
- Show equipment sprite in item list
- 12x12 sprite to left of name
- Grid layout with sprite above name
- Sprite color coding by rarity (future)

### Search/Filter

**Text Search:**
- Search box at top of main panel
- Filter by item name
- Real-time filtering as user types
- Clear button to reset search

**Advanced Filters:**
- Filter by stat modifiers (e.g., "+Physical Power")
- Filter by tags (e.g., "weapon", "heavy")
- Filter by equipability (can X equip this?)
- Combine filters (AND/OR logic)

### Item Comparison

**Compare Mode:**
- Select two items to compare side-by-side
- Show stat differences (+/-)
- Highlight better stats in green
- Useful for equipment decisions

### Crafting Integration

**Craft Button:**
- Opens crafting panel
- Show recipes that use selected item
- Highlight missing materials
- Craft directly from inventory

### Trading/Selling

**Sell Mode:**
- Toggle sell mode in inventory
- Select items to sell
- Show total sell value
- Confirm transaction with merchant

### Sorting Enhancements

**Additional Sort Modes:**
- Value (most expensive first)
- Weight (heaviest first)
- Rarity (legendary > epic > rare > common)
- Equipability (can current character equip?)

### Inventory Management

**Auto-Sort Button:**
- Automatically organize inventory
- Group by type, then by rarity
- Place quest items at top

**Batch Operations:**
- Select multiple items (checkboxes)
- Drop multiple items at once
- Mark favorites (prevent accidental drop)

### Accessibility

**Keyboard Navigation:**
- Arrow keys to navigate item list
- Tab to cycle through panels
- Enter to select item
- Number keys for category shortcuts

**Screen Reader Support:**
- Announce item names
- Announce stats
- Announce page numbers

## Dependencies

- **Requires**: PartyInventory singleton
- **Requires**: Equipment registry
- **Requires**: CombatLayoutManager
- **Requires**: FontAtlasRenderer, SpriteRenderer
- **Requires**: CombatLogManager, InfoPanelManager
- **Integrates With**: World view, pause menu, combat victory
- **Future Dependencies**: Equipment panel, shop system, crafting system

## Success Criteria

This feature is complete when:

1. ✅ InventoryView component renders with 5-panel layout
2. ✅ Main panel shows filtered and sorted inventory items
3. ✅ Category tabs work (click to filter)
4. ✅ Sort dropdown works (click to change sort mode)
5. ✅ Pagination works (arrows to navigate pages)
6. ✅ Pagination hidden when all items fit on one page
7. ✅ Item selection works (click to select, shows in details panel)
8. ✅ Top panel shows inventory statistics (items, unique, gold)
9. ✅ Bottom panel shows selected item details
10. ✅ Top info panel shows help text
11. ✅ Combat log shows inventory actions
12. ✅ View state persists across sessions (localStorage)
13. ✅ Opens from world view / pause menu
14. ✅ Closes with ESC key
15. ✅ Updates when inventory changes
16. ✅ All edge cases handled (empty, single page, long names)
17. ✅ Performance meets standards (60 FPS, <1ms queries)
18. ✅ All unit and integration tests pass

---

## Implementation Notes

### Reuse Patterns from CombatView

**Canvas Setup:**
```typescript
// Same as CombatView
const CANVAS_WIDTH = CombatConstants.CANVAS_WIDTH;
const CANVAS_HEIGHT = CombatConstants.CANVAS_HEIGHT;
```

**Double Buffering:**
```typescript
// Same pattern as CombatView.renderFrame()
const bufferCanvas = bufferCanvasRef.current;
const displayCanvas = displayCanvasRef.current;

// Render to buffer
const ctx = bufferCanvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
// ... render everything ...

// Copy buffer to display
const displayCtx = displayCanvas.getContext('2d');
displayCtx.imageSmoothingEnabled = false;
displayCtx.drawImage(bufferCanvas, 0, 0);
```

**Animation Loop:**
```typescript
// Same pattern as CombatView animation loop
useEffect(() => {
  const animate = (currentTime: number) => {
    const deltaTime = (currentTime - lastFrameTimeRef.current) / 1000;
    lastFrameTimeRef.current = currentTime;

    // Update combat log animations
    combatLogManager.update(deltaTime);

    // Render frame
    renderFrame();

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  lastFrameTimeRef.current = performance.now();
  animationFrameRef.current = requestAnimationFrame(animate);

  return () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };
}, [renderFrame, combatLogManager]);
```

**Event Handling:**
```typescript
// Same coordinate conversion as CombatView
const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
  const canvas = displayCanvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_WIDTH / rect.width;
  const scaleY = CANVAS_HEIGHT / rect.height;
  const canvasX = (event.clientX - rect.left) * scaleX;
  const canvasY = (event.clientY - rect.top) * scaleY;

  // Check which element was clicked
  // Update state accordingly
}, [/* deps */]);
```

### File Structure

```
react-app/src/
├── components/
│   └── inventory/
│       ├── InventoryView.tsx           # Main component
│       └── InventoryView.test.tsx      # Unit tests
├── models/
│   └── inventory/
│       ├── InventoryRenderer.ts         # Rendering logic
│       ├── InventoryViewState.ts        # State types
│       ├── ItemDetailsContent.ts        # Bottom panel content
│       └── HelpTextContent.ts           # Top panel content
└── utils/
    └── inventoryStorage.ts              # Persist view state
```

---

## Conclusion

The Inventory View feature provides a dedicated, full-screen interface for managing the party's shared inventory. By following the same layout and rendering patterns as CombatView, it maintains visual and architectural consistency with the rest of the game. The pagination system ensures scalability for large inventories, while the category filtering and sorting options provide flexible organization. Future enhancements will add item actions, crafting integration, and advanced filtering capabilities.
