# Inventory View Implementation Plan

**Date:** 2025-11-01
**Feature:** Inventory View with Pagination and Filtering
**Branch:** inventory-view
**Priority:** Medium
**Complexity:** Medium

---

## Overview

This plan details the implementation of the Inventory View feature. The Inventory View provides a full-screen interface for browsing and managing the party's shared inventory, following the same 5-panel layout as CombatView. It includes category filtering, sorting options, and smart pagination that appears only when needed.

The implementation will heavily reuse patterns from CombatView (double buffering, layout managers, event handling) while adding specialized inventory rendering logic.

## Reusable Components from Existing Codebase

### ✅ Already Implemented

1. **PartyInventory Singleton** ([PartyInventory.ts](react-app/src/utils/inventory/PartyInventory.ts))
   - All data operations: `filterItems()`, `sortItems()`, `getItemDetails()`
   - Category filtering: 'all', 'weapons', 'shields', 'armor', 'accessories', 'held', 'quest-items'
   - Sort modes: 'name-asc', 'name-desc', 'type', 'recently-added'
   - Gold tracking: `getGold()`, `addGold()`, `removeGold()`
   - Statistics: `getTotalItemCount()`, `getTotalUniqueItems()`
   - REUSE ALL METHODS - No inventory logic duplication

2. **CombatView Pattern** ([CombatView.tsx](react-app/src/components/combat/CombatView.tsx))
   - Canvas setup (384x216 resolution)
   - Double buffering (off-screen buffer canvas)
   - Animation loop with requestAnimationFrame
   - Mouse event handling with coordinate conversion
   - Sprite/font loading with SpriteAssetLoader and FontAtlasLoader
   - Window resize handling with UISettings
   - Use as EXACT TEMPLATE for InventoryView structure

3. **CombatLayoutManager** ([CombatLayoutManager.ts](react-app/src/models/combat/layouts/CombatLayoutManager.ts))
   - 5-panel layout: top panel, main panel, top info, combat log, bottom info
   - `getMapClipRegion()` - repurpose for inventory display area
   - `getTopInfoPanelRegion()`, `getBottomInfoPanelRegion()`
   - `renderLayout()` - render all panels
   - REUSE ENTIRELY - No layout changes needed

4. **InfoPanelManager** ([InfoPanelManager.ts](react-app/src/models/combat/managers/InfoPanelManager.ts))
   - Panel content abstraction with `PanelContent` interface
   - `handleClick()`, `handleHover()` delegation
   - `setContent()` for dynamic content switching
   - REUSE for top and bottom info panels

5. **CombatLogManager** ([CombatLogManager.ts](react-app/src/models/combat/CombatLogManager.ts))
   - Message display with scrolling
   - `addMessage()` with color support
   - `scrollUp()`, `scrollDown()` with arrow buttons
   - `update()` for scroll animations
   - REUSE for inventory action log

6. **Font System** ([FontAtlasRenderer.ts](react-app/src/utils/FontAtlasRenderer.ts))
   - `renderText()` for all text rendering
   - Font IDs: '7px-04b03' (UI), '15px-dungeonslant' (titles)
   - Pixel-perfect rendering
   - REUSE via FontAtlasLoader

7. **CombatConstants Pattern** ([CombatConstants.ts](react-app/src/models/combat/CombatConstants.ts))
   - Centralized dimensions: `CANVAS_WIDTH`, `CANVAS_HEIGHT`, `TILE_SIZE`
   - Font IDs: `FONTS.UI_FONT_ID`, `FONTS.TITLE_FONT_ID`
   - Colors and text strings
   - CREATE new INVENTORY_VIEW section

### 🆕 New Implementation Required

1. **InventoryRenderer Class**
   - Render category tabs (2 rows, 4 per row)
   - Render sort dropdown (collapsed and expanded states)
   - Render item list (one item per row with quantity)
   - Render pagination controls (only when needed)
   - Calculate bounds for click detection

2. **InventoryView Component**
   - Main React component with same structure as CombatView
   - Canvas setup, double buffering, animation loop
   - Event handlers for category/sort/item/pagination clicks
   - State management for filter, sort, page, selection

3. **Panel Content Classes**
   - `ItemDetailsContent` - bottom panel (selected item details)
   - `HelpTextContent` - top panel (contextual help)
   - `InventoryStatsContent` - top panel (items/unique/gold stats)

4. **Inventory State Management**
   - Track current category, sort mode, page number
   - Track hovered/selected item indices
   - Persist state to localStorage
   - Calculate pagination dynamically

5. **Integration Points**
   - Open from world view / pause menu (future)
   - Close with ESC key
   - Update when PartyInventory changes

## Requirements

### Visual Specifications

**Canvas Dimensions:**
- Width: 384px (`CombatConstants.CANVAS_WIDTH`)
- Height: 216px (`CombatConstants.CANVAS_HEIGHT`)
- Same as CombatView

**Colors (Hex Codes):**
- Category tabs unselected: `#888888` (grey)
- Category tabs hovered: `#ffff00` (yellow)
- Category tabs selected: `#ffffff` (white)
- Sort label: `#888888` (grey)
- Sort value: `#ffffff` (white)
- Sort dropdown hover: `#ffff00` (yellow)
- Item text normal: `#ffffff` (white)
- Item text quest: `#ffff00` (yellow)
- Item row hover: `rgba(255, 255, 0, 0.2)` (yellow tint)
- Item row selected: `rgba(255, 255, 255, 0.2)` (white tint)
- Pagination text: `#888888` (grey)
- Pagination arrows enabled: `#ffffff` (white)
- Pagination arrows disabled: `#444444` (dark grey)
- Pagination arrows hover: `#ffff00` (yellow)
- Gold text: `#ffff00` (yellow)
- Help text: `#888888` (grey)
- Background: `#000000` (black)

**Fonts:**
- UI elements: `7px-04b03`
- Stats (if using large font): `15px-dungeonslant`

**Spacing:**
- Category tab rows: 7px per row, 2px between rows
- Category tabs horizontal: 2px between tabs
- Sort dropdown: 7px height, 2px spacing
- Item rows: 8px per row (7px text + 1px spacing)
- Top padding (main panel): 4px
- Bottom padding (main panel): 2px
- Pagination: 7px height, 2px spacing from items

**Panel Regions (from CombatLayoutManager):**
- Main panel: Use `getMapClipRegion()` - left side of canvas
- Top info panel: Use `getTopInfoPanelRegion()` - top right
- Combat log: Use combat log region - middle right
- Bottom info panel: Use `getBottomInfoPanelRegion()` - bottom right
- Top panel: Full width, 18px height

### Behavioral Specifications

**Category Filtering:**
- Click category tab to filter
- Resets to page 0 when filter changes
- Categories: All, Weapons, Shields, Armor, Accessories, Held, Quest Items
- Maps to Equipment.type and typeTags

**Sort Modes:**
- Click "Sort: [Mode ▼]" to expand dropdown
- Click sort option to apply and collapse
- Resets to page 0 when sort changes
- Modes: Name ▲, Name ▼, Type, Recently Added

**Item Selection:**
- Click item row to select
- Selected item shows details in bottom info panel
- Hover shows yellow highlight and updates help text
- Quest items render in yellow color

**Pagination:**
- Only visible when `totalPages > 1`
- Calculate `itemsPerPage` from available panel height
- Arrow buttons: [<] previous, [>] next
- Arrows disabled at first/last page
- Shows "Page X / Y" text

**Inventory Updates:**
- When PartyInventory changes, refresh filtered list
- Reset to page 0 if current page becomes empty
- Add message to combat log for user awareness

**Keyboard Shortcuts:**
- ESC: Close inventory view
- Arrow keys: Navigate items (future enhancement)
- Number keys: Category shortcuts (future enhancement)

### Technical Requirements

**Compliance with GeneralGuidelines.md:**
- ✅ Use SpriteRenderer exclusively (no direct ctx.drawImage on sprite sheets)
- ✅ Use FontAtlasRenderer exclusively (no ctx.fillText)
- ✅ Always disable image smoothing: `ctx.imageSmoothingEnabled = false`
- ✅ Round all coordinates with `Math.floor()` for pixel-perfect rendering
- ✅ Cache managers (layoutManager, combatLogManager, infoPanelManagers)
- ✅ Use off-screen buffer canvas (double buffering like CombatView)
- ✅ Return new state objects (immutability): `setViewState({ ...prev, currentPage: 0 })`
- ✅ Never mutate state directly
- ✅ Use React refs for canvas and buffer
- ✅ Update state only, let animation loop handle rendering
- ✅ Cache renderer instance to avoid GC pressure

**Performance:**
- 60 FPS animation loop (for combat log scrolling)
- Render on demand for static content
- No re-filtering on every frame (use useMemo)
- Pagination calculation cached in useMemo
- Item bounds calculated once per render
- Text truncation cached or calculated efficiently

**State Persistence:**
- Save view state to localStorage on close
- Restore on open: category, sort, page
- Key: `vibedc-inventory-view-state`
- Clear on inventory size change (optional)

## Implementation Tasks

### Phase 1: Inventory Constants (Foundation)

**Files:**
- `react-app/src/models/combat/CombatConstants.ts`

**Changes:**
```typescript
// Add new section
INVENTORY_VIEW: {
  // Category tabs
  CATEGORY_TAB_HEIGHT: 7,
  CATEGORY_TAB_SPACING: 2,
  CATEGORY_TABS_PER_ROW: 4,

  // Sort dropdown
  SORT_DROPDOWN_HEIGHT: 7,
  SORT_DROPDOWN_SPACING: 2,

  // Item list
  ITEM_ROW_HEIGHT: 8,
  ITEM_ROW_SPACING: 1,
  ITEM_TEXT_HEIGHT: 7,

  // Pagination
  PAGINATION_HEIGHT: 7,
  PAGINATION_SPACING: 2,

  // Colors
  CATEGORY_UNSELECTED_COLOR: '#888888',
  CATEGORY_HOVERED_COLOR: '#ffff00',
  CATEGORY_SELECTED_COLOR: '#ffffff',
  ITEM_NORMAL_COLOR: '#ffffff',
  ITEM_QUEST_COLOR: '#ffff00',
  ITEM_HOVER_BACKGROUND: 'rgba(255, 255, 0, 0.2)',
  ITEM_SELECTED_BACKGROUND: 'rgba(255, 255, 255, 0.2)',
  PAGINATION_TEXT_COLOR: '#888888',
  PAGINATION_ARROW_ENABLED: '#ffffff',
  PAGINATION_ARROW_DISABLED: '#444444',
  PAGINATION_ARROW_HOVER: '#ffff00',
  GOLD_COLOR: '#ffff00',
  HELP_TEXT_COLOR: '#888888',

  // Text
  HELP_TEXT_DEFAULT: 'Click item to view details',
  HELP_TEXT_CATEGORY: 'Filter by category',
  HELP_TEXT_SORT: 'Change sort order',
  HELP_TEXT_EMPTY: 'No items in inventory',

  // Font
  UI_FONT_ID: '7px-04b03',
}
```

**Testing:**
- Verify constants are accessible
- Check no typos in constant names

---

### Phase 2: Inventory View State Types (Foundation)

**Files:**
- `react-app/src/models/inventory/InventoryViewState.ts` (NEW)

**Implementation:**
```typescript
import type { InventoryCategory, InventorySortMode } from '../../utils/inventory/PartyInventory';

/**
 * UI state for InventoryView (not inventory data itself)
 */
export interface InventoryViewState {
  // Filter and sort
  selectedCategory: InventoryCategory;
  sortMode: InventorySortMode;

  // Pagination
  currentPage: number;
  itemsPerPage: number; // Calculated dynamically

  // Selection
  selectedItemIndex: number | null; // Index in filtered+sorted list
  hoveredItemIndex: number | null;  // Index in filtered+sorted list

  // UI hover states
  hoveredCategoryIndex: number | null;
  hoveredSortIndex: number | null;
  sortDropdownOpen: boolean;
}

/**
 * Create default inventory view state
 */
export function createDefaultInventoryViewState(): InventoryViewState {
  return {
    selectedCategory: 'all',
    sortMode: 'name-asc',
    currentPage: 0,
    itemsPerPage: 0, // Will be calculated
    selectedItemIndex: null,
    hoveredItemIndex: null,
    hoveredCategoryIndex: null,
    hoveredSortIndex: null,
    sortDropdownOpen: false,
  };
}

/**
 * Serialize state to JSON for localStorage
 */
export function serializeInventoryViewState(state: InventoryViewState): string {
  return JSON.stringify({
    selectedCategory: state.selectedCategory,
    sortMode: state.sortMode,
    currentPage: state.currentPage,
  });
}

/**
 * Deserialize state from JSON
 */
export function deserializeInventoryViewState(json: string): Partial<InventoryViewState> {
  try {
    const parsed = JSON.parse(json);
    return {
      selectedCategory: parsed.selectedCategory || 'all',
      sortMode: parsed.sortMode || 'name-asc',
      currentPage: parsed.currentPage || 0,
    };
  } catch (error) {
    console.warn('[InventoryViewState] Failed to deserialize:', error);
    return {};
  }
}
```

**Testing:**
- Verify type definitions compile
- Test serialization round-trip
- Test deserialization with invalid JSON

---

### Phase 3: Inventory Renderer Class (Core Rendering)

**Files:**
- `react-app/src/models/inventory/InventoryRenderer.ts` (NEW)

**Implementation:**
```typescript
import { FontAtlasRenderer } from '../../utils/FontAtlasRenderer';
import { CombatConstants } from '../combat/CombatConstants';
import type { InventoryCategory, InventorySortMode, InventoryItem } from '../../utils/inventory/PartyInventory';

/**
 * Renders inventory UI elements (category tabs, sort dropdown, item list, pagination)
 */
export class InventoryRenderer {
  private readonly tileSize: number;
  private readonly constants = CombatConstants.INVENTORY_VIEW;

  constructor(tileSize: number) {
    this.tileSize = tileSize;
  }

  /**
   * Render category tabs (2 rows, up to 4 per row)
   */
  renderCategoryTabs(
    ctx: CanvasRenderingContext2D,
    categories: Array<{ id: InventoryCategory; label: string }>,
    selectedCategory: InventoryCategory,
    hoveredIndex: number | null,
    fontAtlas: HTMLImageElement,
    x: number,
    y: number,
    maxWidth: number
  ): void {
    let currentX = x;
    let currentY = y;
    let itemsInRow = 0;

    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      const isSelected = category.id === selectedCategory;
      const isHovered = hoveredIndex === i;

      // Determine color
      let color = this.constants.CATEGORY_UNSELECTED_COLOR;
      if (isSelected) color = this.constants.CATEGORY_SELECTED_COLOR;
      else if (isHovered) color = this.constants.CATEGORY_HOVERED_COLOR;

      // Render text
      FontAtlasRenderer.renderText(
        ctx,
        category.label,
        currentX,
        currentY,
        this.constants.UI_FONT_ID,
        fontAtlas,
        1,
        'left',
        color
      );

      // Calculate text width for next position
      const textWidth = FontAtlasRenderer.measureText(category.label, this.constants.UI_FONT_ID, fontAtlas, 1);
      currentX += textWidth + this.constants.CATEGORY_TAB_SPACING + 4; // Extra spacing between tabs
      itemsInRow++;

      // Wrap to next row after 4 items
      if (itemsInRow >= this.constants.CATEGORY_TABS_PER_ROW) {
        currentX = x;
        currentY += this.constants.CATEGORY_TAB_HEIGHT + this.constants.CATEGORY_TAB_SPACING;
        itemsInRow = 0;
      }
    }
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
    // Render "Sort: "
    FontAtlasRenderer.renderText(
      ctx,
      'Sort:',
      x,
      y,
      this.constants.UI_FONT_ID,
      fontAtlas,
      1,
      'left',
      this.constants.CATEGORY_UNSELECTED_COLOR
    );

    const labelWidth = FontAtlasRenderer.measureText('Sort: ', this.constants.UI_FONT_ID, fontAtlas, 1);

    // Render current mode with dropdown arrow
    const modeLabel = this.getSortModeLabel(sortMode);
    const modeColor = hoveredIndex === -1 ? this.constants.PAGINATION_ARROW_HOVER : '#ffffff';
    FontAtlasRenderer.renderText(
      ctx,
      `[${modeLabel} ▼]`,
      x + labelWidth,
      y,
      this.constants.UI_FONT_ID,
      fontAtlas,
      1,
      'left',
      modeColor
    );

    // If open, render dropdown options below
    if (isOpen) {
      const modes: Array<{ mode: InventorySortMode; label: string }> = [
        { mode: 'name-asc', label: 'Name ▲' },
        { mode: 'name-desc', label: 'Name ▼' },
        { mode: 'type', label: 'Type' },
        { mode: 'recently-added', label: 'Recent' },
      ];

      let optionY = y + this.constants.SORT_DROPDOWN_HEIGHT + this.constants.SORT_DROPDOWN_SPACING;

      for (let i = 0; i < modes.length; i++) {
        const option = modes[i];
        const isHovered = hoveredIndex === i;
        const color = isHovered ? this.constants.PAGINATION_ARROW_HOVER : '#ffffff';

        FontAtlasRenderer.renderText(
          ctx,
          `  ${option.label}`,
          x + labelWidth,
          optionY,
          this.constants.UI_FONT_ID,
          fontAtlas,
          1,
          'left',
          color
        );

        optionY += this.constants.SORT_DROPDOWN_HEIGHT + 1;
      }
    }
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
    x: number,
    y: number,
    width: number,
    maxRows: number
  ): void {
    const visibleItems = items.slice(0, maxRows);

    for (let i = 0; i < visibleItems.length; i++) {
      const item = visibleItems[i];
      const rowY = y + i * this.constants.ITEM_ROW_HEIGHT;

      // Render background highlight
      if (i === selectedIndex) {
        ctx.fillStyle = this.constants.ITEM_SELECTED_BACKGROUND;
        ctx.fillRect(x, rowY, width, this.constants.ITEM_TEXT_HEIGHT);
      } else if (i === hoveredIndex) {
        ctx.fillStyle = this.constants.ITEM_HOVER_BACKGROUND;
        ctx.fillRect(x, rowY, width, this.constants.ITEM_TEXT_HEIGHT);
      }

      // Determine text color (quest items in yellow)
      const isQuestItem = item.equipment.typeTags?.includes('quest-item');
      const textColor = isQuestItem ? this.constants.ITEM_QUEST_COLOR : this.constants.ITEM_NORMAL_COLOR;

      // Format text: "Item Name (x5)"
      const quantityText = ` (x${item.quantity})`;
      const fullText = item.equipment.name + quantityText;

      // Truncate if needed
      const maxTextWidth = width - 4; // 2px padding each side
      const truncatedText = this.truncateText(fullText, maxTextWidth, fontAtlas);

      // Render text
      FontAtlasRenderer.renderText(
        ctx,
        truncatedText,
        x + 2,
        rowY,
        this.constants.UI_FONT_ID,
        fontAtlas,
        1,
        'left',
        textColor
      );
    }
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
    y: number,
    width: number
  ): void {
    // Render "Page X / Y" centered
    const pageText = `Page ${currentPage + 1} / ${totalPages}`;
    const textWidth = FontAtlasRenderer.measureText(pageText, this.constants.UI_FONT_ID, fontAtlas, 1);
    const centerX = x + Math.floor((width - textWidth) / 2);

    FontAtlasRenderer.renderText(
      ctx,
      pageText,
      centerX,
      y,
      this.constants.UI_FONT_ID,
      fontAtlas,
      1,
      'left',
      this.constants.PAGINATION_TEXT_COLOR
    );

    // Render left arrow [<]
    const leftArrowX = centerX - 16;
    const leftEnabled = currentPage > 0;
    const leftColor = !leftEnabled
      ? this.constants.PAGINATION_ARROW_DISABLED
      : hoveredArrow === 'left'
      ? this.constants.PAGINATION_ARROW_HOVER
      : this.constants.PAGINATION_ARROW_ENABLED;

    FontAtlasRenderer.renderText(
      ctx,
      '[<]',
      leftArrowX,
      y,
      this.constants.UI_FONT_ID,
      fontAtlas,
      1,
      'left',
      leftColor
    );

    // Render right arrow [>]
    const rightArrowX = centerX + textWidth + 4;
    const rightEnabled = currentPage < totalPages - 1;
    const rightColor = !rightEnabled
      ? this.constants.PAGINATION_ARROW_DISABLED
      : hoveredArrow === 'right'
      ? this.constants.PAGINATION_ARROW_HOVER
      : this.constants.PAGINATION_ARROW_ENABLED;

    FontAtlasRenderer.renderText(
      ctx,
      '[>]',
      rightArrowX,
      y,
      this.constants.UI_FONT_ID,
      fontAtlas,
      1,
      'left',
      rightColor
    );
  }

  /**
   * Calculate category tab bounds for click detection
   */
  getCategoryTabBounds(
    categories: Array<{ id: InventoryCategory; label: string }>,
    x: number,
    y: number,
    fontAtlas: HTMLImageElement
  ): Array<{ x: number; y: number; width: number; height: number }> {
    const bounds: Array<{ x: number; y: number; width: number; height: number }> = [];
    let currentX = x;
    let currentY = y;
    let itemsInRow = 0;

    for (const category of categories) {
      const textWidth = FontAtlasRenderer.measureText(category.label, this.constants.UI_FONT_ID, fontAtlas, 1);

      bounds.push({
        x: currentX,
        y: currentY,
        width: textWidth,
        height: this.constants.CATEGORY_TAB_HEIGHT,
      });

      currentX += textWidth + this.constants.CATEGORY_TAB_SPACING + 4;
      itemsInRow++;

      if (itemsInRow >= this.constants.CATEGORY_TABS_PER_ROW) {
        currentX = x;
        currentY += this.constants.CATEGORY_TAB_HEIGHT + this.constants.CATEGORY_TAB_SPACING;
        itemsInRow = 0;
      }
    }

    return bounds;
  }

  /**
   * Calculate item row bounds for click detection
   */
  getItemBounds(
    itemCount: number,
    x: number,
    y: number,
    width: number
  ): Array<{ x: number; y: number; width: number; height: number }> {
    const bounds: Array<{ x: number; y: number; width: number; height: number }> = [];

    for (let i = 0; i < itemCount; i++) {
      bounds.push({
        x,
        y: y + i * this.constants.ITEM_ROW_HEIGHT,
        width,
        height: this.constants.ITEM_TEXT_HEIGHT,
      });
    }

    return bounds;
  }

  /**
   * Calculate pagination arrow bounds for click detection
   */
  getPaginationBounds(
    currentPage: number,
    totalPages: number,
    x: number,
    y: number,
    width: number,
    fontAtlas: HTMLImageElement
  ): { left: { x: number; y: number; width: number; height: number } | null; right: { x: number; y: number; width: number; height: number } | null } {
    const pageText = `Page ${currentPage + 1} / ${totalPages}`;
    const textWidth = FontAtlasRenderer.measureText(pageText, this.constants.UI_FONT_ID, fontAtlas, 1);
    const centerX = x + Math.floor((width - textWidth) / 2);

    const leftArrowX = centerX - 16;
    const leftArrowWidth = FontAtlasRenderer.measureText('[<]', this.constants.UI_FONT_ID, fontAtlas, 1);

    const rightArrowX = centerX + textWidth + 4;
    const rightArrowWidth = FontAtlasRenderer.measureText('[>]', this.constants.UI_FONT_ID, fontAtlas, 1);

    return {
      left: currentPage > 0 ? {
        x: leftArrowX,
        y,
        width: leftArrowWidth,
        height: this.constants.PAGINATION_HEIGHT,
      } : null,
      right: currentPage < totalPages - 1 ? {
        x: rightArrowX,
        y,
        width: rightArrowWidth,
        height: this.constants.PAGINATION_HEIGHT,
      } : null,
    };
  }

  // Helper methods

  private getSortModeLabel(mode: InventorySortMode): string {
    switch (mode) {
      case 'name-asc': return 'Name ▲';
      case 'name-desc': return 'Name ▼';
      case 'type': return 'Type';
      case 'recently-added': return 'Recent';
    }
  }

  private truncateText(text: string, maxWidth: number, fontAtlas: HTMLImageElement): string {
    const textWidth = FontAtlasRenderer.measureText(text, this.constants.UI_FONT_ID, fontAtlas, 1);

    if (textWidth <= maxWidth) {
      return text;
    }

    // Binary search for max length
    let left = 0;
    let right = text.length;
    let bestFit = '';

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const truncated = text.substring(0, mid) + '...';
      const width = FontAtlasRenderer.measureText(truncated, this.constants.UI_FONT_ID, fontAtlas, 1);

      if (width <= maxWidth) {
        bestFit = truncated;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return bestFit || '...';
  }
}
```

**Testing:**
- Verify category tabs render correctly
- Test sort dropdown open/close rendering
- Test item list with various quantities
- Test pagination rendering
- Test bounds calculation accuracy
- Test text truncation logic

---

### Phase 4: Panel Content Classes (Info Panels)

**Files:**
- `react-app/src/models/inventory/ItemDetailsContent.ts` (NEW)
- `react-app/src/models/inventory/HelpTextContent.ts` (NEW)

**Implementation (ItemDetailsContent.ts):**
```typescript
import type { PanelContent, PanelRegion, PanelClickResult } from '../combat/managers/panels/PanelContent';
import { FontAtlasRenderer } from '../../utils/FontAtlasRenderer';
import type { InventoryItem } from '../../utils/inventory/PartyInventory';

/**
 * Panel content showing selected item details
 */
export class ItemDetailsContent implements PanelContent {
  constructor(private item: InventoryItem | null) {}

  render(ctx: CanvasRenderingContext2D, region: PanelRegion, fontAtlas: HTMLImageElement): void {
    if (!this.item) {
      // Render "No item selected"
      FontAtlasRenderer.renderText(
        ctx,
        'No item selected',
        region.x + 4,
        region.y + 4,
        '7px-04b03',
        fontAtlas,
        1,
        'left',
        '#888888'
      );
      return;
    }

    const { equipment, quantity } = this.item;
    let y = region.y + 4;

    // Render item name
    const isQuestItem = equipment.typeTags?.includes('quest-item');
    const nameColor = isQuestItem ? '#ffff00' : '#ffffff';
    FontAtlasRenderer.renderText(
      ctx,
      equipment.name,
      region.x + 4,
      y,
      '7px-04b03',
      fontAtlas,
      1,
      'left',
      nameColor
    );
    y += 8;

    // Render equipment type
    const typeLabel = this.formatEquipmentType(equipment.type);
    FontAtlasRenderer.renderText(
      ctx,
      typeLabel,
      region.x + 4,
      y,
      '7px-04b03',
      fontAtlas,
      1,
      'left',
      '#888888'
    );
    y += 8;

    // Render quantity
    FontAtlasRenderer.renderText(
      ctx,
      `Quantity: ${quantity}`,
      region.x + 4,
      y,
      '7px-04b03',
      fontAtlas,
      1,
      'left',
      '#ffffff'
    );
    y += 10;

    // Render modifiers
    const modifiers = this.formatModifiers(equipment);
    if (modifiers.length > 0) {
      FontAtlasRenderer.renderText(
        ctx,
        'Modifiers:',
        region.x + 4,
        y,
        '7px-04b03',
        fontAtlas,
        1,
        'left',
        '#888888'
      );
      y += 8;

      for (const mod of modifiers) {
        FontAtlasRenderer.renderText(
          ctx,
          mod,
          region.x + 6,
          y,
          '7px-04b03',
          fontAtlas,
          1,
          'left',
          '#00ff00'
        );
        y += 8;
      }
      y += 2;
    }

    // Render range (for weapons)
    if (equipment.minRange !== undefined && equipment.maxRange !== undefined) {
      FontAtlasRenderer.renderText(
        ctx,
        `Range: ${equipment.minRange}-${equipment.maxRange}`,
        region.x + 4,
        y,
        '7px-04b03',
        fontAtlas,
        1,
        'left',
        '#ffffff'
      );
      y += 8;
    }

    // Render tags
    if (equipment.typeTags && equipment.typeTags.length > 0) {
      const tagsText = `Tags: ${equipment.typeTags.join(', ')}`;
      FontAtlasRenderer.renderText(
        ctx,
        tagsText,
        region.x + 4,
        y,
        '7px-04b03',
        fontAtlas,
        1,
        'left',
        '#888888'
      );
    }
  }

  handleClick(x: number, y: number, region: PanelRegion): PanelClickResult | null {
    // Future: Handle [Equip] [Drop] [Use] buttons
    return null;
  }

  handleHover(x: number, y: number, region: PanelRegion): boolean {
    // Future: Highlight buttons on hover
    return false;
  }

  updateItem(item: InventoryItem | null): void {
    this.item = item;
  }

  private formatEquipmentType(type: string): string {
    // Convert "OneHandedWeapon" to "One-Handed Weapon"
    return type.replace(/([A-Z])/g, ' $1').trim().replace(/\s+/g, '-');
  }

  private formatModifiers(equipment: any): string[] {
    const modifiers: string[] = [];
    const stats = equipment.modifiers;

    if (!stats) return modifiers;

    // Check each stat
    if (stats.physicalPower) modifiers.push(`+${stats.physicalPower} Physical Power`);
    if (stats.magicPower) modifiers.push(`+${stats.magicPower} Magic Power`);
    if (stats.health) modifiers.push(`+${stats.health} Health`);
    if (stats.mana) modifiers.push(`+${stats.mana} Mana`);
    if (stats.speed) modifiers.push(`+${stats.speed} Speed`);
    if (stats.movement) modifiers.push(`+${stats.movement} Movement`);
    if (stats.physicalEvade) modifiers.push(`+${stats.physicalEvade} Physical Evade`);
    if (stats.magicEvade) modifiers.push(`+${stats.magicEvade} Magic Evade`);
    if (stats.courage) modifiers.push(`+${stats.courage} Courage`);
    if (stats.attunement) modifiers.push(`+${stats.attunement} Attunement`);

    return modifiers;
  }
}
```

**Implementation (HelpTextContent.ts):**
```typescript
import type { PanelContent, PanelRegion, PanelClickResult } from '../combat/managers/panels/PanelContent';
import { FontAtlasRenderer } from '../../utils/FontAtlasRenderer';

/**
 * Panel content showing help text
 */
export class HelpTextContent implements PanelContent {
  constructor(private message: string) {}

  render(ctx: CanvasRenderingContext2D, region: PanelRegion, fontAtlas: HTMLImageElement): void {
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

  handleClick(): null {
    return null;
  }

  handleHover(): boolean {
    return false;
  }

  updateMessage(message: string): void {
    this.message = message;
  }
}
```

**Testing:**
- Verify item details render correctly
- Test with quest items (yellow color)
- Test with items that have modifiers
- Test with weapons (show range)
- Test help text rendering

---

### Phase 5: InventoryView Component (Main Component)

**Files:**
- `react-app/src/components/inventory/InventoryView.tsx` (NEW)

**Implementation:** (See next comment for full component - too large for single block)

**Structure:**
- Same canvas setup as CombatView (384x216)
- Same double buffering pattern
- Same animation loop with requestAnimationFrame
- Same event handlers (click, mousemove, mouseleave)
- Reuse CombatLayoutManager for panel regions
- Reuse CombatLogManager for log messages
- Reuse InfoPanelManager for info panels
- Calculate filtered/sorted items with useMemo
- Calculate pagination with useMemo
- Persist state to localStorage on close

**Testing:**
- Verify canvas renders at correct size
- Test double buffering works
- Test animation loop runs at 60 FPS
- Test all event handlers work
- Test state persistence to localStorage

---

### Phase 6: Integration with Game Flow

**Files:**
- `react-app/src/App.tsx` (or wherever view routing happens)

**Changes:**
- Add route/state for inventory view
- Add keyboard shortcut to open (e.g., 'I' key)
- Add close handler to return to previous view
- Add ESC key handler to close

**Testing:**
- Verify inventory opens from world view
- Verify ESC closes inventory
- Verify returns to correct previous view
- Verify state persists across open/close

---

## Testing Strategy

### Unit Tests
- InventoryRenderer: category tabs, sort dropdown, item list, pagination rendering
- ItemDetailsContent: item details formatting, modifier display
- HelpTextContent: message rendering
- State serialization: round-trip persistence

### Integration Tests
- InventoryView: full rendering pipeline
- Event handling: click category, click sort, click item, click pagination
- Pagination: calculate items per page, navigate pages
- Filtering: change category, items update, reset to page 0
- Sorting: change sort mode, items reorder, reset to page 0

### Visual Tests
- Verify all colors match specification
- Verify fonts render pixel-perfect
- Verify spacing matches design
- Verify text truncation works correctly
- Verify pagination appears only when needed
- Verify quest items render in yellow

### Performance Tests
- 60 FPS with 100+ items in inventory
- No frame drops when changing filter/sort
- Pagination calculation < 1ms
- Item rendering < 5ms per frame

## Success Criteria

This feature is complete when:

1. ✅ InventoryView component renders with 5-panel layout
2. ✅ Main panel shows category tabs (2 rows, clickable)
3. ✅ Main panel shows sort dropdown (expandable, clickable)
4. ✅ Main panel shows item list (filtered, sorted, paginated)
5. ✅ Pagination controls visible only when needed
6. ✅ Pagination arrows work (previous/next page)
7. ✅ Item selection works (click to select)
8. ✅ Selected item details show in bottom panel
9. ✅ Help text shows in top info panel
10. ✅ Combat log shows inventory actions
11. ✅ Top panel shows inventory stats (items, unique, gold)
12. ✅ State persists to localStorage
13. ✅ Opens from world view (future)
14. ✅ Closes with ESC key
15. ✅ All colors and spacing match specification
16. ✅ All fonts render correctly
17. ✅ Performance meets standards (60 FPS)
18. ✅ All tests pass

---

## Implementation Notes

### Reuse CombatView Patterns

**Canvas Setup (Exact Copy):**
```typescript
const CANVAS_WIDTH = CombatConstants.CANVAS_WIDTH; // 384
const CANVAS_HEIGHT = CombatConstants.CANVAS_HEIGHT; // 216

const displayCanvasRef = useRef<HTMLCanvasElement>(null);
const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null);
```

**Double Buffering (Exact Copy):**
```typescript
const renderFrame = useCallback(() => {
  const displayCanvas = displayCanvasRef.current;
  if (!displayCanvas || !spritesLoaded) return;

  if (!bufferCanvasRef.current) {
    bufferCanvasRef.current = document.createElement('canvas');
  }
  const bufferCanvas = bufferCanvasRef.current;

  bufferCanvas.width = CANVAS_WIDTH;
  bufferCanvas.height = CANVAS_HEIGHT;
  displayCanvas.width = CANVAS_WIDTH;
  displayCanvas.height = CANVAS_HEIGHT;

  const ctx = bufferCanvas.getContext('2d');
  if (!ctx) return;

  ctx.imageSmoothingEnabled = false;

  // Render everything to buffer
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // ... render inventory content ...

  // Copy buffer to display
  const displayCtx = displayCanvas.getContext('2d');
  if (displayCtx) {
    displayCtx.imageSmoothingEnabled = false;
    displayCtx.drawImage(bufferCanvas, 0, 0);
  }
}, [/* deps */]);
```

**Animation Loop (Exact Copy):**
```typescript
useEffect(() => {
  if (!spritesLoaded) return;

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
}, [spritesLoaded, renderFrame, combatLogManager]);
```

### Calculate Items Per Page

```typescript
function calculateItemsPerPage(panelHeight: number): number {
  // Reserve space for UI elements
  const categoryTabsHeight = 14; // 2 rows * 7px
  const sortDropdownHeight = 9;  // 7px + 2px spacing
  const topPadding = 4;
  const bottomPadding = 2;

  const reservedHeight = categoryTabsHeight + sortDropdownHeight + topPadding + bottomPadding;
  const availableHeight = panelHeight - reservedHeight;

  // Calculate max items (don't reserve pagination space yet)
  const itemRowHeight = 8;
  const maxItems = Math.floor(availableHeight / itemRowHeight);

  return maxItems;
}
```

### Smart Pagination Logic

```typescript
const { itemsPerPage, totalPages, currentPageItems, showPagination } = useMemo(() => {
  const panelRegion = layoutManager.getMapClipRegion();
  const panelHeight = (panelRegion.maxRow - panelRegion.minRow + 1) * TILE_SIZE;

  // Calculate items per page
  let itemsPerPage = calculateItemsPerPage(panelHeight);

  // Check if pagination is needed
  const needsPagination = filteredItems.length > itemsPerPage;

  // If pagination needed, recalculate with pagination space reserved
  if (needsPagination) {
    const paginationHeight = 9; // 7px + 2px spacing
    const adjustedHeight = panelHeight - paginationHeight;
    itemsPerPage = calculateItemsPerPage(adjustedHeight - paginationHeight);
  }

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const start = viewState.currentPage * itemsPerPage;
  const currentPageItems = filteredItems.slice(start, start + itemsPerPage);

  return {
    itemsPerPage,
    totalPages,
    currentPageItems,
    showPagination: needsPagination,
  };
}, [filteredItems, viewState.currentPage, layoutManager]);
```

---

## Risk Mitigation

**Risk: Pagination calculation incorrect**
- Mitigation: Extensive testing with various inventory sizes
- Test cases: 0 items, 1 item, exactly 1 page, multiple pages

**Risk: Text truncation too slow**
- Mitigation: Binary search algorithm for O(log n) complexity
- Cache truncation results if needed

**Risk: Memory leak from animation loop**
- Mitigation: Proper cleanup in useEffect return
- Cancel animation frame on unmount

**Risk: State not persisting**
- Mitigation: Test localStorage save/load
- Handle JSON parse errors gracefully

---

## Timeline Estimate

**Total: 8-12 hours**

- Phase 1: Constants (30 minutes)
- Phase 2: State types (30 minutes)
- Phase 3: InventoryRenderer (3-4 hours)
- Phase 4: Panel content classes (1-2 hours)
- Phase 5: InventoryView component (3-4 hours)
- Phase 6: Integration (1 hour)
- Testing and polish (1-2 hours)

---

## Conclusion

The InventoryView implementation heavily leverages existing patterns from CombatView and PartyInventory, minimizing new code and maximizing consistency. The smart pagination system ensures scalability, while the category filtering and sorting provide flexible organization. All rendering follows GeneralGuidelines.md for pixel-perfect, performant display.
